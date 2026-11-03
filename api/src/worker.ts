// Kotha API + static host. One Cloudflare Worker: /api/* is handled here, everything else is served from ASSETS.
// Storage: Cloudflare D1 (SQLite). No third-party services, no keys.
import { SCHEMA } from './schema.ts';
import { hashPassword, verifyPassword, randomToken, sha256hex } from './crypto.ts';
import {
  parseNpr, ktmTodayIso, adIsoToBs, bsYmOf, validBsYm, bsMonthRange, addBsMonths, bsYmLabel, amountInWords,
  UNIT_KINDS, LOCALITIES, SUITED, MAINT_CATEGORIES, MAINT_STATUS, PAY_METHODS, KIND_LABEL, type UnitKind,
} from '../../shared/rent.ts';

export interface Env { DB: D1Database; ASSETS?: { fetch: (r: Request) => Promise<Response> }; SETUP_KEY_SHA256?: string }
type Role = 'tenant' | 'landlord' | 'admin';
interface User { id: number; email: string; name: string; phone: string | null; role: Role; disabled: number; is_demo: number; plan: string; created_at: number }
interface Ctx { req: Request; env: Env; url: URL; user: User | null; ip: string; body: any; query: URLSearchParams }

export const SETUP_KEY_SHA256 = 'fcb7c4fc5b53c3eee80edee0bac7c61b15b4cf9f47a7fd7b47dc61dbb32476ae';
export const SESSION_COOKIE = 'kotha_sid';
const SESSION_DAYS = 14;
export const FREE_UNIT_LIMIT = 5;
export const DEMO_LANDLORD = 'demo-landlord@kotha.demo';
export const DEMO_TENANT = 'demo-tenant@kotha.demo';
const DEMO_RESET_HOURS = 3;

class HttpError extends Error {
  status: number; code: string; detail?: any;
  constructor(status: number, code: string, detail?: any) { super(code); this.status = status; this.code = code; this.detail = detail; }
}
const err = (status: number, code: string, detail?: any) => new HttpError(status, code, detail);
const bad = (field: string) => err(422, 'invalid', { field });

// ------------------------------------------------------------------ validation
export function clean(v: unknown, max: number, { required = true, min = 1 } = {}): string | null {
  if (v === undefined || v === null || v === '') return required ? null : '';
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim();
  if (!required && s.length === 0) return '';
  if (s.length < min || s.length > max) return null;
  return s;
}
const req = (v: unknown, max: number, field: string, min = 1) => { const s = clean(v, max, { min }); if (s === null) throw bad(field); return s; };
const opt = (v: unknown, max: number, field: string) => { const s = clean(v, max, { required: false }); if (s === null) throw bad(field); return s; };
export function validEmail(v: unknown): string | null {
  const s = clean(v, 160); if (!s) return null; const e = s.toLowerCase();
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(e) ? e : null;
}
export function validPhone(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  let d = v.replace(/[\s\-()]/g, '');
  if (d.startsWith('+977')) d = d.slice(4); else if (d.startsWith('977') && d.length === 13) d = d.slice(3);
  if (/^9[678]\d{8}$/.test(d)) return d;
  if (/^0\d{7,9}$/.test(d)) return d;
  return null;
}
export function validPassword(v: unknown): string | null {
  if (typeof v !== 'string' || v.length < 8 || v.length > 200) return null;
  if (!/[a-zA-Z]/.test(v) || !/\d/.test(v)) return null;
  return v;
}
export function validDate(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return adIsoToBs(v) ? v : null;
}
export const int = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const oneOf = <T extends string>(v: unknown, list: readonly T[], field: string, fallback?: T): T => {
  if ((v === undefined || v === null || v === '') && fallback !== undefined) return fallback;
  if (typeof v === 'string' && (list as readonly string[]).includes(v)) return v as T; throw bad(field);
};
const money = (v: unknown, field: string, { min = 0 } = {}) => { const p = parseNpr(v); if (p === null || p < min) throw bad(field); return p; };
const idOf = (s: string) => { const n = Number(s); if (!Number.isInteger(n) || n < 1) throw err(404, 'not_found'); return n; };
const bool = (v: unknown) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

