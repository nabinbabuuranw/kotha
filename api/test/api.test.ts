import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleApi, validPhone, validDate, SESSION_COOKIE, APP_ROUTES, tenancyCoversMonth, DEMO_LANDLORD } from '../src/worker.ts';
import { fmtNpr, parseNpr, amountInWords, adIsoToBs, bsMonthRange, addBsMonths, validBsYm, bsYmOf, ktmTodayIso } from '../../shared/rent.ts';
import { D1Shim } from './d1shim.ts';

const ORIGIN = 'https://kotha.sites.tab.bot';
const SETUP_KEY = 'test-setup-key-' + Math.random().toString(36).slice(2);
let env: any; let ipc = 0;
async function call(method: string, path: string, o: { body?: any; cookie?: string; origin?: string | null; ip?: string; ct?: string } = {}) {
  const h: Record<string, string> = {};
  if (o.origin !== null && method !== 'GET') h.Origin = o.origin || ORIGIN;
  if (o.cookie) h.Cookie = `${SESSION_COOKIE}=${o.cookie}`;
  if (o.body !== undefined) h['Content-Type'] = o.ct || 'application/json';
  h['CF-Connecting-IP'] = o.ip || `10.1.0.${++ipc % 250}`;
  const res = await handleApi(new Request(ORIGIN + path, { method, headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined }), env);
  const text = await res.text();
  const m = new RegExp(SESSION_COOKIE + '=([^;]*)').exec(res.headers.get('set-cookie') || '');
  let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { j = text; }
  return { status: res.status, json: j, text, cookie: m ? m[1] : null, headers: res.headers };
}
const PW = 'Kathmandu123';
let landlord: string, landlord2: string, tenantS: string, adminS: string;
let propId: number, unitId: number, tenantId: number, inviteCode: string, tenancyId: number, payToken: string, payId: number, maintId: number;
const month = bsYmOf(ktmTodayIso())!;

test.before(async () => {
  const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SETUP_KEY))), (b) => b.toString(16).padStart(2, '0')).join('');
  env = { DB: new D1Shim(), SETUP_KEY_SHA256: h };
});

test('money + BS helpers', () => {
  assert.equal(fmtNpr(1234567800), '1,23,45,678'); assert.equal(fmtNpr(150050), '1,500.50');
  assert.equal(parseNpr('17,000'), 1700000); assert.equal(parseNpr('-1'), null); assert.equal(parseNpr('1.234'), null);
  assert.equal(amountInWords(2800000), 'Rupees Twenty-Eight Thousand Only');
  assert.equal(adIsoToBs('2026-11-03'), '2083-07-17');
  assert.deepEqual(bsMonthRange('2083-07'), { start: '2026-10-18', end: '2026-11-16' });
  assert.equal(addBsMonths('2083-12', 1), '2084-01'); assert.equal(addBsMonths('2083-01', -1), '2082-12');
  assert.equal(validBsYm('2083-13'), null); assert.equal(validBsYm('2083-07'), '2083-07');
  assert.equal(tenancyCoversMonth('2026-11-01', null, '2083-07'), true);
  assert.equal(tenancyCoversMonth('2026-11-20', null, '2083-07'), false);
  assert.equal(tenancyCoversMonth('2026-01-01', '2026-10-10', '2083-07'), false);
  assert.equal(validPhone('+977 9841234567'), '9841234567'); assert.equal(validPhone('12345'), null);
  assert.equal(validDate('2026-02-30'), null);
});

test('routes: SPA paths known, junk 404', () => {
  for (const p of ['/', '/rooms', '/rooms/12', '/login', '/app', '/app/ledger', '/home', '/home/requests', '/admin', '/admin/users', '/terms', '/r/abcdefghijklmnopqrstuvwx']) assert.ok(APP_ROUTES.test(p), p);
  for (const p of ['/wp-admin', '/rooms/abc', '/r/short']) assert.ok(!APP_ROUTES.test(p), p);
});

