import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '../lib/router';
import { useApi } from '../lib/useApi';
import { api, errorText, type Listing } from '../lib/api';
import { rs, kindLabel, floorLabel, FURNISHED, PARKING, SUITED_LABEL, bsLabel } from '../lib/format';
import { PublicHeader, Footer } from '../components/PublicHeader';
import { PlanGlyph } from '../components/PlanGlyph';
import { ErrorBox, Field, Input, Textarea, Tag, Skeleton, Notice } from '../components/ui';
import { Icon } from '../components/Icons';

function Inquiry({ id, label }: { id: number; label: string }) {
  const [f, setF] = useState({ name: '', phone: '', message: `Namaste, is "${label}" still available? I would like to visit.`, website: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle'); const [errMsg, setErr] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null); setState('busy');
    try { await api(`/listings/${id}/inquiry`, { body: f }); setState('done'); } catch (x) { setErr(errorText(x)); setState('idle'); }
  };
  if (state === 'done') return <Notice tone="ok"><b>Sent.</b> The landlord sees your name, number and message in their Kotha desk and will call or message you.</Notice>;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Your name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
      <Field label="Mobile number" hint="The landlord will contact you on this number."><Input required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="98XXXXXXXX" autoComplete="tel" /></Field>
      <Field label="Message"><Textarea required value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label></div>
      {errMsg && <ErrorBox text={errMsg} />}
      <button className="btn-primary w-full" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send inquiry'}</button>
      <p className="text-[12.5px] text-umber">No account needed. Kotha does not charge renters.</p>
    </form>
  );
}

export default function RoomDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<{ listing: Listing }>(`/listings/${id}`);
  const l = data?.listing;
  useEffect(() => { if (l) document.title = `${l.label}, ${l.locality} · Kotha`; }, [l]);
  return (
    <>
      <PublicHeader />
      <main className="page-in mx-auto max-w-sheet px-5 py-8 lg:px-8">
        <Link to="/rooms" className="btn-quiet btn-sm -ml-2"><Icon name="back" size={16} />All listings</Link>
        {loading && <div className="mt-6 grid gap-8 lg:grid-cols-12"><Skeleton className="h-[360px] lg:col-span-7" /><Skeleton className="h-[360px] lg:col-span-5" /></div>}
        {error && <div className="mt-6"><ErrorBox text={error === 'We could not find that.' ? 'This listing is no longer available. It may have been rented.' : error} onRetry={() => reload()} /></div>}
        {l && (
          <div className="mt-4 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">{l.is_demo ? <Tag tone="demo">Demo listing</Tag> : null}<Tag tone="listed">{kindLabel(l.kind)}</Tag></div>
              <h1 className="display mt-3 text-[38px] sm:text-[54px]">{l.label}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-[16px] text-umber"><Icon name="pin" size={18} />{l.locality} · {floorLabel(l.floor)}</p>
              {l.is_demo ? <div className="mt-4"><Notice tone="warn">This is sample data for trying Kotha. It is not a real home, and inquiries go to the demo landlord desk.</Notice></div> : null}
              <figure className="mt-6 border border-ink bg-[#FBF8F4] p-6 sm:p-10">
                <PlanGlyph kind={l.kind} animate className="mx-auto w-full max-w-[520px]" />
                <figcaption className="mt-3 flex justify-between text-[12px] text-umber"><span>Plan sketch by type, not to scale</span><span>{l.area_sqft ? `${l.area_sqft} sq ft (as stated by landlord)` : ''}</span></figcaption>
              </figure>
              {l.description && <><h2 className="eyebrow mt-8">From the landlord</h2><p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{l.description}</p></>}
            </div>
            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="border border-ink bg-[#F8F3EC]">
                  <div className="border-b border-ink p-5"><p className="eyebrow">Monthly rent</p><p className="display num mt-1 text-[44px]">{rs(l.rent)}</p>
                    <p className="text-[14px] text-umber">{l.deposit ? `Deposit ${rs(l.deposit)}` : 'No deposit stated'}{l.available_from ? ` · free from ${bsLabel(l.available_from)} BS` : ''}</p></div>
                  <dl className="grid grid-cols-2 text-[14px]">
                    {[['Furnishing', FURNISHED[l.furnished]], ['Parking', PARKING[l.parking]], ['Water', l.water24 ? '24 hours' : 'Not 24 hours'], ['Bathroom', l.attached_bath ? 'Attached' : 'Shared'], ['Suits', SUITED_LABEL[l.suited]], ['Landlord', l.landlord_name || '']].map(([k, v], i) => (
                      <div key={k} className={`border-line p-4 ${i % 2 === 0 ? 'border-r' : ''} ${i < 4 ? 'border-b' : ''}`}><dt className="text-[12px] text-umber">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
                    ))}
                  </dl>
                </div>
                <div className="border border-ink p-5"><h2 className="text-[18px] font-semibold wide">Ask the landlord</h2><p className="mb-4 mt-1 text-[14px] text-umber">Phone numbers are not shown publicly. Send your number and the landlord gets in touch.</p><Inquiry id={l.id} label={l.label} /></div>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