// ------------------------------------------------------------------ http helpers
const SEC_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store',
};
function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SEC_HEADERS, ...extra } });
}
function readCookie(r: Request, name: string): string | null {
  const c = r.headers.get('Cookie') || ''; const m = c.split(/;\s*/).find((x) => x.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
function cookie(token: string, maxAge: number): string { return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`; }
const now = () => Date.now();

let schemaReady = false;
async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  const v = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='meta'").first().catch(() => null);
  if (!v) { for (const s of SCHEMA) await db.prepare(s).run(); }
  else { const ok = await db.prepare("SELECT v FROM meta WHERE k='schema'").first<any>(); if (!ok || ok.v !== '1') for (const s of SCHEMA) await db.prepare(s).run(); }
  await db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('schema', '1')").run();
  if (!(await db.prepare('SELECT id FROM users WHERE email = ?1').bind(DEMO_LANDLORD).first())) await seedDemo(db);
  schemaReady = true;
}
export function resetSchemaFlag() { schemaReady = false; }

export async function rateLimit(db: D1Database, bucket: string, limit: number, windowSec: number): Promise<void> {
  const t = now();
  const row = await db.prepare('SELECT count, reset_at FROM rate_limits WHERE bucket = ?1').bind(bucket).first<any>();
  if (!row || row.reset_at <= t) {
    await db.prepare('INSERT OR REPLACE INTO rate_limits (bucket, count, reset_at) VALUES (?1, 1, ?2)').bind(bucket, t + windowSec * 1000).run(); return;
  }
  if (row.count >= limit) throw err(429, 'rate_limited', { retry_after: Math.ceil((row.reset_at - t) / 1000) });
  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE bucket = ?1').bind(bucket).run();
}
async function audit(db: D1Database, actor: User | null, action: string, target = '', detail = '') {
  await db.prepare('INSERT INTO audit_log (actor_id, actor_email, action, target, detail, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(actor?.id ?? null, actor?.email ?? null, action, target, detail.slice(0, 400), now()).run();
}
async function loadUser(ctx: Ctx): Promise<User | null> {
  const tok = readCookie(ctx.req, SESSION_COOKIE); if (!tok || tok.length > 100) return null;
  const sid = await sha256hex(tok);
  const u = await ctx.env.DB.prepare(`SELECT u.id, u.email, u.name, u.phone, u.role, u.disabled, u.is_demo, u.plan, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ?1 AND s.expires_at > ?2`).bind(sid, now()).first<User>();
  return u && !u.disabled ? u : null;
}
function need(ctx: Ctx, ...roles: Role[]): User {
  if (!ctx.user) throw err(401, 'not_signed_in');
  if (roles.length && !roles.includes(ctx.user.role)) throw err(403, 'forbidden');
  return ctx.user;
}
async function startSession(db: D1Database, userId: number): Promise<string> {
  const token = randomToken(32);
  await db.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)').bind(await sha256hex(token), userId, now() + SESSION_DAYS * 86400000, now()).run();
  await db.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(now()).run();
  return token;
}
const publicUser = (u: any) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, plan: u.plan, is_demo: u.is_demo });

type Handler = (ctx: Ctx, params: string[]) => Promise<Response>;
const routes: [string, RegExp, Handler][] = [];
const on = (m: string, p: string, h: Handler) => routes.push([m, new RegExp('^' + p.replace(/:(\w+)/g, '([^/]+)') + '$'), h]);

// ------------------------------------------------------------------ setup + auth
on('POST', '/api/setup', async (ctx) => {
  await rateLimit(ctx.env.DB, 'setup:' + ctx.ip, 5, 3600);
  const key = typeof ctx.body.key === 'string' ? ctx.body.key : '';
  if (!key || (await sha256hex(key)) !== (ctx.env.SETUP_KEY_SHA256 || SETUP_KEY_SHA256)) throw err(403, 'forbidden');
  const email = validEmail(ctx.body.email); if (!email) throw bad('email');
  const pw = validPassword(ctx.body.password); if (!pw) throw bad('password');
  const name = req(ctx.body.name, 80, 'name');
  const ex = await ctx.env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first<any>();
  if (ex) await ctx.env.DB.prepare("UPDATE users SET role = 'admin', pw_hash = ?1, name = ?2, disabled = 0 WHERE id = ?3").bind(await hashPassword(pw), name, ex.id).run();
  else await ctx.env.DB.prepare("INSERT INTO users (email, name, pw_hash, role, created_at) VALUES (?1, ?2, ?3, 'admin', ?4)").bind(email, name, await hashPassword(pw), now()).run();
  await audit(ctx.env.DB, null, 'admin.setup', email);
  return json({ ok: true });
});
on('POST', '/api/auth/register', async (ctx) => {
  await rateLimit(ctx.env.DB, 'reg:' + ctx.ip, 10, 3600);
  if (ctx.body.website) throw err(422, 'invalid', { field: 'website' }); // honeypot
  const name = req(ctx.body.name, 80, 'name', 2);
  const email = validEmail(ctx.body.email); if (!email) throw bad('email');
  const pw = validPassword(ctx.body.password); if (!pw) throw bad('password');
  const role = oneOf(ctx.body.role, ['tenant', 'landlord'] as const, 'role');
  let phone: string | null = null; if (ctx.body.phone) { phone = validPhone(ctx.body.phone); if (!phone) throw bad('phone'); }
  if (email.endsWith('@kotha.demo')) throw bad('email');
  if (await ctx.env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first()) throw err(409, 'email_taken');
  const r = await ctx.env.DB.prepare('INSERT INTO users (email, name, phone, pw_hash, role, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING id')
    .bind(email, name, phone, await hashPassword(pw), role, now()).first<any>();
  const token = await startSession(ctx.env.DB, r.id);
  await audit(ctx.env.DB, { id: r.id, email } as User, 'user.register', 'user:' + r.id, role);
  return json({ user: { id: r.id, email, name, phone, role, plan: 'free', is_demo: 0 } }, 201, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86400) });
});
on('POST', '/api/auth/login', async (ctx) => {
  await rateLimit(ctx.env.DB, 'login:' + ctx.ip, 12, 900);
  const email = validEmail(ctx.body.email); const pw = typeof ctx.body.password === 'string' ? ctx.body.password : '';
  if (!email || !pw) throw err(401, 'bad_credentials');
  await rateLimit(ctx.env.DB, 'login-acct:' + email, 8, 900);
  const u = await ctx.env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first<any>();
  if (!u || !(await verifyPassword(pw, u.pw_hash))) throw err(401, 'bad_credentials');
  if (u.disabled) throw err(403, 'account_disabled');
  const token = await startSession(ctx.env.DB, u.id);
  return json({ user: publicUser(u) }, 200, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86400) });
});
on('POST', '/api/auth/demo', async (ctx) => {
  await rateLimit(ctx.env.DB, 'demo:' + ctx.ip, 20, 3600);
  const as = oneOf(ctx.body.as, ['landlord', 'tenant'] as const, 'as');
  const last = await ctx.env.DB.prepare("SELECT v FROM meta WHERE k = 'demo_reset_at'").first<any>();
  if (!last || now() - Number(last.v) > DEMO_RESET_HOURS * 3600000) await seedDemo(ctx.env.DB);
  const u = await ctx.env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(as === 'landlord' ? DEMO_LANDLORD : DEMO_TENANT).first<any>();
  if (!u || u.disabled) throw err(403, 'account_disabled');
  const token = await startSession(ctx.env.DB, u.id);
  return json({ user: publicUser(u) }, 200, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86400) });
});
on('POST', '/api/auth/logout', async (ctx) => {
  const tok = readCookie(ctx.req, SESSION_COOKIE);
  if (tok) await ctx.env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(await sha256hex(tok)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
});
on('GET', '/api/me', async (ctx) => {
  return json({ user: ctx.user ? publicUser(ctx.user) : null });
});
on('PUT', '/api/me', async (ctx) => {
  const u = need(ctx);
  const name = req(ctx.body.name, 80, 'name', 2);
  let phone: string | null = null; if (ctx.body.phone) { phone = validPhone(ctx.body.phone); if (!phone) throw bad('phone'); }
  await ctx.env.DB.prepare('UPDATE users SET name = ?1, phone = ?2 WHERE id = ?3').bind(name, phone, u.id).run();
  return json({ ok: true });
});
on('POST', '/api/me/password', async (ctx) => {
  const u = need(ctx);
  if (u.is_demo) throw err(403, 'demo_locked');
  await rateLimit(ctx.env.DB, 'pw:' + u.id, 6, 900);
  const row = await ctx.env.DB.prepare('SELECT pw_hash FROM users WHERE id = ?1').bind(u.id).first<any>();
  if (!(await verifyPassword(String(ctx.body.current || ''), row.pw_hash))) throw err(401, 'bad_credentials');
  const pw = validPassword(ctx.body.next); if (!pw) throw bad('password');
  const tok = readCookie(ctx.req, SESSION_COOKIE); const keep = tok ? await sha256hex(tok) : '';
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('UPDATE users SET pw_hash = ?1 WHERE id = ?2').bind(await hashPassword(pw), u.id),
    ctx.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND id != ?2').bind(u.id, keep),
  ]);
  await audit(ctx.env.DB, u, 'user.password_change', 'user:' + u.id);
  return json({ ok: true });
});

// ------------------------------------------------------------------ public listings
const LISTING_COLS = `u.id, u.label, u.kind, u.floor, u.area_sqft, u.rent, u.deposit, u.furnished, u.parking, u.water24, u.attached_bath, u.suited,
  u.available_from, u.description, u.updated_at, p.locality, p.name AS property_name, o.is_demo`;
export const SORTS: Record<string, string> = { new: 'u.updated_at DESC, u.id DESC', rent_asc: 'u.rent ASC, u.id DESC', rent_desc: 'u.rent DESC, u.id DESC' };
on('GET', '/api/listings', async (ctx) => {
  const q = ctx.query; const where = ['u.listed = 1', 'u.hidden = 0', 'o.disabled = 0', "NOT EXISTS (SELECT 1 FROM tenancies t WHERE t.unit_id = u.id AND t.status = 'active')"]; const args: any[] = [];
  const add = (sql: string, v: any) => { args.push(v); where.push(sql.replace('?', '?' + args.length)); };
  const text = clean(q.get('q') || '', 60, { required: false });
  if (text) { const like = '%' + text.replace(/[%_]/g, '') + '%'; args.push(like); const n = args.length; where.push(`(u.label LIKE ?${n} OR u.description LIKE ?${n} OR p.locality LIKE ?${n})`); }
  const loc = q.get('locality'); if (loc && (LOCALITIES as readonly string[]).includes(loc)) add('p.locality = ?', loc);
  const kind = q.get('kind'); if (kind && (UNIT_KINDS as readonly string[]).includes(kind)) add('u.kind = ?', kind);
  const min = parseNpr(q.get('min') || ''); if (min !== null && min > 0) add('u.rent >= ?', min);
  const max = parseNpr(q.get('max') || ''); if (max !== null && max > 0) add('u.rent <= ?', max);
  const furn = q.get('furnished'); if (furn && ['none', 'semi', 'full'].includes(furn)) add('u.furnished = ?', furn);
  const park = q.get('parking'); if (park === 'bike') where.push("u.parking IN ('bike','car')"); else if (park === 'car') where.push("u.parking = 'car'");
  if (q.get('water') === '1') where.push('u.water24 = 1');
  if (q.get('bath') === '1') where.push('u.attached_bath = 1');
  const suited = q.get('suited'); if (suited && (SUITED as readonly string[]).includes(suited)) add("u.suited IN ('anyone', ?)", suited);
  const sort = SORTS[q.get('sort') || 'new'] || SORTS.new;
  const page = int(q.get('page') || '1', 1, 100) || 1; const per = 12;
  const from = `FROM units u JOIN properties p ON p.id = u.property_id JOIN users o ON o.id = u.owner_id WHERE ${where.join(' AND ')}`;
  const total = (await ctx.env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...args).first<any>()).n;
  const items = (await ctx.env.DB.prepare(`SELECT ${LISTING_COLS} ${from} ORDER BY ${sort} LIMIT ${per} OFFSET ${(page - 1) * per}`).bind(...args).all()).results;
  const locs = (await ctx.env.DB.prepare(`SELECT p.locality, COUNT(*) AS n FROM units u JOIN properties p ON p.id = u.property_id JOIN users o ON o.id = u.owner_id
    WHERE u.listed = 1 AND u.hidden = 0 AND o.disabled = 0 AND NOT EXISTS (SELECT 1 FROM tenancies t WHERE t.unit_id = u.id AND t.status = 'active') GROUP BY p.locality ORDER BY n DESC, p.locality`).all()).results;
  return json({ items, total, page, pages: Math.max(1, Math.ceil(total / per)), localities: locs }, 200, { 'Cache-Control': 'no-cache' });
});
on('GET', '/api/listings/:id', async (ctx, [id]) => {
  const u = await ctx.env.DB.prepare(`SELECT ${LISTING_COLS}, o.name AS landlord_name, o.created_at AS landlord_since,
    (SELECT COUNT(*) FROM tenancies t WHERE t.unit_id = u.id AND t.status = 'active') AS occupied
    FROM units u JOIN properties p ON p.id = u.property_id JOIN users o ON o.id = u.owner_id WHERE u.id = ?1 AND u.listed = 1 AND u.hidden = 0 AND o.disabled = 0`).bind(idOf(id)).first<any>();
  if (!u || u.occupied) throw err(404, 'not_found');
  u.landlord_name = String(u.landlord_name).split(' ')[0];
  return json({ listing: u });
});
on('POST', '/api/listings/:id/inquiry', async (ctx, [id]) => {
  if (ctx.body.website) return json({ ok: true }, 201); // honeypot: pretend success, store nothing
  await rateLimit(ctx.env.DB, 'inq:' + ctx.ip, 6, 3600);
  const unit = await ctx.env.DB.prepare('SELECT u.id, u.owner_id FROM units u WHERE u.id = ?1 AND u.listed = 1 AND u.hidden = 0').bind(idOf(id)).first<any>();
  if (!unit) throw err(404, 'not_found');
  const name = req(ctx.body.name, 80, 'name', 2);
  const phone = validPhone(ctx.body.phone); if (!phone) throw bad('phone');
  const message = req(ctx.body.message, 800, 'message', 5);
  await ctx.env.DB.prepare('INSERT INTO inquiries (unit_id, owner_id, name, phone, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(unit.id, unit.owner_id, name, phone, message, now()).run();
  return json({ ok: true }, 201);
});
on('GET', '/api/receipts/:token', async (ctx, [token]) => {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw err(404, 'not_found');
  const r = await receiptBy(ctx.env.DB, 'p.token = ?1', token);
  if (!r) throw err(404, 'not_found');
  return json({ receipt: r });
});
async function receiptBy(db: D1Database, cond: string, v: any) {
  const r = await db.prepare(`SELECT p.id, p.amount, p.paid_on, p.bs_month, p.method, p.reference, p.receipt_no, p.token, p.voided, p.void_reason, p.created_at,
    tn.name AS tenant_name, tn.phone AS tenant_phone, un.label AS unit_label, un.kind AS unit_kind, pr.name AS property_name, pr.locality, pr.address,
    o.name AS landlord_name, o.phone AS landlord_phone, o.is_demo, ty.rent AS monthly_rent, ty.id AS tenancy_id
    FROM payments p JOIN tenancies ty ON ty.id = p.tenancy_id JOIN tenants tn ON tn.id = ty.tenant_id JOIN units un ON un.id = ty.unit_id
    JOIN properties pr ON pr.id = un.property_id JOIN users o ON o.id = p.owner_id WHERE ${cond}`).bind(v).first<any>();
  if (!r) return null;
  const bal = await tenancyBalance(db, r.tenancy_id, r.created_at);
  return { ...r, paid_on_bs: adIsoToBs(r.paid_on), month_label: bsYmLabel(r.bs_month), words: amountInWords(r.amount), balance_after: bal };
}
async function tenancyBalance(db: D1Database, tenancyId: number, asOf?: number): Promise<number> {
  const t = asOf ?? Number.MAX_SAFE_INTEGER;
  const c = await db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM charges WHERE tenancy_id = ?1 AND created_at <= ?2').bind(tenancyId, t).first<any>();
  const p = await db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE tenancy_id = ?1 AND voided = 0 AND created_at <= ?2').bind(tenancyId, t).first<any>();
  return c.s - p.s;
}

// ------------------------------------------------------------------ landlord
async function ownProperty(ctx: Ctx, uid: number, id: number) {
  const p = await ctx.env.DB.prepare('SELECT * FROM properties WHERE id = ?1 AND owner_id = ?2').bind(id, uid).first<any>(); if (!p) throw err(404, 'not_found'); return p;
}
async function ownUnit(ctx: Ctx, uid: number, id: number) {
  const u = await ctx.env.DB.prepare('SELECT * FROM units WHERE id = ?1 AND owner_id = ?2').bind(id, uid).first<any>(); if (!u) throw err(404, 'not_found'); return u;
}
async function ownTenant(ctx: Ctx, uid: number, id: number) {
  const t = await ctx.env.DB.prepare('SELECT * FROM tenants WHERE id = ?1 AND owner_id = ?2').bind(id, uid).first<any>(); if (!t) throw err(404, 'not_found'); return t;
}
async function ownTenancy(ctx: Ctx, uid: number, id: number) {
  const t = await ctx.env.DB.prepare('SELECT * FROM tenancies WHERE id = ?1 AND owner_id = ?2').bind(id, uid).first<any>(); if (!t) throw err(404, 'not_found'); return t;
}
const landlord = (ctx: Ctx) => need(ctx, 'landlord');

on('GET', '/api/l/overview', async (ctx) => {
  const u = landlord(ctx); const db = ctx.env.DB;
  const month = validBsYm(ctx.query.get('month') || '') || bsYmOf(ktmTodayIso())!;
  const c = await db.prepare(`SELECT (SELECT COUNT(*) FROM properties WHERE owner_id = ?1) AS properties, (SELECT COUNT(*) FROM units WHERE owner_id = ?1) AS units,
    (SELECT COUNT(DISTINCT unit_id) FROM tenancies WHERE owner_id = ?1 AND status = 'active') AS occupied,
    (SELECT COUNT(*) FROM units un WHERE un.owner_id = ?1 AND un.listed = 1 AND NOT EXISTS (SELECT 1 FROM tenancies t WHERE t.unit_id = un.id AND t.status='active')) AS listed,
    (SELECT COUNT(*) FROM maintenance WHERE owner_id = ?1 AND status IN ('open','in_progress')) AS open_requests,
    (SELECT COUNT(*) FROM inquiries WHERE owner_id = ?1 AND status = 'new') AS new_inquiries,
    (SELECT COALESCE(SUM(amount),0) FROM charges WHERE owner_id = ?1 AND bs_month = ?2) AS charged,
    (SELECT COALESCE(SUM(amount),0) FROM payments WHERE owner_id = ?1 AND bs_month = ?2 AND voided = 0) AS collected,
    (SELECT COALESCE(SUM(amount),0) FROM charges WHERE owner_id = ?1) - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE owner_id = ?1 AND voided = 0) AS outstanding,
    (SELECT COUNT(*) FROM tenancies ty WHERE ty.owner_id = ?1 AND ty.status = 'active' AND NOT EXISTS (SELECT 1 FROM charges ch WHERE ch.tenancy_id = ty.id AND ch.kind='rent' AND ch.bs_month = ?2)) AS not_charged`)
    .bind(u.id, month).first<any>();
  const dues = (await db.prepare(`SELECT ty.id AS tenancy_id, tn.name AS tenant_name, tn.phone, un.label AS unit_label, pr.name AS property_name,
    (SELECT COALESCE(SUM(amount),0) FROM charges WHERE tenancy_id = ty.id) - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE tenancy_id = ty.id AND voided = 0) AS balance
    FROM tenancies ty JOIN tenants tn ON tn.id = ty.tenant_id JOIN units un ON un.id = ty.unit_id JOIN properties pr ON pr.id = un.property_id
    WHERE ty.owner_id = ?1 AND ty.status = 'active' ORDER BY balance DESC LIMIT 6`).bind(u.id).all()).results.filter((r: any) => r.balance > 0);
  const recent = (await db.prepare(`SELECT p.id, p.amount, p.paid_on, p.receipt_no, p.token, tn.name AS tenant_name FROM payments p JOIN tenancies ty ON ty.id = p.tenancy_id
    JOIN tenants tn ON tn.id = ty.tenant_id WHERE p.owner_id = ?1 AND p.voided = 0 ORDER BY p.id DESC LIMIT 5`).bind(u.id).all()).results;
  const trend: any[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = addBsMonths(month, -i);
    const r = await db.prepare(`SELECT (SELECT COALESCE(SUM(amount),0) FROM charges WHERE owner_id = ?1 AND bs_month = ?2) AS charged,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE owner_id = ?1 AND bs_month = ?2 AND voided = 0) AS collected`).bind(u.id, m).first<any>();
    trend.push({ month: m, label: bsYmLabel(m).slice(0, 3), ...r });
  }
  return json({ month, month_label: bsYmLabel(month), counts: c, dues, recent, trend });
});

// properties
on('GET', '/api/l/properties', async (ctx) => {
  const u = landlord(ctx);
  return json({ items: (await ctx.env.DB.prepare(`SELECT p.*, (SELECT COUNT(*) FROM units WHERE property_id = p.id) AS units,
    (SELECT COUNT(DISTINCT t.unit_id) FROM tenancies t JOIN units x ON x.id = t.unit_id WHERE x.property_id = p.id AND t.status = 'active') AS occupied
    FROM properties p WHERE p.owner_id = ?1 ORDER BY p.id`).bind(u.id).all()).results });
});
function propertyInput(b: any) {
  return { name: req(b.name, 80, 'name', 2), locality: oneOf(b.locality, LOCALITIES, 'locality'), address: opt(b.address, 160, 'address'), notes: opt(b.notes, 600, 'notes') };
}
on('POST', '/api/l/properties', async (ctx) => {
  const u = landlord(ctx); const p = propertyInput(ctx.body);
  const n = (await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM properties WHERE owner_id = ?1').bind(u.id).first<any>()).n; if (n >= 50) throw err(409, 'too_many');
  const r = await ctx.env.DB.prepare('INSERT INTO properties (owner_id, name, locality, address, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING id')
    .bind(u.id, p.name, p.locality, p.address, p.notes, now()).first<any>();
  return json({ id: r.id }, 201);
});
on('PUT', '/api/l/properties/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const pid = idOf(id); await ownProperty(ctx, u.id, pid); const p = propertyInput(ctx.body);
  await ctx.env.DB.prepare('UPDATE properties SET name = ?1, locality = ?2, address = ?3, notes = ?4 WHERE id = ?5').bind(p.name, p.locality, p.address, p.notes, pid).run();
  return json({ ok: true });
});
on('DELETE', '/api/l/properties/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const pid = idOf(id); await ownProperty(ctx, u.id, pid);
  const busy = await ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM tenancies t JOIN units x ON x.id = t.unit_id WHERE x.property_id = ?1").bind(pid).first<any>();
  if (busy.n) throw err(409, 'has_tenancies');
  await ctx.env.DB.prepare('DELETE FROM properties WHERE id = ?1').bind(pid).run();
  return json({ ok: true });
});

// units
const UNIT_SELECT = `SELECT un.*, pr.name AS property_name, pr.locality,
  (SELECT ty.id FROM tenancies ty WHERE ty.unit_id = un.id AND ty.status = 'active' LIMIT 1) AS tenancy_id,
  (SELECT tn.name FROM tenancies ty JOIN tenants tn ON tn.id = ty.tenant_id WHERE ty.unit_id = un.id AND ty.status = 'active' LIMIT 1) AS tenant_name,
  (SELECT COUNT(*) FROM inquiries iq WHERE iq.unit_id = un.id AND iq.status = 'new') AS new_inquiries
  FROM units un JOIN properties pr ON pr.id = un.property_id`;
on('GET', '/api/l/units', async (ctx) => {
  const u = landlord(ctx); const pid = int(ctx.query.get('property_id') || '', 1, 1e12);
  const rows = (await ctx.env.DB.prepare(`${UNIT_SELECT} WHERE un.owner_id = ?1 ${pid ? 'AND un.property_id = ?2' : ''} ORDER BY pr.id, un.floor, un.label`).bind(...(pid ? [u.id, pid] : [u.id])).all()).results;
  return json({ items: rows });
});
function unitInput(b: any) {
  const area = b.area_sqft === '' || b.area_sqft === null || b.area_sqft === undefined ? null : int(b.area_sqft, 30, 20000);
  if (area === null && !(b.area_sqft === '' || b.area_sqft === null || b.area_sqft === undefined)) throw bad('area_sqft');
  const floor = int(b.floor ?? 0, -2, 30); if (floor === null) throw bad('floor');
  let avail: string | null = null; if (b.available_from) { avail = validDate(b.available_from); if (!avail) throw bad('available_from'); }
  return {
    label: req(b.label, 40, 'label'), kind: oneOf(b.kind, UNIT_KINDS, 'kind'), floor, area_sqft: area,
    rent: money(b.rent, 'rent', { min: 100 }), deposit: b.deposit === '' || b.deposit === undefined ? 0 : money(b.deposit, 'deposit'),
    furnished: oneOf(b.furnished, ['none', 'semi', 'full'] as const, 'furnished', 'none'), parking: oneOf(b.parking, ['none', 'bike', 'car'] as const, 'parking', 'none'),
    water24: bool(b.water24), attached_bath: bool(b.attached_bath), suited: oneOf(b.suited, SUITED, 'suited', 'anyone'), available_from: avail,
    description: opt(b.description, 1200, 'description'), listed: bool(b.listed),
  };
}
on('POST', '/api/l/units', async (ctx) => {
  const u = landlord(ctx); const pid = int(ctx.body.property_id, 1, 1e12); if (!pid) throw bad('property_id'); await ownProperty(ctx, u.id, pid);
  const x = unitInput(ctx.body);
  const n = (await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM units WHERE owner_id = ?1').bind(u.id).first<any>()).n;
  if (u.plan !== 'pro' && !u.is_demo && n >= FREE_UNIT_LIMIT) throw err(402, 'plan_limit', { limit: FREE_UNIT_LIMIT });
  if (n >= 500) throw err(409, 'too_many');
  const r = await ctx.env.DB.prepare(`INSERT INTO units (property_id, owner_id, label, kind, floor, area_sqft, rent, deposit, furnished, parking, water24, attached_bath, suited,
    available_from, description, listed, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?17) RETURNING id`)
    .bind(pid, u.id, x.label, x.kind, x.floor, x.area_sqft, x.rent, x.deposit, x.furnished, x.parking, x.water24, x.attached_bath, x.suited, x.available_from, x.description, x.listed, now()).first<any>();
  return json({ id: r.id }, 201);
});
on('PUT', '/api/l/units/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const uid = idOf(id); await ownUnit(ctx, u.id, uid); const x = unitInput(ctx.body);
  await ctx.env.DB.prepare(`UPDATE units SET label=?1, kind=?2, floor=?3, area_sqft=?4, rent=?5, deposit=?6, furnished=?7, parking=?8, water24=?9, attached_bath=?10,
    suited=?11, available_from=?12, description=?13, listed=?14, updated_at=?15 WHERE id = ?16`)
    .bind(x.label, x.kind, x.floor, x.area_sqft, x.rent, x.deposit, x.furnished, x.parking, x.water24, x.attached_bath, x.suited, x.available_from, x.description, x.listed, now(), uid).run();
  return json({ ok: true });
});
on('POST', '/api/l/units/:id/listed', async (ctx, [id]) => {
  const u = landlord(ctx); const uid = idOf(id); await ownUnit(ctx, u.id, uid);
  await ctx.env.DB.prepare('UPDATE units SET listed = ?1, updated_at = ?2 WHERE id = ?3').bind(bool(ctx.body.listed), now(), uid).run();
  return json({ ok: true });
});
on('DELETE', '/api/l/units/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const uid = idOf(id); await ownUnit(ctx, u.id, uid);
  const busy = await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM tenancies WHERE unit_id = ?1').bind(uid).first<any>(); if (busy.n) throw err(409, 'has_tenancies');
  await ctx.env.DB.prepare('DELETE FROM units WHERE id = ?1').bind(uid).run();
  return json({ ok: true });
});

// tenants
function inviteCode(): string { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = crypto.getRandomValues(new Uint8Array(8)); return Array.from(b, (x) => a[x % a.length]).join(''); }
on('GET', '/api/l/tenants', async (ctx) => {
  const u = landlord(ctx);
  return json({ items: (await ctx.env.DB.prepare(`SELECT tn.id, tn.name, tn.phone, tn.email, tn.notes, tn.invite_code, tn.user_id IS NOT NULL AS linked, tn.created_at,
    ty.id AS tenancy_id, ty.rent, ty.start_date, un.label AS unit_label, pr.name AS property_name,
    (SELECT COALESCE(SUM(c.amount),0) FROM charges c JOIN tenancies t2 ON t2.id = c.tenancy_id WHERE t2.tenant_id = tn.id) -
    (SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN tenancies t2 ON t2.id = p.tenancy_id WHERE t2.tenant_id = tn.id AND p.voided = 0) AS balance
    FROM tenants tn LEFT JOIN tenancies ty ON ty.tenant_id = tn.id AND ty.status = 'active' LEFT JOIN units un ON un.id = ty.unit_id LEFT JOIN properties pr ON pr.id = un.property_id
    WHERE tn.owner_id = ?1 ORDER BY ty.id IS NULL, tn.name`).bind(u.id).all()).results });
});
function tenantInput(b: any) {
  let phone: string | null = null; if (b.phone) { phone = validPhone(b.phone); if (!phone) throw bad('phone'); }
  let email: string | null = null; if (b.email) { email = validEmail(b.email); if (!email) throw bad('email'); }
  return { name: req(b.name, 80, 'name', 2), phone, email, notes: opt(b.notes, 600, 'notes') };
}
on('POST', '/api/l/tenants', async (ctx) => {
  const u = landlord(ctx); const t = tenantInput(ctx.body);
  const n = (await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM tenants WHERE owner_id = ?1').bind(u.id).first<any>()).n; if (n >= 1000) throw err(409, 'too_many');
  const r = await ctx.env.DB.prepare('INSERT INTO tenants (owner_id, name, phone, email, notes, invite_code, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7) RETURNING id, invite_code')
    .bind(u.id, t.name, t.phone, t.email, t.notes, inviteCode(), now()).first<any>();
  return json({ id: r.id, invite_code: r.invite_code }, 201);
});
on('GET', '/api/l/tenants/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const t = await ownTenant(ctx, u.id, idOf(id));
  const tenancies = (await ctx.env.DB.prepare(`SELECT ty.*, un.label AS unit_label, pr.name AS property_name FROM tenancies ty JOIN units un ON un.id = ty.unit_id
    JOIN properties pr ON pr.id = un.property_id WHERE ty.tenant_id = ?1 ORDER BY ty.id DESC`).bind(t.id).all()).results;
  return json({ tenant: { ...t, linked: t.user_id ? 1 : 0, user_id: undefined }, tenancies });
});
on('PUT', '/api/l/tenants/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const tid = idOf(id); await ownTenant(ctx, u.id, tid); const t = tenantInput(ctx.body);
  await ctx.env.DB.prepare('UPDATE tenants SET name=?1, phone=?2, email=?3, notes=?4 WHERE id = ?5').bind(t.name, t.phone, t.email, t.notes, tid).run();
  return json({ ok: true });
});
on('POST', '/api/l/tenants/:id/new-code', async (ctx, [id]) => {
  const u = landlord(ctx); const tid = idOf(id); await ownTenant(ctx, u.id, tid);
  const code = inviteCode();
  await ctx.env.DB.prepare('UPDATE tenants SET invite_code = ?1, user_id = NULL WHERE id = ?2').bind(code, tid).run();
  await audit(ctx.env.DB, u, 'tenant.code_reset', 'tenant:' + tid);
  return json({ invite_code: code });
});
on('DELETE', '/api/l/tenants/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const tid = idOf(id); await ownTenant(ctx, u.id, tid);
  const busy = await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM tenancies WHERE tenant_id = ?1').bind(tid).first<any>(); if (busy.n) throw err(409, 'has_tenancies');
  await ctx.env.DB.prepare('DELETE FROM tenants WHERE id = ?1').bind(tid).run();
  return json({ ok: true });
});

// tenancies (move-in / move-out)
on('POST', '/api/l/tenancies', async (ctx) => {
  const u = landlord(ctx); const b = ctx.body;
  const unitId = int(b.unit_id, 1, 1e12); if (!unitId) throw bad('unit_id'); const unit = await ownUnit(ctx, u.id, unitId);
  const tenantId = int(b.tenant_id, 1, 1e12); if (!tenantId) throw bad('tenant_id'); await ownTenant(ctx, u.id, tenantId);
  const start = validDate(b.start_date); if (!start) throw bad('start_date');
  const rent = b.rent === undefined || b.rent === '' ? unit.rent : money(b.rent, 'rent', { min: 100 });
  const deposit = b.deposit === undefined || b.deposit === '' ? unit.deposit : money(b.deposit, 'deposit');
  if (await ctx.env.DB.prepare("SELECT id FROM tenancies WHERE unit_id = ?1 AND status = 'active'").bind(unitId).first()) throw err(409, 'unit_occupied');
  if (await ctx.env.DB.prepare("SELECT id FROM tenancies WHERE tenant_id = ?1 AND status = 'active'").bind(tenantId).first()) throw err(409, 'tenant_has_home');
  const r = await ctx.env.DB.prepare(`INSERT INTO tenancies (owner_id, unit_id, tenant_id, start_date, rent, deposit, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7) RETURNING id`)
    .bind(u.id, unitId, tenantId, start, rent, deposit, now()).first<any>();
  await ctx.env.DB.prepare('UPDATE units SET listed = 0, updated_at = ?1 WHERE id = ?2').bind(now(), unitId).run();
  await audit(ctx.env.DB, u, 'tenancy.start', 'tenancy:' + r.id, `unit:${unitId} tenant:${tenantId}`);
  return json({ id: r.id }, 201);
});
on('POST', '/api/l/tenancies/:id/end', async (ctx, [id]) => {
  const u = landlord(ctx); const ty = await ownTenancy(ctx, u.id, idOf(id));
  if (ty.status !== 'active') throw err(409, 'already_ended');
  const end = validDate(ctx.body.end_date); if (!end || end < ty.start_date) throw bad('end_date');
  await ctx.env.DB.prepare("UPDATE tenancies SET status = 'ended', end_date = ?1 WHERE id = ?2").bind(end, ty.id).run();
  await audit(ctx.env.DB, u, 'tenancy.end', 'tenancy:' + ty.id, end);
  return json({ ok: true });
});

// rent ledger
export function tenancyCoversMonth(start: string, end: string | null, ym: string): boolean {
  const r = bsMonthRange(ym); if (!r) return false;
  return start <= r.end && (!end || end >= r.start);
}
on('GET', '/api/l/ledger', async (ctx) => {
  const u = landlord(ctx); const db = ctx.env.DB;
  const month = validBsYm(ctx.query.get('month') || '') || bsYmOf(ktmTodayIso())!;
  const ts = (await db.prepare(`SELECT ty.id, ty.rent, ty.start_date, ty.end_date, ty.status, tn.name AS tenant_name, tn.phone AS tenant_phone, un.label AS unit_label, pr.name AS property_name,
    (SELECT COALESCE(SUM(amount),0) FROM charges WHERE tenancy_id = ty.id AND bs_month = ?2) AS charged,
    (SELECT COUNT(*) FROM charges WHERE tenancy_id = ty.id AND bs_month = ?2 AND kind = 'rent') AS rent_charged,
    (SELECT COALESCE(SUM(amount),0) FROM payments WHERE tenancy_id = ty.id AND bs_month = ?2 AND voided = 0) AS paid,
    (SELECT COALESCE(SUM(amount),0) FROM charges WHERE tenancy_id = ty.id) - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE tenancy_id = ty.id AND voided = 0) AS balance
    FROM tenancies ty JOIN tenants tn ON tn.id = ty.tenant_id JOIN units un ON un.id = ty.unit_id JOIN properties pr ON pr.id = un.property_id
    WHERE ty.owner_id = ?1 ORDER BY pr.id, un.label`).bind(u.id, month).all()).results as any[];
  const rows = ts.filter((t) => tenancyCoversMonth(t.start_date, t.end_date, month) || t.charged || t.paid);
  const charges = (await db.prepare(`SELECT c.id, c.tenancy_id, c.kind, c.description, c.amount FROM charges c WHERE c.owner_id = ?1 AND c.bs_month = ?2 ORDER BY c.id`).bind(u.id, month).all()).results;
  const payments = (await db.prepare(`SELECT p.id, p.tenancy_id, p.amount, p.paid_on, p.method, p.reference, p.receipt_no, p.token, p.voided FROM payments p
    WHERE p.owner_id = ?1 AND p.bs_month = ?2 ORDER BY p.id`).bind(u.id, month).all()).results;
  return json({ month, month_label: bsYmLabel(month), prev: addBsMonths(month, -1), next: addBsMonths(month, 1), rows, charges, payments,
    pending: rows.filter((r) => r.status === 'active' && !r.rent_charged).length });
});
on('POST', '/api/l/ledger/generate', async (ctx) => {
  const u = landlord(ctx); const month = validBsYm(ctx.body.month); if (!month) throw bad('month');
  const ts = (await ctx.env.DB.prepare("SELECT id, rent, start_date, end_date FROM tenancies WHERE owner_id = ?1 AND status = 'active'").bind(u.id).all()).results as any[];
  let made = 0;
  for (const t of ts) {
    if (!tenancyCoversMonth(t.start_date, t.end_date, month)) continue;
    const r = await ctx.env.DB.prepare(`INSERT OR IGNORE INTO charges (owner_id, tenancy_id, bs_month, kind, description, amount, created_at) VALUES (?1,?2,?3,'rent',?4,?5,?6)`)
      .bind(u.id, t.id, month, 'Rent for ' + bsYmLabel(month), t.rent, now()).run();
    made += r.meta.changes || 0;
  }
  return json({ created: made });
});
on('POST', '/api/l/charges', async (ctx) => {
  const u = landlord(ctx); const b = ctx.body;
  const tid = int(b.tenancy_id, 1, 1e12); if (!tid) throw bad('tenancy_id'); await ownTenancy(ctx, u.id, tid);
  const month = validBsYm(b.month); if (!month) throw bad('month');
  const kind = oneOf(b.kind, ['electricity', 'water', 'internet', 'other'] as const, 'kind');
  const amount = money(b.amount, 'amount', { min: 100 });
  const description = req(b.description, 80, 'description', 2);
  const r = await ctx.env.DB.prepare('INSERT INTO charges (owner_id, tenancy_id, bs_month, kind, description, amount, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7) RETURNING id')
    .bind(u.id, tid, month, kind, description, amount, now()).first<any>();
  return json({ id: r.id }, 201);
});
on('DELETE', '/api/l/charges/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const r = await ctx.env.DB.prepare('DELETE FROM charges WHERE id = ?1 AND owner_id = ?2').bind(idOf(id), u.id).run();
  if (!r.meta.changes) throw err(404, 'not_found');
  await audit(ctx.env.DB, u, 'charge.delete', 'charge:' + id);
  return json({ ok: true });
});
on('POST', '/api/l/payments', async (ctx) => {
  const u = landlord(ctx); const b = ctx.body; const db = ctx.env.DB;
  const tid = int(b.tenancy_id, 1, 1e12); if (!tid) throw bad('tenancy_id'); await ownTenancy(ctx, u.id, tid);
  const amount = money(b.amount, 'amount', { min: 100 });
  const paid_on = validDate(b.paid_on); if (!paid_on || paid_on > ktmTodayIso()) throw bad('paid_on');
  const month = validBsYm(b.month) || bsYmOf(paid_on)!;
  const method = oneOf(b.method, PAY_METHODS, 'method');
  const reference = opt(b.reference, 60, 'reference');
  const seq = await db.prepare('UPDATE users SET receipt_seq = receipt_seq + 1 WHERE id = ?1 RETURNING receipt_seq').bind(u.id).first<any>();
  const receipt_no = `KT-${month.slice(0, 4)}-${String(seq.receipt_seq).padStart(4, '0')}`;
  const token = randomToken(18);
  const r = await db.prepare(`INSERT INTO payments (owner_id, tenancy_id, amount, paid_on, bs_month, method, reference, receipt_no, token, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10) RETURNING id`)
    .bind(u.id, tid, amount, paid_on, month, method, reference, receipt_no, token, now()).first<any>();
  await audit(db, u, 'payment.record', 'payment:' + r.id, `${receipt_no} ${amount}`);
  return json({ id: r.id, receipt_no, token }, 201);
});
on('GET', '/api/l/payments/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const r = await receiptBy(ctx.env.DB, `p.id = ?1 AND p.owner_id = ${u.id}`, idOf(id)); if (!r) throw err(404, 'not_found');
  return json({ receipt: r });
});
on('POST', '/api/l/payments/:id/void', async (ctx, [id]) => {
  const u = landlord(ctx); const reason = req(ctx.body.reason, 160, 'reason', 3);
  const r = await ctx.env.DB.prepare('UPDATE payments SET voided = 1, void_reason = ?1 WHERE id = ?2 AND owner_id = ?3 AND voided = 0').bind(reason, idOf(id), u.id).run();
  if (!r.meta.changes) throw err(404, 'not_found');
  await audit(ctx.env.DB, u, 'payment.void', 'payment:' + id, reason);
  return json({ ok: true });
});
on('GET', '/api/l/statement/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const ty = await ownTenancy(ctx, u.id, idOf(id));
  return json(await statement(ctx.env.DB, ty.id));
});
async function statement(db: D1Database, tenancyId: number) {
  const head = await db.prepare(`SELECT ty.id, ty.rent, ty.deposit, ty.start_date, ty.end_date, ty.status, tn.name AS tenant_name, un.label AS unit_label, un.kind AS unit_kind,
    pr.name AS property_name, pr.locality, o.name AS landlord_name, o.phone AS landlord_phone FROM tenancies ty JOIN tenants tn ON tn.id = ty.tenant_id
    JOIN units un ON un.id = ty.unit_id JOIN properties pr ON pr.id = un.property_id JOIN users o ON o.id = ty.owner_id WHERE ty.id = ?1`).bind(tenancyId).first<any>();
  const ch = (await db.prepare('SELECT id, bs_month, kind, description, amount, created_at FROM charges WHERE tenancy_id = ?1').bind(tenancyId).all()).results as any[];
  const pa = (await db.prepare('SELECT id, bs_month, amount, paid_on, method, receipt_no, token, voided, created_at FROM payments WHERE tenancy_id = ?1').bind(tenancyId).all()).results as any[];
  const lines = [
    ...ch.map((c) => ({ type: 'charge', id: c.id, month: c.bs_month, label: c.description, debit: c.amount, credit: 0, at: c.created_at })),
    ...pa.map((p) => ({ type: 'payment', id: p.id, month: p.bs_month, label: `Payment ${p.receipt_no} (${p.method})${p.voided ? ' · void' : ''}`, debit: 0, credit: p.voided ? 0 : p.amount, at: p.created_at, token: p.token, voided: p.voided, paid_on: p.paid_on })),
  ].sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.type === b.type ? a.at - b.at : a.type === 'charge' ? -1 : 1));
  let bal = 0; for (const l of lines as any[]) { bal += l.debit - l.credit; l.balance = bal; }
  return { tenancy: head, lines, balance: bal };
}

// maintenance (landlord side)
on('GET', '/api/l/maintenance', async (ctx) => {
  const u = landlord(ctx); const st = ctx.query.get('status');
  const filt = st && (MAINT_STATUS as readonly string[]).includes(st) ? 'AND m.status = ?2' : st === 'active' ? "AND m.status IN ('open','in_progress')" : '';
  const rows = (await ctx.env.DB.prepare(`SELECT m.*, un.label AS unit_label, pr.name AS property_name, tn.name AS tenant_name,
    (SELECT COUNT(*) FROM maintenance_events e WHERE e.request_id = m.id) AS events FROM maintenance m JOIN units un ON un.id = m.unit_id JOIN properties pr ON pr.id = un.property_id
    LEFT JOIN tenancies ty ON ty.id = m.tenancy_id LEFT JOIN tenants tn ON tn.id = ty.tenant_id WHERE m.owner_id = ?1 ${filt}
    ORDER BY CASE m.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, CASE m.priority WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, m.id DESC`)
    .bind(...(filt.includes('?2') ? [u.id, st] : [u.id])).all()).results;
  return json({ items: rows });
});
async function maintDetail(db: D1Database, id: number) {
  const m = await db.prepare(`SELECT m.*, un.label AS unit_label, pr.name AS property_name, tn.name AS tenant_name FROM maintenance m JOIN units un ON un.id = m.unit_id
    JOIN properties pr ON pr.id = un.property_id LEFT JOIN tenancies ty ON ty.id = m.tenancy_id LEFT JOIN tenants tn ON tn.id = ty.tenant_id WHERE m.id = ?1`).bind(id).first<any>();
  const events = (await db.prepare('SELECT actor_name, actor_role, status, note, created_at FROM maintenance_events WHERE request_id = ?1 ORDER BY id').bind(id).all()).results;
  return { request: m, events };
}
on('GET', '/api/l/maintenance/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const mid = idOf(id);
  if (!(await ctx.env.DB.prepare('SELECT id FROM maintenance WHERE id = ?1 AND owner_id = ?2').bind(mid, u.id).first())) throw err(404, 'not_found');
  return json(await maintDetail(ctx.env.DB, mid));
});
on('POST', '/api/l/maintenance/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const mid = idOf(id);
  const m = await ctx.env.DB.prepare('SELECT * FROM maintenance WHERE id = ?1 AND owner_id = ?2').bind(mid, u.id).first<any>(); if (!m) throw err(404, 'not_found');
  const status = ctx.body.status ? oneOf(ctx.body.status, MAINT_STATUS, 'status') : null;
  const note = opt(ctx.body.note, 600, 'note');
  if (!status && !note) throw bad('note');
  await ctx.env.DB.batch([
    ...(status ? [ctx.env.DB.prepare('UPDATE maintenance SET status = ?1, updated_at = ?2 WHERE id = ?3').bind(status, now(), mid)] : [ctx.env.DB.prepare('UPDATE maintenance SET updated_at = ?1 WHERE id = ?2').bind(now(), mid)]),
    ctx.env.DB.prepare('INSERT INTO maintenance_events (request_id, actor_name, actor_role, status, note, created_at) VALUES (?1,?2,?3,?4,?5,?6)').bind(mid, u.name, 'landlord', status && status !== m.status ? status : null, note, now()),
  ]);
  return json({ ok: true });
});

// inquiries
on('GET', '/api/l/inquiries', async (ctx) => {
  const u = landlord(ctx);
  return json({ items: (await ctx.env.DB.prepare(`SELECT iq.*, un.label AS unit_label, pr.name AS property_name FROM inquiries iq JOIN units un ON un.id = iq.unit_id
    JOIN properties pr ON pr.id = un.property_id WHERE iq.owner_id = ?1 ORDER BY iq.status = 'closed', iq.id DESC LIMIT 200`).bind(u.id).all()).results });
});
on('PUT', '/api/l/inquiries/:id', async (ctx, [id]) => {
  const u = landlord(ctx); const status = oneOf(ctx.body.status, ['new', 'replied', 'closed'] as const, 'status');
  const r = await ctx.env.DB.prepare('UPDATE inquiries SET status = ?1 WHERE id = ?2 AND owner_id = ?3').bind(status, idOf(id), u.id).run();
  if (!r.meta.changes) throw err(404, 'not_found'); return json({ ok: true });
});

// ------------------------------------------------------------------ tenant portal
const tenant = (ctx: Ctx) => need(ctx, 'tenant');
async function tenantTenancies(db: D1Database, userId: number) {
  return (await db.prepare(`SELECT ty.id, ty.rent, ty.deposit, ty.start_date, ty.end_date, ty.status, un.id AS unit_id, un.label AS unit_label, un.kind AS unit_kind,
    pr.name AS property_name, pr.locality, pr.address, o.name AS landlord_name, o.phone AS landlord_phone, o.is_demo
    FROM tenants tn JOIN tenancies ty ON ty.tenant_id = tn.id JOIN units un ON un.id = ty.unit_id JOIN properties pr ON pr.id = un.property_id JOIN users o ON o.id = ty.owner_id
    WHERE tn.user_id = ?1 ORDER BY ty.status = 'active' DESC, ty.id DESC`).bind(userId).all()).results as any[];
}
on('POST', '/api/t/link', async (ctx) => {
  const u = tenant(ctx);
  await rateLimit(ctx.env.DB, 'link:' + u.id, 10, 3600);
  const code = typeof ctx.body.code === 'string' ? ctx.body.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  if (code.length !== 8) throw bad('code');
  const t = await ctx.env.DB.prepare('SELECT id, user_id FROM tenants WHERE invite_code = ?1').bind(code).first<any>();
  if (!t) throw err(404, 'code_not_found');
  if (t.user_id && t.user_id !== u.id) throw err(409, 'code_used');
  await ctx.env.DB.prepare('UPDATE tenants SET user_id = ?1 WHERE id = ?2').bind(u.id, t.id).run();
  await audit(ctx.env.DB, u, 'tenant.link', 'tenant:' + t.id);
  return json({ ok: true });
});
on('GET', '/api/t/home', async (ctx) => {
  const u = tenant(ctx); const ts = await tenantTenancies(ctx.env.DB, u.id);
  const out = [];
  for (const t of ts) out.push({ ...t, ...(await statement(ctx.env.DB, t.id)), tenancy: undefined });
  return json({ homes: out });
});
on('GET', '/api/t/maintenance', async (ctx) => {
  const u = tenant(ctx); const ids = (await tenantTenancies(ctx.env.DB, u.id)).map((t) => t.id);
  if (!ids.length) return json({ items: [] });
  const rows = (await ctx.env.DB.prepare(`SELECT m.*, un.label AS unit_label, pr.name AS property_name FROM maintenance m JOIN units un ON un.id = m.unit_id
    JOIN properties pr ON pr.id = un.property_id WHERE m.tenancy_id IN (${ids.map(() => '?').join(',')}) ORDER BY m.status IN ('resolved','closed'), m.id DESC`).bind(...ids).all()).results;
  return json({ items: rows });
});
async function tenantOwnsRequest(ctx: Ctx, u: User, mid: number) {
  const ids = (await tenantTenancies(ctx.env.DB, u.id)).map((t) => t.id);
  const m = await ctx.env.DB.prepare('SELECT * FROM maintenance WHERE id = ?1').bind(mid).first<any>();
  if (!m || !ids.includes(m.tenancy_id)) throw err(404, 'not_found'); return m;
}
on('GET', '/api/t/maintenance/:id', async (ctx, [id]) => {
  const u = tenant(ctx); const mid = idOf(id); await tenantOwnsRequest(ctx, u, mid);
  return json(await maintDetail(ctx.env.DB, mid));
});
on('POST', '/api/t/maintenance', async (ctx) => {
  const u = tenant(ctx); const b = ctx.body;
  await rateLimit(ctx.env.DB, 'maint:' + u.id, 15, 3600);
  const tid = int(b.tenancy_id, 1, 1e12); if (!tid) throw bad('tenancy_id');
  const ty = (await tenantTenancies(ctx.env.DB, u.id)).find((t) => t.id === tid && t.status === 'active'); if (!ty) throw err(404, 'not_found');
  const title = req(b.title, 80, 'title', 3); const category = oneOf(b.category, MAINT_CATEGORIES, 'category');
  const priority = oneOf(b.priority, ['low', 'normal', 'urgent'] as const, 'priority', 'normal'); const description = req(b.description, 1500, 'description', 5);
  const owner = await ctx.env.DB.prepare('SELECT owner_id FROM tenancies WHERE id = ?1').bind(tid).first<any>();
  const r = await ctx.env.DB.prepare(`INSERT INTO maintenance (owner_id, unit_id, tenancy_id, created_by, title, category, priority, description, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?9) RETURNING id`).bind(owner.owner_id, ty.unit_id, tid, u.id, title, category, priority, description, now()).first<any>();
  await ctx.env.DB.prepare('INSERT INTO maintenance_events (request_id, actor_name, actor_role, status, note, created_at) VALUES (?1,?2,?3,?4,?5,?6)').bind(r.id, u.name, 'tenant', 'open', 'Request raised', now()).run();
  return json({ id: r.id }, 201);
});
on('POST', '/api/t/maintenance/:id/comment', async (ctx, [id]) => {
  const u = tenant(ctx); const mid = idOf(id); const m = await tenantOwnsRequest(ctx, u, mid);
  const note = opt(ctx.body.note, 600, 'note'); const close = bool(ctx.body.close);
  if (!note && !close) throw bad('note');
  if (close && m.status !== 'resolved') throw err(409, 'not_resolved');
  await ctx.env.DB.batch([
    ctx.env.DB.prepare('UPDATE maintenance SET updated_at = ?1' + (close ? ", status = 'closed'" : '') + ' WHERE id = ?2').bind(now(), mid),
    ctx.env.DB.prepare('INSERT INTO maintenance_events (request_id, actor_name, actor_role, status, note, created_at) VALUES (?1,?2,?3,?4,?5,?6)').bind(mid, u.name, 'tenant', close ? 'closed' : null, note, now()),
  ]);
  return json({ ok: true });
});
on('GET', '/api/t/receipts/:id', async (ctx, [id]) => {
  const u = tenant(ctx); const ids = (await tenantTenancies(ctx.env.DB, u.id)).map((t) => t.id);
  const r = await receiptBy(ctx.env.DB, 'p.id = ?1', idOf(id)); if (!r || !ids.includes(r.tenancy_id)) throw err(404, 'not_found');
  return json({ receipt: r });
});

// ------------------------------------------------------------------ admin
const admin = (ctx: Ctx) => need(ctx, 'admin');
on('GET', '/api/admin/overview', async (ctx) => {
  admin(ctx);
  const r = await ctx.env.DB.prepare(`SELECT (SELECT COUNT(*) FROM users WHERE role='landlord') AS landlords, (SELECT COUNT(*) FROM users WHERE role='tenant') AS tenants,
    (SELECT COUNT(*) FROM users WHERE is_demo = 1) AS demo_accounts, (SELECT COUNT(*) FROM users WHERE disabled = 1) AS disabled,
    (SELECT COUNT(*) FROM properties) AS properties, (SELECT COUNT(*) FROM units) AS units, (SELECT COUNT(*) FROM units WHERE listed = 1) AS listed,
    (SELECT COUNT(*) FROM units WHERE hidden = 1) AS hidden, (SELECT COUNT(*) FROM maintenance WHERE status IN ('open','in_progress')) AS open_requests,
    (SELECT COUNT(*) FROM payments WHERE voided = 0) AS payments, (SELECT COUNT(*) FROM inquiries) AS inquiries`).first();
  const last = await ctx.env.DB.prepare("SELECT v FROM meta WHERE k = 'demo_reset_at'").first<any>();
  return json({ counts: r, demo_reset_at: last ? Number(last.v) : null });
});
on('GET', '/api/admin/users', async (ctx) => {
  admin(ctx);
  return json({ items: (await ctx.env.DB.prepare(`SELECT u.id, u.email, u.name, u.role, u.plan, u.disabled, u.is_demo, u.created_at,
    (SELECT COUNT(*) FROM units WHERE owner_id = u.id) AS units FROM users u ORDER BY u.id DESC LIMIT 500`).all()).results });
});
on('PUT', '/api/admin/users/:id', async (ctx, [id]) => {
  const a = admin(ctx); const uid = idOf(id); if (uid === a.id) throw err(409, 'cannot_change_self');
  const t = await ctx.env.DB.prepare('SELECT id, role FROM users WHERE id = ?1').bind(uid).first<any>(); if (!t) throw err(404, 'not_found'); if (t.role === 'admin') throw err(403, 'forbidden');
  const stmts: D1PreparedStatement[] = []; const notes: string[] = [];
  if (ctx.body.disabled !== undefined) { const d = bool(ctx.body.disabled); stmts.push(ctx.env.DB.prepare('UPDATE users SET disabled = ?1 WHERE id = ?2').bind(d, uid)); if (d) stmts.push(ctx.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(uid)); notes.push('disabled=' + d); }
  if (ctx.body.plan !== undefined) { const p = oneOf(ctx.body.plan, ['free', 'pro'] as const, 'plan'); stmts.push(ctx.env.DB.prepare('UPDATE users SET plan = ?1 WHERE id = ?2').bind(p, uid)); notes.push('plan=' + p); }
  if (!stmts.length) throw bad('disabled');
  await ctx.env.DB.batch(stmts); await audit(ctx.env.DB, a, 'user.admin_update', 'user:' + uid, notes.join(' '));
  return json({ ok: true });
});
on('GET', '/api/admin/listings', async (ctx) => {
  admin(ctx);
  return json({ items: (await ctx.env.DB.prepare(`SELECT un.id, un.label, un.kind, un.rent, un.listed, un.hidden, un.updated_at, pr.locality, pr.name AS property_name, o.email AS owner_email, o.is_demo,
    (SELECT COUNT(*) FROM inquiries iq WHERE iq.unit_id = un.id) AS inquiries FROM units un JOIN properties pr ON pr.id = un.property_id JOIN users o ON o.id = un.owner_id
    WHERE un.listed = 1 OR un.hidden = 1 ORDER BY un.id DESC LIMIT 500`).all()).results });
});
on('PUT', '/api/admin/listings/:id', async (ctx, [id]) => {
  const a = admin(ctx); const h = bool(ctx.body.hidden);
  const r = await ctx.env.DB.prepare('UPDATE units SET hidden = ?1 WHERE id = ?2').bind(h, idOf(id)).run(); if (!r.meta.changes) throw err(404, 'not_found');
  await audit(ctx.env.DB, a, h ? 'listing.hide' : 'listing.unhide', 'unit:' + id, String(ctx.body.reason || '').slice(0, 160));
  return json({ ok: true });
});
on('GET', '/api/admin/audit', async (ctx) => {
  admin(ctx);
  return json({ items: (await ctx.env.DB.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all()).results });
});
on('POST', '/api/admin/demo-reset', async (ctx) => {
  const a = admin(ctx); await seedDemo(ctx.env.DB); await audit(ctx.env.DB, a, 'demo.reset');
  return json({ ok: true });
});

// ------------------------------------------------------------------ demo data (clearly labelled; reset every few hours)
export async function seedDemo(db: D1Database) {
  const pw = await hashPassword(randomToken(24)); // demo accounts are entered with the demo buttons only
  const t0 = now();
  const old = await db.prepare('SELECT id FROM users WHERE email = ?1').bind(DEMO_LANDLORD).first<any>();
  if (old) {
    await db.batch([
      db.prepare('DELETE FROM inquiries WHERE owner_id = ?1').bind(old.id), db.prepare('DELETE FROM maintenance WHERE owner_id = ?1').bind(old.id),
      db.prepare('DELETE FROM payments WHERE owner_id = ?1').bind(old.id), db.prepare('DELETE FROM charges WHERE owner_id = ?1').bind(old.id),
      db.prepare('DELETE FROM tenancies WHERE owner_id = ?1').bind(old.id), db.prepare('DELETE FROM tenants WHERE owner_id = ?1').bind(old.id),
      db.prepare('DELETE FROM units WHERE owner_id = ?1').bind(old.id), db.prepare('DELETE FROM properties WHERE owner_id = ?1').bind(old.id),
      db.prepare("UPDATE users SET name = 'Demo Landlord', phone = '9800000000', receipt_seq = 0, disabled = 0 WHERE id = ?1").bind(old.id),
    ]);
  } else {
    await db.prepare(`INSERT INTO users (email, name, phone, pw_hash, role, is_demo, plan, created_at) VALUES (?1, 'Demo Landlord', '9800000000', ?2, 'landlord', 1, 'pro', ?3)`).bind(DEMO_LANDLORD, pw, t0).run();
  }
  if (!(await db.prepare('SELECT id FROM users WHERE email = ?1').bind(DEMO_TENANT).first())) {
    await db.prepare(`INSERT INTO users (email, name, phone, pw_hash, role, is_demo, created_at) VALUES (?1, 'Demo Tenant', '9800000001', ?2, 'tenant', 1, ?3)`).bind(DEMO_TENANT, pw, t0).run();
  }
  const L = (await db.prepare('SELECT id FROM users WHERE email = ?1').bind(DEMO_LANDLORD).first<any>()).id;
  const TU = (await db.prepare('SELECT id FROM users WHERE email = ?1').bind(DEMO_TENANT).first<any>()).id;
  const props: [string, string, string][] = [['Demo House A', 'Kupondole', 'Demo address, Kupondole, Lalitpur'], ['Demo Flats B', 'Baneshwor', 'Demo address, New Baneshwor, Kathmandu'], ['Demo Rooms C', 'Kirtipur', 'Demo address, Naya Bazar, Kirtipur']];
  const pid: number[] = [];
  for (const [n, l, a] of props) pid.push((await db.prepare("INSERT INTO properties (owner_id, name, locality, address, notes, created_at) VALUES (?1,?2,?3,?4,'Sample property for the demo. Not a real address.',?5) RETURNING id").bind(L, n, l, a, t0).first<any>()).id);
  // [property index, label, kind, floor, area, rent Rs, deposit Rs, furnished, parking, water24, bath, suited, listed, description]
  const units: [number, string, UnitKind, number, number | null, number, number, string, string, number, number, string, number, string][] = [
    [0, 'Ground floor 2BHK', 'flat_2bhk', 0, 850, 28000, 56000, 'semi', 'car', 1, 1, 'family', 0, ''],
    [0, 'First floor 1BHK', 'flat_1bhk', 1, 520, 17000, 34000, 'none', 'bike', 1, 1, 'working', 1, 'Sample listing. Bright 1BHK with a balcony facing the courtyard, a separate kitchen and an attached bathroom. Tanker plus municipal water, bike parking in the gate.'],
    [0, 'Top floor room', 'room', 3, 160, 7500, 7500, 'none', 'none', 0, 0, 'students', 1, 'Sample listing. Single room on the top floor with shared bathroom and terrace access. Suits a student. Water on alternate days (municipal line).'],
    [1, 'Flat B-1 (3BHK)', 'flat_3bhk', 1, 1250, 42000, 84000, 'full', 'car', 1, 1, 'family', 1, 'Sample listing. Furnished 3BHK with a modular kitchen, two attached bathrooms, one car parking slot and 24-hour water from a deep boring plus tank.'],
    [1, 'Flat B-2 (2BHK)', 'flat_2bhk', 2, 780, 26000, 52000, 'semi', 'bike', 1, 1, 'anyone', 0, ''],
    [1, 'Flat B-3 (1BHK)', 'flat_1bhk', 3, 480, 16000, 32000, 'semi', 'bike', 1, 0, 'women', 1, 'Sample listing. 1BHK for a woman or two women sharing. Semi-furnished (bed, wardrobe, gas stove). The owner family lives on the ground floor.'],
    [1, 'Shutter 1 (street side)', 'shutter', 0, 220, 30000, 90000, 'none', 'none', 0, 0, 'anyone', 1, 'Sample listing. Street-facing shop shutter on a busy road, suitable for a pharmacy, mobile shop or stationery. Three months deposit.'],
    [2, 'Room C-1', 'room', 1, 150, 6000, 6000, 'none', 'none', 1, 0, 'students', 0, ''],
    [2, 'Room C-2 (with kitchen)', 'room', 1, 210, 8500, 8500, 'semi', 'bike', 1, 1, 'students', 1, 'Sample listing. Room with a small kitchen corner and attached bathroom, 10 minutes walk to TU gate. Bike parking.'],
    [2, 'Room C-3', 'room', 2, 140, 5500, 5500, 'none', 'none', 0, 0, 'working', 1, 'Sample listing. Simple room for one working person, shared bathroom on the same floor.'],
  ];
  const uid: number[] = [];
  const today = ktmTodayIso();
  for (const x of units) {
    uid.push((await db.prepare(`INSERT INTO units (property_id, owner_id, label, kind, floor, area_sqft, rent, deposit, furnished, parking, water24, attached_bath, suited, available_from,
      description, listed, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?17) RETURNING id`)
      .bind(pid[x[0]], L, x[1], x[2], x[3], x[4], x[5] * 100, x[6] * 100, x[7], x[8], x[9], x[10], x[11], x[12] ? today : null, x[13], x[12], t0 - uid.length * 3600000).first<any>()).id);
  }
  const tenants: [string, string, number | null][] = [['Demo Tenant (family)', '9800000001', TU], ['Sample Tenant B', '9800000002', null], ['Sample Tenant C', '9800000003', null]];
  const tid: number[] = [];
  for (const [n, ph, user] of tenants) tid.push((await db.prepare("INSERT INTO tenants (owner_id, name, phone, email, notes, user_id, invite_code, created_at) VALUES (?1,?2,?3,NULL,'Sample tenant for the demo.',?4,?5,?6) RETURNING id").bind(L, n, ph, user, inviteCode(), t0).first<any>()).id);
  const cur = bsYmOf(today)!; const m3 = addBsMonths(cur, -3);
  const start = bsMonthRange(m3)!.start;
  const ten: [number, number][] = [[uid[0], tid[0]], [uid[4], tid[1]], [uid[7], tid[2]]];
  const tyIds: number[] = [];
  for (const [u, t] of ten) {
    const rent = (await db.prepare('SELECT rent, deposit FROM units WHERE id = ?1').bind(u).first<any>());
    tyIds.push((await db.prepare("INSERT INTO tenancies (owner_id, unit_id, tenant_id, start_date, rent, deposit, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7) RETURNING id").bind(L, u, t, start, rent.rent, rent.deposit, t0).first<any>()).id);
  }
  let seq = 0; let tick = t0 - 100 * 86400000;
  const pay = async (ty: number, amount: number, ym: string, method: string) => {
    seq++; const r = bsMonthRange(ym)!; const paidOn = new Date(Date.parse(r.start) + 6 * 86400000).toISOString().slice(0, 10);
    await db.prepare(`INSERT INTO payments (owner_id, tenancy_id, amount, paid_on, bs_month, method, reference, receipt_no, token, created_at) VALUES (?1,?2,?3,?4,?5,?6,'',?7,?8,?9)`)
      .bind(L, ty, amount, paidOn > today ? today : paidOn, ym, method, `KT-${ym.slice(0, 4)}-${String(seq).padStart(4, '0')}`, randomToken(18), (tick += 3600000)).run();
  };
  for (let i = 3; i >= 0; i--) {
    const ym = addBsMonths(cur, -i);
    for (const [k, ty] of tyIds.entries()) {
      const rent = (await db.prepare('SELECT rent FROM tenancies WHERE id = ?1').bind(ty).first<any>()).rent;
      await db.prepare("INSERT INTO charges (owner_id, tenancy_id, bs_month, kind, description, amount, created_at) VALUES (?1,?2,?3,'rent',?4,?5,?6)").bind(L, ty, ym, 'Rent for ' + bsYmLabel(ym), rent, (tick += 3600000)).run();
      if (k === 0 && i > 0) await db.prepare("INSERT INTO charges (owner_id, tenancy_id, bs_month, kind, description, amount, created_at) VALUES (?1,?2,?3,'electricity',?4,?5,?6)").bind(L, ty, ym, 'Electricity (sub-meter)', 120000 + i * 15000, (tick += 3600000)).run();
      if (i > 0) { if (k === 2 && i === 1) await pay(ty, 300000, ym, 'cash'); else await pay(ty, rent + (k === 0 ? 120000 + i * 15000 : 0), ym, k === 1 ? 'esewa' : k === 0 ? 'bank' : 'cash'); }
      else if (k === 1) await pay(ty, rent, ym, 'esewa');
    }
  }
  await db.prepare('UPDATE users SET receipt_seq = ?1 WHERE id = ?2').bind(seq, L).run();
  const mt: [number, string, string, string, string, string][] = [
    [0, 'Kitchen tap leaking', 'plumbing', 'normal', 'The kitchen tap drips all night and the sink cabinet is getting wet.', 'in_progress'],
    [0, 'Water tank empty since morning', 'water', 'urgent', 'No water upstairs since 7 am. The motor runs but the tank stays empty.', 'resolved'],
    [2, 'Bulb holder sparking', 'electrical', 'urgent', 'The bulb holder near the door sparks when switched on.', 'open'],
  ];
  for (const [k, title, cat, pri, desc, st] of mt) {
    const r = await db.prepare(`INSERT INTO maintenance (owner_id, unit_id, tenancy_id, created_by, title, category, priority, description, status, created_at, updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10) RETURNING id`).bind(L, ten[k][0], tyIds[k], k === 0 ? TU : L, title, cat, pri, desc, st, (tick += 3600000)).first<any>();
    await db.prepare("INSERT INTO maintenance_events (request_id, actor_name, actor_role, status, note, created_at) VALUES (?1,?2,'tenant','open','Request raised',?3)").bind(r.id, k === 0 ? 'Demo Tenant' : 'Sample Tenant C', tick).run();
    if (st !== 'open') await db.prepare("INSERT INTO maintenance_events (request_id, actor_name, actor_role, status, note, created_at) VALUES (?1,'Demo Landlord','landlord','in_progress','Plumber booked for tomorrow morning.',?2)").bind(r.id, (tick += 3600000)).run();
    if (st === 'resolved') await db.prepare("INSERT INTO maintenance_events (request_id, actor_name, actor_role, status, note, created_at) VALUES (?1,'Demo Landlord','landlord','resolved','Float valve replaced. Please confirm water is fine.',?2)").bind(r.id, (tick += 3600000)).run();
  }
  await db.prepare("INSERT INTO inquiries (unit_id, owner_id, name, phone, message, status, created_at) VALUES (?1,?2,'Sample visitor','9800000009','Sample inquiry: is the room still available for a student from next month? Can I visit on Saturday?','new',?3)").bind(uid[2], L, t0).run();
  await db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('demo_reset_at', ?1)").bind(String(t0)).run();
}

// ------------------------------------------------------------------ dispatcher
export async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url); const method = req.method.toUpperCase();
  try {
    if (method === 'OPTIONS') return new Response(null, { status: 405, headers: SEC_HEADERS });
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = req.headers.get('Origin');
      if (origin && origin !== url.origin) throw err(403, 'bad_origin');
      const sfs = req.headers.get('Sec-Fetch-Site');
      if (sfs && !['same-origin', 'none'].includes(sfs)) throw err(403, 'bad_origin');
      if (method !== 'DELETE' || (req.headers.get('Content-Length') || '0') !== '0') {
        const ct = req.headers.get('Content-Type') || '';
        if (!ct.startsWith('application/json')) throw err(415, 'json_required');
      }
    }
    await ensureSchema(env.DB);
    let body: any = {};
    if (!['GET', 'HEAD'].includes(method)) {
      const text = await req.text();
      if (text.length > 20000) throw err(413, 'too_large');
      if (text) { try { body = JSON.parse(text); } catch { throw err(400, 'bad_json'); } }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw err(400, 'bad_json');
    }
    const ctx: Ctx = { req, env, url, user: null, ip: req.headers.get('CF-Connecting-IP') || 'local', body, query: url.searchParams };
    ctx.user = await loadUser(ctx);
    for (const [m, re, h] of routes) {
      if (m !== method && !(method === 'HEAD' && m === 'GET')) continue;
      const match = url.pathname.match(re);
      if (match) return await h(ctx, match.slice(1).map(decodeURIComponent));
    }
    throw err(404, 'not_found');
  } catch (e: any) {
    if (e instanceof HttpError) return json({ error: e.code, ...(e.detail || {}) }, e.status, e.status === 429 && e.detail?.retry_after ? { 'Retry-After': String(e.detail.retry_after) } : {});
    console.error('api_error', (e && e.stack) || e);
    return json({ error: 'server_error' }, 500);
  }
}

export const SPA_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-cache',
};
export const APP_ROUTES = /^\/(|rooms|rooms\/\d{1,12}|login|register|landlords|app(\/[a-z]+)?(\/[a-z0-9-]+)*|home(\/[a-z]+)?(\/\d+)?|admin(\/[a-z]+)?|terms|privacy|r\/[A-Za-z0-9_-]{20,64})$/;
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env);
    if (!env.ASSETS) return new Response('Not found', { status: 404 });
    if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return env.ASSETS.fetch(req);
    const res = await env.ASSETS.fetch(new Request(new URL('/app-shell.html', url).toString(), { method: 'GET' }));
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(SPA_HEADERS)) h.set(k, v);
    const known = APP_ROUTES.test(url.pathname.replace(/\/$/, '') || '/');
    return new Response(res.body, { status: known ? 200 : 404, headers: h });
  },
};
// keep KIND_LABEL referenced for receipts in future exports
export const _kinds = KIND_LABEL;