test('demo seed: public listings exist, are labelled demo, exclude occupied units', async () => {
  const r = await call('GET', '/api/listings');
  assert.equal(r.status, 200); assert.ok(r.json.total >= 6);
  assert.ok(r.json.items.every((x: any) => x.is_demo === 1));
  assert.ok(!r.json.items.some((x: any) => x.label === 'Ground floor 2BHK')); // occupied in the seed
  const f = await call('GET', '/api/listings?kind=room&max=8000&sort=rent_asc');
  assert.ok(f.json.items.length >= 1); assert.ok(f.json.items.every((x: any) => x.kind === 'room' && x.rent <= 800000));
  for (let i = 1; i < f.json.items.length; i++) assert.ok(f.json.items[i].rent >= f.json.items[i - 1].rent);
  const d = await call('GET', '/api/listings/' + r.json.items[0].id); assert.equal(d.status, 200); assert.ok(!('phone' in d.json.listing));
});

test('auth: register, validation, login, rate limit, csrf', async () => {
  let r = await call('POST', '/api/auth/register', { body: { name: 'L One', email: 'l1@example.com', password: PW, role: 'landlord' } });
  assert.equal(r.status, 201); landlord = r.cookie!;
  r = await call('POST', '/api/auth/register', { body: { name: 'L One', email: 'l1@example.com', password: PW, role: 'landlord' } }); assert.equal(r.status, 409);
  r = await call('POST', '/api/auth/register', { body: { name: 'X', email: 'bad', password: PW, role: 'landlord' } }); assert.equal(r.status, 422);
  r = await call('POST', '/api/auth/register', { body: { name: 'Admin wannabe', email: 'a@example.com', password: PW, role: 'admin' } }); assert.equal(r.json.field, 'role');
  r = await call('POST', '/api/auth/register', { body: { name: 'L Two', email: 'l2@example.com', password: PW, role: 'landlord' } }); landlord2 = r.cookie!;
  r = await call('POST', '/api/auth/register', { body: { name: 'T One', email: 't1@example.com', password: PW, role: 'tenant' } }); tenantS = r.cookie!;
  r = await call('POST', '/api/auth/login', { body: { email: 'l1@example.com', password: 'wrong123' } }); assert.equal(r.status, 401);
  r = await call('POST', '/api/auth/login', { body: { email: 'l1@example.com', password: PW } }); assert.equal(r.status, 200); assert.ok(r.cookie);
  r = await call('POST', '/api/l/properties', { cookie: landlord, origin: 'https://evil.example', body: { name: 'x', locality: 'Patan' } }); assert.equal(r.status, 403);
  r = await call('POST', '/api/l/properties', { cookie: landlord, ct: 'text/plain', body: { name: 'x', locality: 'Patan' } }); assert.equal(r.status, 415);
  let last = 0; for (let i = 0; i < 10; i++) last = (await call('POST', '/api/auth/login', { ip: '9.9.9.9', body: { email: 'nobody@example.com', password: 'x1234567' } })).status;
  assert.equal(last, 429);
});

test('setup creates admin only with the right key', async () => {
  let r = await call('POST', '/api/setup', { body: { key: 'nope', email: 'admin@example.com', password: PW, name: 'Admin' } }); assert.equal(r.status, 403);
  r = await call('POST', '/api/setup', { body: { key: SETUP_KEY, email: 'admin@example.com', password: PW, name: 'Admin' } }); assert.equal(r.status, 200);
  r = await call('POST', '/api/auth/login', { body: { email: 'admin@example.com', password: PW } }); adminS = r.cookie!; assert.equal(r.json.user.role, 'admin');
});

