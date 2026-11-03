// Shared money + Bikram Sambat helpers for the API and the browser. Amounts are integer paisa (Rs 1 = 100 paisa).
import { adToBs, bsToAd, BS_MONTHS_EN, daysInBsMonth } from './nepali-date.js';

/** 123456789 paisa -> "12,34,567.89" (Nepali digit grouping). */
export function fmtNpr(paisa: number, withPaisa = false): string {
  const neg = paisa < 0; const p = Math.abs(Math.round(paisa));
  const r = Math.floor(p / 100), ps = p % 100;
  const s = String(r); let head = s.slice(0, -3); const tail = s.slice(-3);
  if (head) head = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',';
  return (neg ? '-' : '') + head + tail + (withPaisa || ps ? '.' + String(ps).padStart(2, '0') : '');
}
export const rs = (paisa: number) => 'Rs ' + fmtNpr(paisa);

/** "1,23,456.5" / 1234 -> paisa; null when not a valid non-negative amount (max Rs 9,99,99,999). */
export function parseNpr(v: unknown): number | null {
  if (typeof v === 'number') { if (!Number.isFinite(v) || v < 0 || v > 99_999_999) return null; return Math.round(v * 100); }
  if (typeof v !== 'string') return null;
  const s = v.replace(/[,\s]/g, '').replace(/^Rs\.?/i, '');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) return null;
  const [a, b = ''] = s.split('.');
  return Number(a) * 100 + Number((b + '00').slice(0, 2));
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
const three = (n: number) => { const h = Math.floor(n / 100), r = n % 100; return [h ? ONES[h] + ' Hundred' : '', r ? two(r) : ''].filter(Boolean).join(' '); };
export function rupeesInWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000); n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000); n %= 1_00_000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(three(crore) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (thousand) parts.push(two(thousand) + ' Thousand');
  if (n) parts.push(three(n));
  return parts.join(' ');
}
export function amountInWords(paisa: number): string {
  const r = Math.floor(paisa / 100), p = paisa % 100;
  return 'Rupees ' + rupeesInWords(r) + (p ? ' and ' + two(p) + ' Paisa' : '') + ' Only';
}

/** Today's date in Kathmandu (UTC+5:45) as AD 'YYYY-MM-DD'. */
export function ktmTodayIso(now = Date.now()): string { return new Date(now + 345 * 60000).toISOString().slice(0, 10); }
/** AD 'YYYY-MM-DD' -> BS 'YYYY-MM-DD' (null outside the table range). */
export function adIsoToBs(iso: string): string | null {
  try { const b = adToBs(iso); return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`; } catch { return null; }
}
export function bsLabel(iso: string): string {
  try { const b = adToBs(iso); return `${b.day} ${BS_MONTHS_EN[b.month - 1]} ${b.year}`; } catch { return ''; }
}
/** BS month key 'YYYY-MM' containing an AD date. */
export function bsYmOf(iso: string): string | null { const b = adIsoToBs(iso); return b ? b.slice(0, 7) : null; }
export function validBsYm(v: unknown): string | null {
  if (typeof v !== 'string') return null; const m = /^(\d{4})-(\d{2})$/.exec(v); if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]); if (mo < 1 || mo > 12) return null;
  try { daysInBsMonth(y, mo); return v; } catch { return null; }
}
export function bsYmLabel(ym: string): string { const [y, m] = ym.split('-').map(Number); return `${BS_MONTHS_EN[m - 1]} ${y}`; }
export function addBsMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
/** AD date range [start, end] for a BS month (YYYY-MM). */
export function bsMonthRange(ym: string): { start: string; end: string } | null {
  if (!validBsYm(ym)) return null; const [y, mo] = ym.split('-').map(Number);
  try {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { start: iso(bsToAd(y, mo, 1).date), end: iso(bsToAd(y, mo, daysInBsMonth(y, mo)).date) };
  } catch { return null; }
}
export const daysBetween = (aIso: string, bIso: string) => Math.round((Date.parse(bIso) - Date.parse(aIso)) / 86400000);

export const UNIT_KINDS = ['room', 'flat_1bhk', 'flat_2bhk', 'flat_3bhk', 'house', 'shutter'] as const;
export type UnitKind = typeof UNIT_KINDS[number];
export const KIND_LABEL: Record<UnitKind, string> = { room: 'Room', flat_1bhk: '1BHK flat', flat_2bhk: '2BHK flat', flat_3bhk: '3BHK flat', house: 'Whole house', shutter: 'Shop shutter' };
export const LOCALITIES = ['Baneshwor', 'Baluwatar', 'Bhaisepati', 'Boudha', 'Budhanilkantha', 'Chabahil', 'Dillibazar', 'Gongabu', 'Jawalakhel', 'Kalanki', 'Kalimati', 'Kapan', 'Koteshwor', 'Kupondole', 'Lazimpat', 'Maharajgunj', 'Naxal', 'New Road', 'Patan', 'Sanepa', 'Sinamangal', 'Sitapaila', 'Swayambhu', 'Thamel', 'Tokha', 'Bhaktapur', 'Kirtipur', 'Other'] as const;
export const SUITED = ['anyone', 'family', 'students', 'working', 'women'] as const;
export const SUITED_LABEL: Record<string, string> = { anyone: 'Anyone', family: 'Families', students: 'Students', working: 'Working people', women: 'Women only' };
export const MAINT_CATEGORIES = ['plumbing', 'water', 'electrical', 'appliance', 'structure', 'pest', 'other'] as const;
export const MAINT_STATUS = ['open', 'in_progress', 'resolved', 'closed'] as const;
export const MAINT_STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' };
export const PAY_METHODS = ['cash', 'bank', 'esewa', 'khalti', 'fonepay', 'cheque'] as const;
