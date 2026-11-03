// Thin fetch wrapper: same-origin JSON, cookie session, typed errors.
export class ApiError extends Error {
  status: number; code: string; field?: string; data: any;
  constructor(status: number, data: any) { super(data?.error || 'request_failed'); this.status = status; this.code = data?.error || 'request_failed'; this.field = data?.field; this.data = data; }
}
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = opts.method || (opts.body !== undefined ? 'POST' : 'GET');
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method, credentials: 'same-origin', signal: opts.signal,
      headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : method !== 'GET' ? '{}' : undefined,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(0, { error: 'network' });
  }
  const text = await res.text(); let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: 'bad_response' }; }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
/** Download a CSV from the API through a blob (keeps the session cookie, no new window). */
export async function download(path: string, filename: string) {
  const res = await fetch('/api' + path, { credentials: 'same-origin' });
  if (!res.ok) throw new ApiError(res.status, { error: 'download_failed' });
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const FIELD: Record<string, string> = {
  name: 'name', email: 'email', password: 'password (8+ characters with a letter and a number)', phone: 'phone number (98XXXXXXXX)', role: 'account type',
  locality: 'locality', address: 'address', label: 'unit name', kind: 'unit type', rent: 'monthly rent', deposit: 'deposit', floor: 'floor', area_sqft: 'area (sq ft)',
  available_from: 'available-from date', description: 'description', message: 'message', unit_id: 'unit', tenant_id: 'tenant', start_date: 'move-in date',
  end_date: 'move-out date (on or after move-in)', amount: 'amount', paid_on: 'payment date (today or earlier)', method: 'payment method', month: 'month', reason: 'reason',
  title: 'title', category: 'category', priority: 'priority', note: 'note', code: '8-character code', tenancy_id: 'tenancy', property_id: 'property', status: 'status', reference: 'reference',
};
const MESSAGES: Record<string, string> = {
  network: 'Could not reach Kotha. Check your connection and try again.',
  bad_credentials: 'That email and password do not match.',
  account_disabled: 'This account has been disabled.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  email_taken: 'An account with this email already exists. Try signing in.',
  not_found: 'We could not find that.', forbidden: 'You do not have access to this.', not_signed_in: 'Please sign in first.',
  server_error: 'Something went wrong on our side. Please try again.',
  plan_limit: 'The Free plan covers 5 units. Ask for Landlord Pro to add more.',
  has_tenancies: 'This has tenancy history, so it cannot be deleted. End the tenancy instead.',
  unit_occupied: 'Someone already lives in this unit. End that tenancy first.',
  tenant_has_home: 'This tenant already has an active tenancy.',
  already_ended: 'This tenancy has already ended.',
  code_not_found: 'That code does not match any tenant record. Check it with your landlord.',
  code_used: 'That code is already linked to another account. Ask your landlord for a new code.',
  not_resolved: 'You can close a request after your landlord marks it resolved.',
  demo_locked: 'The demo account cannot change its password.',
  too_many: 'That is more than this account can hold.',
};
export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'invalid' && e.field) return 'Please check the ' + (FIELD[e.field] || e.field) + '.';
    return MESSAGES[e.code] || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
export type Role = 'tenant' | 'landlord' | 'admin';
export interface User { id: number; email: string; name: string; phone: string | null; role: Role; plan: string; is_demo: number }
export interface Listing { id: number; label: string; kind: string; floor: number; area_sqft: number | null; rent: number; deposit: number; furnished: string; parking: string; water24: number;
  attached_bath: number; suited: string; available_from: string | null; description: string; updated_at: number; locality: string; property_name: string; is_demo: number; landlord_name?: string; landlord_since?: number }
export interface Property { id: number; name: string; locality: string; address: string; notes: string; units: number; occupied: number }
export interface Unit extends Omit<Listing, 'locality' | 'is_demo'> { property_id: number; locality: string; listed: number; hidden: number; tenancy_id: number | null; tenant_name: string | null; new_inquiries: number }
export interface StatementLine { type: 'charge' | 'payment'; id: number; month: string; label: string; debit: number; credit: number; balance: number; token?: string; voided?: number; paid_on?: string }
export interface Receipt { id: number; amount: number; paid_on: string; paid_on_bs: string | null; bs_month: string; month_label: string; method: string; reference: string; receipt_no: string; token: string;
  voided: number; void_reason: string | null; tenant_name: string; tenant_phone: string | null; unit_label: string; unit_kind: string; property_name: string; locality: string; address: string;
  landlord_name: string; landlord_phone: string | null; is_demo: number; monthly_rent: number; words: string; balance_after: number }
export interface MaintRequest { id: number; title: string; category: string; priority: string; description: string; status: string; created_at: number; updated_at: number; unit_label: string; property_name: string; tenant_name?: string | null; events?: number }
export interface MaintEvent { actor_name: string; actor_role: string; status: string | null; note: string; created_at: number }
