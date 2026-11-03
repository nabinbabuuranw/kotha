import { useState, type FormEvent } from 'react';
import { useApi } from '../../lib/useApi';
import { api, errorText, type StatementLine } from '../../lib/api';
import { bsYmOf, ktmTodayIso, PAY_METHODS } from '../../../shared/rent';
import { rs, METHOD, bsYmLabel } from '../../lib/format';
import { Field, Input, Select, Modal, ErrorBox, SkeletonRows, Empty, Tag, useToast } from '../../components/ui';
import { Icon } from '../../components/Icons';
import { Link, navigate, useLocation } from '../../lib/router';

type Row = { id: number; rent: number; status: string; tenant_name: string; tenant_phone: string | null; unit_label: string; property_name: string; charged: number; rent_charged: number; paid: number; balance: number };
type LedgerData = { month: string; month_label: string; prev: string; next: string; rows: Row[]; charges: any[]; payments: any[]; pending: number };

export function Statement({ tenancyId, tenantView = false }: { tenancyId: number; tenantView?: boolean }) {
  const { data, error, loading } = useApi<{ lines: StatementLine[]; balance: number }>(tenantView ? null : `/l/statement/${tenancyId}`);
  if (loading) return <SkeletonRows rows={3} />; if (error) return <ErrorBox text={error} />;
  return <StatementTable lines={data!.lines} balance={data!.balance} receiptBase="/app/receipt/" />;
}
export function StatementTable({ lines, balance, receiptBase }: { lines: StatementLine[]; balance: number; receiptBase: string }) {
  if (!lines.length) return <p className="text-[14px] text-umber">No charges or payments yet.</p>;
  return (
    <div className="overflow-x-auto"><table className="tbl min-w-[520px]">
      <thead><tr><th>Month</th><th>Entry</th><th className="text-right">Charged</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr></thead>
      <tbody>{lines.map((l) => (
        <tr key={l.type + l.id} className={l.voided ? 'opacity-50' : ''}>
          <td className="whitespace-nowrap text-umber">{bsYmLabel(l.month)}</td>
          <td>{l.type === 'payment' ? <Link to={receiptBase + (receiptBase.startsWith('/r/') ? l.token : l.id)} className="underline underline-offset-2">{l.label}</Link> : l.label}</td>
          <td className="num text-right">{l.debit ? rs(l.debit) : ''}</td><td className="num text-right text-paid">{l.credit ? rs(l.credit) : ''}</td>
          <td className={`num text-right font-medium ${l.balance > 0 ? 'text-due' : ''}`}>{rs(l.balance)}</td>
        </tr>))}</tbody>
      <tfoot><tr><td colSpan={4} className="py-3 px-3 text-right font-semibold">{balance > 0 ? 'Due now' : balance < 0 ? 'Advance' : 'Settled'}</td><td className={`num px-3 text-right text-[17px] font-semibold ${balance > 0 ? 'text-due' : 'text-paid'}`}>{rs(Math.abs(balance))}</td></tr></tfoot>
    </table></div>
  );
}

function PaymentForm({ row, month, onDone }: { row: Row; month: string; onDone: (id: number) => void }) {
  const [f, setF] = useState({ amount: String(Math.max(0, row.balance) / 100 || row.rent / 100), paid_on: ktmTodayIso(), method: 'cash', reference: '', month });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { const r = await api('/l/payments', { body: { ...f, tenancy_id: row.id } }); toast(`Receipt ${r.receipt_no} made`); onDone(r.id); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <p className="sm:col-span-2 text-[14px] text-umber">{row.tenant_name} · {row.unit_label}. Owes {rs(Math.max(0, row.balance))} in total.</p>
      <Field label="Amount (Rs)"><Input required inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
      <Field label="Paid on"><Input type="date" required max={ktmTodayIso()} value={f.paid_on} onChange={(e) => setF({ ...f, paid_on: e.target.value })} /></Field>
      <Field label="Method"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{PAY_METHODS.map((m) => <option key={m} value={m}>{METHOD[m]}</option>)}</Select></Field>
      <Field label="Reference (optional)" hint="Transaction ID or cheque no."><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
      {e && <div className="sm:col-span-2"><ErrorBox text={e} /></div>}
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : 'Record payment and make receipt'}</button>
    </form>
  );
}
function ChargeForm({ row, month, onDone }: { row: Row; month: string; onDone: () => void }) {
  const [f, setF] = useState({ kind: 'electricity', description: 'Electricity (sub-meter)', amount: '' });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const DEF: Record<string, string> = { electricity: 'Electricity (sub-meter)', water: 'Water (tanker share)', internet: 'Internet', other: '' };
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { await api('/l/charges', { body: { ...f, tenancy_id: row.id, month } }); toast('Charge added'); onDone(); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Kind"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, description: DEF[e.target.value] })}><option value="electricity">Electricity</option><option value="water">Water</option><option value="internet">Internet</option><option value="other">Other</option></Select></Field>
      <Field label="Amount (Rs)"><Input required inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
      <Field label="Description" className="sm:col-span-2"><Input required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      {e && <div className="sm:col-span-2"><ErrorBox text={e} /></div>}
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : `Add to ${bsYmLabel(month)}`}</button>
    </form>
  );
}