test('landlord: property, unit, listing visible, RBAC isolation', async () => {
  let r = await call('POST', '/api/l/properties', { cookie: landlord, body: { name: 'Shrestha Niwas', locality: 'Patan', address: 'Pulchowk' } }); assert.equal(r.status, 201); propId = r.json.id;
  r = await call('POST', '/api/l/units', { cookie: landlord, body: { property_id: propId, label: 'Room 2A', kind: 'room', floor: 2, rent: '8,000', deposit: '8000', water24: true, listed: true, description: 'Test room' } });
  assert.equal(r.status, 201); unitId = r.json.id;
  r = await call('GET', '/api/listings?locality=Patan'); assert.ok(r.json.items.some((x: any) => x.id === unitId && x.rent === 800000 && x.is_demo === 0));
  assert.equal((await call('GET', '/api/l/units', { cookie: landlord2 })).json.items.length, 0);
  assert.equal((await call('PUT', '/api/l/units/' + unitId, { cookie: landlord2, body: { label: 'hack', kind: 'room', rent: 1 } })).status, 404);
  assert.equal((await call('GET', '/api/l/overview', { cookie: tenantS })).status, 403);
  assert.equal((await call('GET', '/api/l/overview')).status, 401);
  r = await call('POST', '/api/l/units', { cookie: landlord, body: { property_id: propId, label: 'Bad', kind: 'castle', rent: 100 } }); assert.equal(r.json.field, 'kind');
  for (let i = 0; i < 4; i++) assert.equal((await call('POST', '/api/l/units', { cookie: landlord, body: { property_id: propId, label: 'U' + i, kind: 'room', rent: 5000 } })).status, 201);
  r = await call('POST', '/api/l/units', { cookie: landlord, body: { property_id: propId, label: 'U6', kind: 'room', rent: 5000 } }); assert.equal(r.status, 402); // free plan: 5 units
});

test('inquiry: honeypot, validation, landlord inbox', async () => {
  let r = await call('POST', `/api/listings/${unitId}/inquiry`, { body: { name: 'Bot', phone: '9841000000', message: 'spam spam', website: 'x' } }); assert.equal(r.status, 201);
  r = await call('POST', `/api/listings/${unitId}/inquiry`, { body: { name: 'Ram', phone: '123', message: 'Is it free?' } }); assert.equal(r.json.field, 'phone');
  r = await call('POST', `/api/listings/${unitId}/inquiry`, { body: { name: 'Ram', phone: '9841000000', message: 'Is it still free?' } }); assert.equal(r.status, 201);
  r = await call('GET', '/api/l/inquiries', { cookie: landlord }); assert.equal(r.json.items.length, 1); assert.equal(r.json.items[0].name, 'Ram');
});

test('tenant: create, move in, unit leaves listings, tenant links with code', async () => {
  let r = await call('POST', '/api/l/tenants', { cookie: landlord, body: { name: 'Hari Bahadur', phone: '9812345678' } }); assert.equal(r.status, 201); tenantId = r.json.id; inviteCode = r.json.invite_code;
  assert.match(inviteCode, /^[A-Z2-9]{8}$/);
  r = await call('POST', '/api/l/tenancies', { cookie: landlord, body: { unit_id: unitId, tenant_id: tenantId, start_date: bsMonthRange(addBsMonths(month, -1))!.start } }); assert.equal(r.status, 201); tenancyId = r.json.id;
  r = await call('POST', '/api/l/tenancies', { cookie: landlord, body: { unit_id: unitId, tenant_id: tenantId, start_date: '2026-10-01' } }); assert.equal(r.status, 409);
  r = await call('GET', '/api/listings?locality=Patan'); assert.ok(!r.json.items.some((x: any) => x.id === unitId));
  assert.equal((await call('GET', '/api/t/home', { cookie: tenantS })).json.homes.length, 0);
  r = await call('POST', '/api/t/link', { cookie: tenantS, body: { code: 'ZZZZZZZZ' } }); assert.equal(r.status, 404);
  r = await call('POST', '/api/t/link', { cookie: tenantS, body: { code: inviteCode.toLowerCase() } }); assert.equal(r.status, 200);
  r = await call('GET', '/api/t/home', { cookie: tenantS }); assert.equal(r.json.homes.length, 1); assert.equal(r.json.homes[0].unit_label, 'Room 2A');
});

