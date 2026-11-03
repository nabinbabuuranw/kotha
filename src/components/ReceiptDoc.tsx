import type { Receipt } from '../lib/api';
import { rs, METHOD, kindLabel } from '../lib/format';
import { bsLabel } from '../../shared/rent';

/** Printable rent receipt (A5 landscape). */
export function ReceiptDoc({ r }: { r: Receipt }) {
  return (
    <article className="print-sheet relative mx-auto max-w-[760px] border border-ink bg-[#FBF8F4] p-6 sm:p-8">
      {r.voided ? <div className="absolute right-6 top-24 rotate-[-8deg] border-2 border-due px-3 py-1 text-due text-xl font-bold wide">VOID</div> : null}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="eyebrow">Rent receipt · <span className="deva normal-case tracking-normal">भाडा रसिद</span></p>
          <p className="display mt-1 text-[28px]">{r.landlord_name}</p>
          <p className="text-[13.5px] text-umber">{r.property_name}, {r.address || r.locality}{r.landlord_phone ? ` · ${r.landlord_phone}` : ''}</p>
        </div>
        <div className="text-right">
          <p className="eyebrow">Receipt no.</p><p className="num text-[18px] font-semibold">{r.receipt_no}</p>
          <p className="mt-1 text-[13px] text-umber">{r.paid_on_bs ? `${bsLabel(r.paid_on)} BS` : ''} · {r.paid_on} AD</p>
        </div>
      </header>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 text-[14.5px]">
        <Row k="Received from" v={r.tenant_name} /><Row k="For" v={`Rent, ${r.month_label}`} />
        <Row k="Unit" v={`${r.unit_label} (${kindLabel(r.unit_kind)})`} /><Row k="Paid by" v={METHOD[r.method] + (r.reference ? ` · ref ${r.reference}` : '')} />
      </dl>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-y border-ink py-4">
        <div><p className="eyebrow">Amount received</p><p className="display num text-[38px]">{rs(r.amount)}</p><p className="text-[13.5px] italic text-umber">{r.words}</p></div>
        <div className="text-right text-[14px]"><p className="text-umber">Balance after this payment</p><p className="num text-[18px] font-semibold">{r.balance_after > 0 ? rs(r.balance_after) + ' due' : r.balance_after < 0 ? rs(-r.balance_after) + ' advance' : 'Nil'}</p></div>
      </div>
      <footer className="mt-6 flex flex-wrap items-end justify-between gap-6 text-[12.5px] text-umber">
        <p className="max-w-sm">Issued with Kotha. This is a rent receipt between landlord and tenant, not a tax invoice.{r.is_demo ? ' DEMO DATA: sample receipt, not a real payment.' : ''}{r.voided && r.void_reason ? ` Voided: ${r.void_reason}.` : ''}</p>
        <div className="text-center"><div className="h-10 w-44 border-b border-ink" /><p className="mt-1">Landlord's signature</p></div>
      </footer>
    </article>
  );
}
function Row({ k, v }: { k: string; v: string }) { return <div className="flex justify-between gap-4 border-b border-line py-2.5"><dt className="text-umber">{k}</dt><dd className="text-right font-medium">{v}</dd></div>; }