export default function Ledger() {
  const { search } = useLocation(); const q = new URLSearchParams(search).get('month');
  const month = q && /^\d{4}-\d{2}$/.test(q) ? q : bsYmOf(ktmTodayIso())!;
  const { data, error, loading, reload } = useApi<LedgerData>(`/l/ledger?month=${month}`);
  const [modal, setModal] = useState<null | { t: 'pay' | 'charge' | 'stmt'; row: Row }>(null);
  const [busy, setBusy] = useState(false); const toast = useToast();
  const go = (m: string) => navigate(`/app/ledger?month=${m}`, { replace: true });
  const generate = async () => { setBusy(true); try { const r = await api('/l/ledger/generate', { body: { month } }); toast(r.created ? `Rent charged to ${r.created} tenant${r.created > 1 ? 's' : ''}` : 'Everyone is already charged'); reload(true); } catch (x) { toast(errorText(x), 'err'); } finally { setBusy(false); } };
  const voidPay = async (id: number) => { const reason = prompt('Why void this payment? (kept on the record)'); if (!reason) return; try { await api(`/l/payments/${id}/void`, { body: { reason } }); toast('Payment voided'); reload(true); } catch (x) { toast(errorText(x), 'err'); } };
  const delCharge = async (id: number) => { if (!confirm('Remove this charge?')) return; try { await api(`/l/charges/${id}`, { method: 'DELETE' }); toast('Charge removed'); reload(true); } catch (x) { toast(errorText(x), 'err'); } };
  const totals = data ? data.rows.reduce((a, r) => ({ charged: a.charged + r.charged, paid: a.paid + r.paid }), { charged: 0, paid: 0 }) : { charged: 0, paid: 0 };
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-stretch border border-ink">
          <button className="btn-quiet !h-11 rounded-none border-r border-ink" onClick={() => data && go(data.prev)} aria-label="Previous month"><Icon name="back" size={18} /></button>
          <div className="flex min-w-[170px] flex-col justify-center px-4 text-center"><span className="eyebrow !text-[10px]">Bikram Sambat</span><span className="text-[17px] font-semibold wide">{bsYmLabel(month)}</span></div>
          <button className="btn-quiet !h-11 rounded-none border-l border-ink" onClick={() => data && go(data.next)} aria-label="Next month"><Icon name="arrow" size={18} /></button>
        </div>
        {data && data.pending > 0 && <button className="btn-primary" onClick={generate} disabled={busy}><Icon name="ledger" size={18} />{busy ? 'Charging…' : `Charge rent to ${data.pending} tenant${data.pending > 1 ? 's' : ''}`}</button>}
      </div>
      {error && <ErrorBox text={error} onRetry={() => reload()} />}
      {loading ? <SkeletonRows rows={5} /> : data && (data.rows.length === 0 ? <Empty icon="ledger" title={`No tenancies in ${data.month_label}`}>Move a tenant into a unit under Tenants, then charge rent here each month.</Empty> : (
        <>
          <ul className="space-y-3 md:hidden">{data.rows.map((r) => {
            const st = r.balance <= 0 ? 'paid' : r.paid > 0 ? 'part' : 'due';
            return (
              <li key={r.id} className="border border-ink bg-[#FBF8F4] p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{r.tenant_name}</p><p className="text-[12.5px] text-umber">{r.unit_label} · {r.property_name}</p></div><Tag tone={st}>{st === 'paid' ? 'Settled' : st === 'part' ? 'Part paid' : 'Due'}</Tag></div>
                <dl className="mt-3 grid grid-cols-3 border-y border-line py-2 text-[12.5px]"><div><dt className="text-umber">Charged</dt><dd className="num font-medium">{rs(r.charged)}</dd></div><div><dt className="text-umber">Paid</dt><dd className="num font-medium text-paid">{r.paid ? rs(r.paid) : '–'}</dd></div><div><dt className="text-umber">Total due</dt><dd className={`num font-semibold ${r.balance > 0 ? 'text-due' : ''}`}>{r.balance > 0 ? rs(r.balance) : 'Nil'}</dd></div></dl>
                {!r.rent_charged && r.status === 'active' && <p className="mt-2 text-[12px] text-part">Rent not charged yet</p>}
                <div className="mt-3 grid grid-cols-3 gap-2"><button className="btn-primary btn-sm" onClick={() => setModal({ t: 'pay', row: r })}>Payment</button><button className="btn-ghost btn-sm" onClick={() => setModal({ t: 'charge', row: r })}>+ Charge</button><button className="btn-ghost btn-sm" onClick={() => setModal({ t: 'stmt', row: r })}>Statement</button></div>
              </li>);
          })}<li className="flex justify-between border-t border-ink pt-3 text-[14px] font-semibold"><span>{data.month_label}</span><span className="num">{rs(totals.paid)} of {rs(totals.charged)}</span></li></ul>
          <div className="hidden overflow-x-auto border border-ink bg-[#FBF8F4] md:block"><table className="tbl min-w-[760px]">
            <thead><tr><th>Tenant · unit</th><th className="text-right">Charged this month</th><th className="text-right">Paid this month</th><th className="text-right">Total due</th><th>State</th><th className="text-right">Actions</th></tr></thead>
            <tbody>{data.rows.map((r) => {
              const st = r.balance <= 0 ? 'paid' : r.paid > 0 ? 'part' : 'due';
              return (
                <tr key={r.id}>
                  <td><p className="font-medium">{r.tenant_name}</p><p className="text-[12.5px] text-umber">{r.unit_label} · {r.property_name}</p>{!r.rent_charged && r.status === 'active' && <p className="mt-1 text-[12px] text-part">Rent not charged yet</p>}</td>
                  <td className="num text-right">{rs(r.charged)}</td><td className="num text-right text-paid">{r.paid ? rs(r.paid) : '–'}</td>
                  <td className={`num text-right font-semibold ${r.balance > 0 ? 'text-due' : ''}`}>{r.balance > 0 ? rs(r.balance) : r.balance < 0 ? `${rs(-r.balance)} adv.` : 'Nil'}</td>
                  <td><Tag tone={st}>{st === 'paid' ? 'Settled' : st === 'part' ? 'Part paid' : 'Due'}</Tag></td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-primary btn-sm" onClick={() => setModal({ t: 'pay', row: r })}>Payment</button>
                    <button className="btn-quiet btn-sm" onClick={() => setModal({ t: 'charge', row: r })}>+ Charge</button>
                    <button className="btn-quiet btn-sm" onClick={() => setModal({ t: 'stmt', row: r })}>Statement</button>
                  </td>
                </tr>);
            })}</tbody>
            <tfoot><tr><td className="px-3 py-3 font-semibold">{data.month_label}</td><td className="num px-3 text-right font-semibold">{rs(totals.charged)}</td><td className="num px-3 text-right font-semibold text-paid">{rs(totals.paid)}</td><td colSpan={3} /></tr></tfoot>
          </table></div>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section><h2 className="eyebrow mb-3">Receipts in {data.month_label}</h2>
              {data.payments.length === 0 ? <p className="text-[14px] text-umber">No payments recorded for this month yet.</p> : <ul className="border-t border-ink">{data.payments.map((p) => (
                <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 text-[14px] ${p.voided ? 'opacity-50' : ''}`}>
                  <Link to={`/app/receipt/${p.id}`} className="num underline underline-offset-2">{p.receipt_no}</Link><span className="text-umber">{METHOD[p.method]}</span><span className="num font-medium">{rs(p.amount)}</span>
                  {p.voided ? <Tag tone="due">Void</Tag> : <button className="btn-quiet btn-sm text-due" onClick={() => voidPay(p.id)}>Void</button>}
                </li>))}</ul>}
            </section>
            <section><h2 className="eyebrow mb-3">Charges in {data.month_label}</h2>
              {data.charges.length === 0 ? <p className="text-[14px] text-umber">No charges yet.</p> : <ul className="border-t border-ink">{data.charges.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 border-b border-line py-2.5 text-[14px]"><span>{c.description}<span className="text-umber"> · {data.rows.find((r) => r.id === c.tenancy_id)?.tenant_name}</span></span><span className="flex items-center gap-2"><span className="num">{rs(c.amount)}</span><button className="btn-quiet btn-sm" onClick={() => delCharge(c.id)} aria-label="Remove charge"><Icon name="close" size={16} /></button></span></li>))}</ul>}
            </section>
          </div>
        </>
      ))}
      <Modal open={modal?.t === 'pay'} onClose={() => setModal(null)} title="Record a payment">{modal?.t === 'pay' && <PaymentForm row={modal.row} month={month} onDone={(id) => { setModal(null); navigate(`/app/receipt/${id}`); }} />}</Modal>
      <Modal open={modal?.t === 'charge'} onClose={() => setModal(null)} title="Add a charge">{modal?.t === 'charge' && <ChargeForm row={modal.row} month={month} onDone={() => { setModal(null); reload(true); }} />}</Modal>
      <Modal wide open={modal?.t === 'stmt'} onClose={() => setModal(null)} title={modal ? `Statement · ${modal.row.tenant_name}` : ''}>{modal?.t === 'stmt' && <Statement tenancyId={modal.row.id} />}</Modal>
    </div>
  );
}