test('ledger: generate rent (idempotent), extra charge, payment + receipt, void, statement', async () => {
  let r = await call('POST', '/api/l/ledger/generate', { cookie: landlord, body: { month } }); assert.equal(r.json.created, 1);
  r = await call('POST', '/api/l/ledger/generate', { cookie: landlord, body: { month } }); assert.equal(r.json.created, 0);
  r = await call('POST', '/api/l/charges', { cookie: landlord, body: { tenancy_id: tenancyId, month, kind: 'electricity', description: 'Sub-meter 120 units', amount: '1,500' } }); assert.equal(r.status, 201);
  r = await call('GET', '/api/l/ledger?month=' + month, { cookie: landlord });
  const row = r.json.rows.find((x: any) => x.id === tenancyId); assert.equal(row.charged, 950000); assert.equal(row.balance, 950000);
  r = await call('POST', '/api/l/payments', { cookie: landlord, body: { tenancy_id: tenancyId, amount: '9000', paid_on: ktmTodayIso(), method: 'esewa', reference: 'ES123', month } });
  assert.equal(r.status, 201); assert.match(r.json.receipt_no, /^KT-\d{4}-0001$/); payToken = r.json.token; payId = r.json.id;
  r = await call('POST', '/api/l/payments', { cookie: landlord, body: { tenancy_id: tenancyId, amount: '100', paid_on: '2099-01-01', method: 'cash' } }); assert.equal(r.json.field, 'paid_on');
  r = await call('GET', '/api/receipts/' + payToken); assert.equal(r.status, 200); assert.equal(r.json.receipt.amount, 900000); assert.equal(r.json.receipt.balance_after, 50000);
  assert.equal(r.json.receipt.words, 'Rupees Nine Thousand Only');
  r = await call('GET', '/api/t/receipts/' + payId, { cookie: tenantS }); assert.equal(r.status, 200);
  assert.equal((await call('GET', '/api/l/payments/' + payId, { cookie: landlord2 })).status, 404);
  r = await call('GET', '/api/l/statement/' + tenancyId, { cookie: landlord }); assert.equal(r.json.balance, 50000);
  r = await call('POST', `/api/l/payments/${payId}/void`, { cookie: landlord, body: { reason: 'Entered twice' } }); assert.equal(r.status, 200);
  r = await call('GET', '/api/l/statement/' + tenancyId, { cookie: landlord }); assert.equal(r.json.balance, 950000);
  r = await call('GET', '/api/receipts/' + payToken); assert.equal(r.json.receipt.voided, 1);
});

test('maintenance: tenant raises, landlord updates, tenant closes after resolve', async () => {
  let r = await call('POST', '/api/t/maintenance', { cookie: tenantS, body: { tenancy_id: tenancyId, title: 'No hot water', category: 'water', priority: 'urgent', description: 'Geyser not heating since yesterday.' } });
  assert.equal(r.status, 201); maintId = r.json.id;
  r = await call('POST', '/api/t/maintenance', { cookie: tenantS, body: { tenancy_id: 99999, title: 'x', category: 'water', description: 'xxxxxx' } }); assert.equal(r.status, 404);
  r = await call('GET', '/api/l/maintenance?status=active', { cookie: landlord }); assert.equal(r.json.items.length, 1);
  assert.equal((await call('POST', `/api/t/maintenance/${maintId}/comment`, { cookie: tenantS, body: { close: true } })).status, 409);
  r = await call('POST', `/api/l/maintenance/${maintId}`, { cookie: landlord, body: { status: 'in_progress', note: 'Electrician coming at 10' } }); assert.equal(r.status, 200);
  assert.equal((await call('POST', `/api/l/maintenance/${maintId}`, { cookie: landlord2, body: { status: 'closed' } })).status, 404);
  await call('POST', `/api/l/maintenance/${maintId}`, { cookie: landlord, body: { status: 'resolved' } });
  r = await call('POST', `/api/t/maintenance/${maintId}/comment`, { cookie: tenantS, body: { close: true, note: 'Working now, thanks' } }); assert.equal(r.status, 200);
  r = await call('GET', `/api/t/maintenance/${maintId}`, { cookie: tenantS }); assert.equal(r.json.request.status, 'closed'); assert.equal(r.json.events.length, 4);
});

