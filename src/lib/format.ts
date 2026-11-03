import { fmtNpr, bsLabel, bsYmLabel, KIND_LABEL, SUITED_LABEL, MAINT_STATUS_LABEL } from '../../shared/rent';
export { fmtNpr, bsLabel, bsYmLabel, KIND_LABEL, SUITED_LABEL, MAINT_STATUS_LABEL };
export const rs = (p: number) => 'Rs ' + fmtNpr(p);
export const kindLabel = (k: string) => (KIND_LABEL as any)[k] || k;
export const dateTime = (ms: number) => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu' });
export const ago = (ms: number) => {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago';
};
export const FURNISHED: Record<string, string> = { none: 'Unfurnished', semi: 'Semi-furnished', full: 'Furnished' };
export const PARKING: Record<string, string> = { none: 'No parking', bike: 'Bike parking', car: 'Car parking' };
export const METHOD: Record<string, string> = { cash: 'Cash', bank: 'Bank transfer', esewa: 'eSewa', khalti: 'Khalti', fonepay: 'Fonepay QR', cheque: 'Cheque' };
export const floorLabel = (f: number) => (f === 0 ? 'Ground floor' : f < 0 ? 'Basement' : `Floor ${f}`);
export const waLink = (phone: string | null | undefined, text: string) => phone ? `https://wa.me/977${phone.replace(/^0/, '')}?text=${encodeURIComponent(text)}` : '';