test('admin: overview, hide listing, disable user ends sessions, audit', async () => {
  assert.equal((await call('GET', '/api/admin/overview', { cookie: landlord })).status, 403);
  let r = await call('GET', '/api/admin/overview', { cookie: adminS }); assert.equal(r.status, 200); assert.ok(r.json.counts.landlords >= 3);
  const list = await call('GET', '/api/listings'); const victim = list.json.items[0].id;
  r = await call('PUT', '/api/admin/listings/' + victim, { cookie: adminS, body: { hidden: true, reason: 'test' } }); assert.equal(r.status, 200);
  assert.ok(!(await call('GET', '/api/listings')).json.items.some((x: any) => x.id === victim));
  await call('PUT', '/api/admin/listings/' + victim, { cookie: adminS, body: { hidden: false } });
  const users = (await call('GET', '/api/admin/users', { cookie: adminS })).json.items; const l2 = users.find((u: any) => u.email === 'l2@example.com');
  r = await call('PUT', '/api/admin/users/' + l2.id, { cookie: adminS, body: { disabled: true } }); assert.equal(r.status, 200);
  assert.equal((await call('GET', '/api/me', { cookie: landlord2 })).json.user, null);
  r = await call('PUT', '/api/admin/users/' + users.find((u: any) => u.email === 'l1@example.com').id, { cookie: adminS, body: { plan: 'pro' } }); assert.equal(r.status, 200);
  r = await call('GET', '/api/admin/audit', { cookie: adminS }); assert.ok(r.json.items.some((a: any) => a.action === 'user.admin_update'));
});

test('demo: login buttons work, reset restores data', async () => {
  let r = await call('POST', '/api/auth/demo', { body: { as: 'landlord' } }); assert.equal(r.status, 200); const d = r.cookie!;
  r = await call('GET', '/api/l/overview', { cookie: d }); assert.equal(r.json.counts.units, 10); assert.equal(r.json.counts.occupied, 3);
  r = await call('POST', '/api/auth/demo', { body: { as: 'tenant' } }); const t = r.cookie!;
  r = await call('GET', '/api/t/home', { cookie: t }); assert.equal(r.json.homes.length, 1); assert.ok(r.json.homes[0].lines.length > 4);
  r = await call('POST', '/api/me/password', { cookie: t, body: { current: 'x', next: 'Abcdefg123' } }); assert.equal(r.status, 403);
  r = await call('POST', '/api/admin/demo-reset', { cookie: adminS, body: {} }); assert.equal(r.status, 200);
  r = await call('GET', '/api/l/overview', { cookie: d }); assert.equal(r.json.counts.units, 10);
  assert.equal((await call('POST', '/api/auth/login', { body: { email: DEMO_LANDLORD, password: 'anything1' } })).status, 401);
});

test('worker fetch: SPA shell with CSP for known routes, 404 for unknown', async () => {
  const assets = { fetch: async (r: Request) => new URL(r.url).pathname === '/app-shell.html' ? new Response('<html>shell</html>', { headers: { 'Content-Type': 'text/html' } }) : new Response('nf', { status: 404 }) };
  let res = await worker.fetch(new Request(ORIGIN + '/rooms'), { ...env, ASSETS: assets }); assert.equal(res.status, 200); assert.match(res.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
  res = await worker.fetch(new Request(ORIGIN + '/nope/nope'), { ...env, ASSETS: assets }); assert.equal(res.status, 404);
});
