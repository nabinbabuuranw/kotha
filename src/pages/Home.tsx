import { useEffect, useState, type FormEvent } from 'react';
import { Link, navigate } from '../lib/router';
import { useApi } from '../lib/useApi';
import type { Listing } from '../lib/api';
import { LOCALITIES, UNIT_KINDS, KIND_LABEL } from '../../shared/rent';
import { PublicHeader, Footer } from '../components/PublicHeader';
import { ListingCard, ListingCardSkeleton } from '../components/ListingCard';
import { Reveal } from '../components/Reveal';
import { DimRule, ErrorBox, Tag, Select, Input } from '../components/ui';
import { Icon } from '../components/Icons';
import { DemoButtons } from '../components/DemoButtons';
import { rs } from '../lib/format';

function HeroPlan() {
  // A large floor plan that draws itself; the dimension strings fade in after.
  return (
    <svg viewBox="0 0 520 360" className="draw h-full w-full" aria-hidden="true">
      <rect x="20" y="20" width="480" height="300" fill="none" stroke="#22333B" strokeWidth="5" style={{ ['--len' as any]: 1600 }} />
      <path d="M20 160 H230 M230 20 V110 M230 150 V320 M330 160 H500 M330 160 V320 M230 230 H330" stroke="#22333B" strokeWidth="2.5" fill="none" style={{ ['--len' as any]: 900, ['--d' as any]: '.35s' }} />
      <rect x="232" y="22" width="266" height="136" fill="rgba(198,172,143,.32)" stroke="none" className="fade-late" style={{ ['--d' as any]: '1.2s' }} />
      <path d="M230 110 A40 40 0 0 1 270 150" fill="none" stroke="#7A5A2E" strokeWidth="1.5" style={{ ['--len' as any]: 80, ['--d' as any]: '1s' }} />
      <path d="M90 320 A36 36 0 0 0 126 284" fill="none" stroke="#7A5A2E" strokeWidth="1.5" style={{ ['--len' as any]: 70, ['--d' as any]: '1.1s' }} />
      <path d="M330 200 A30 30 0 0 1 360 230" fill="none" stroke="#7A5A2E" strokeWidth="1.5" style={{ ['--len' as any]: 60, ['--d' as any]: '1.15s' }} />
      <g className="fade-late" style={{ ['--d' as any]: '1.5s' }} fill="#5E503F" fontFamily="Archivo" fontSize="12" letterSpacing="1.6">
        <text x="125" y="95" textAnchor="middle">BED 12'×11'</text><text x="365" y="95" textAnchor="middle">LIVING 16'×12'</text>
        <text x="125" y="245" textAnchor="middle">BED 11'×10'</text><text x="280" y="200" textAnchor="middle">WC</text><text x="415" y="245" textAnchor="middle">KITCHEN</text><text x="280" y="280" textAnchor="middle">HALL</text>
      </g>
      <g className="fade-late" style={{ ['--d' as any]: '1.7s' }} stroke="#7A5A2E" strokeWidth="1">
        <path d="M20 345 H500 M20 338 V352 M500 338 V352" /><path d="M505 20 V320" strokeDasharray="0" /><path d="M498 20 H512 M498 320 H512" />
      </g>
      <g className="fade-late" style={{ ['--d' as any]: '1.8s' }} fill="#7A5A2E" fontFamily="Archivo" fontSize="11" letterSpacing="1.2">
        <rect x="236" y="337" width="48" height="16" fill="#F3EDE5" /><text x="260" y="349" textAnchor="middle">38'-0"</text>
      </g>
    </svg>
  );
}

function SearchConsole() {
  const [loc, setLoc] = useState(''); const [kind, setKind] = useState(''); const [max, setMax] = useState('');
  const go = (e: FormEvent) => { e.preventDefault(); const p = new URLSearchParams(); if (loc) p.set('locality', loc); if (kind) p.set('kind', kind); if (max) p.set('max', max); navigate('/rooms' + (p.toString() ? '?' + p : '')); };
  return (
    <form onSubmit={go} className="grid grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_auto] border border-ink bg-[#FBF8F4]" role="search" aria-label="Search rentals">
      <label className="col-span-2 md:col-span-1 border-b md:border-b-0 md:border-r border-ink px-4 py-2.5"><span className="eyebrow block">Where</span>
        <Select value={loc} onChange={(e) => setLoc(e.target.value)} className="!h-9 !border-0 !bg-transparent !px-0 font-semibold" aria-label="Locality"><option value="">Anywhere in the Valley</option>{LOCALITIES.map((l) => <option key={l}>{l}</option>)}</Select></label>
      <label className="border-r border-ink px-4 py-2.5"><span className="eyebrow block">Type</span>
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="!h-9 !border-0 !bg-transparent !px-0 font-semibold" aria-label="Type"><option value="">Any</option>{UNIT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</Select></label>
      <label className="px-4 py-2.5 md:border-r border-ink"><span className="eyebrow block">Max rent (Rs)</span>
        <Input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ''))} placeholder="e.g. 15000" className="!h-9 !border-0 !bg-transparent !px-0 font-semibold" aria-label="Maximum rent" /></label>
      <button className="btn-primary col-span-2 md:col-span-1 !h-auto min-h-[56px] !border-0 px-7 text-[16px]"><Icon name="search" />Search</button>
    </form>
  );
}

function Elevation() {
  // A1: a building drawn as an elevation; each window is a unit (filled = rented, hatched = listed, empty = vacant).
  const floors = [['o', 'l'], ['o', 'o'], ['v', 'l'], ['o', 'o']];
  return (
    <svg viewBox="0 0 220 200" className="w-full max-w-[260px]" role="img" aria-label="Example building elevation: 8 units, 5 rented, 2 listed, 1 vacant">
      <defs><pattern id="h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#22333B" strokeWidth="1.2" /></pattern></defs>
      <path d="M30 40 L110 12 L190 40" fill="none" stroke="#22333B" strokeWidth="2" /><rect x="30" y="40" width="160" height="150" fill="none" stroke="#22333B" strokeWidth="2" />
      {floors.map((f, i) => f.map((u, j) => <rect key={`${i}${j}`} x={50 + j * 70} y={52 + i * 34} width="50" height="24" fill={u === 'o' ? '#22333B' : u === 'l' ? 'url(#h)' : 'none'} stroke="#22333B" strokeWidth="1.2" />))}
      <line x1="10" y1="190" x2="210" y2="190" stroke="#22333B" strokeWidth="2" />
    </svg>
  );
}

const MONTHS = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Asoj'];
function MiniLedger() {
  // Interactive specimen: tap a month to mark it paid and watch the running balance.
  const [rent, setRent] = useState(15000); const [paid, setPaid] = useState<boolean[]>([true, true, true, false, false, false]);
  const due = paid.filter((p) => !p).length * rent;
  return (
    <div className="border border-ink bg-[#FBF8F4]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-4 py-3">
        <p className="text-[14px] font-semibold wide">Specimen rent book · tap a month</p>
        <label className="flex items-center gap-2 text-[13px] text-umber">Rent Rs<input type="range" min={5000} max={40000} step={500} value={rent} onChange={(e) => setRent(+e.target.value)} className="accent-[#22333B]" aria-label="Monthly rent" /><span className="num w-16 font-semibold text-ink">{rent.toLocaleString('en-IN')}</span></label>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6">
        {MONTHS.map((m, i) => (
          <button key={m} onClick={() => setPaid(paid.map((p, j) => (j === i ? !p : p)))} aria-pressed={paid[i]}
            className={`border-b sm:border-b-0 border-r border-line px-3 py-4 text-left transition-colors ${paid[i] ? 'bg-slate text-plaster' : 'hover:bg-bone'}`}>
            <span className="block text-[12px] opacity-80">{m} 2083</span><span className="mt-1 block text-[13px] font-semibold">{paid[i] ? 'Paid' : 'Due'}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-ink px-4 py-3"><span className="text-[13px] text-umber">Outstanding</span><span className={`display num text-[24px] ${due ? 'text-due' : 'text-paid'}`}>{due ? rs(due * 100) : 'Nil'}</span></div>
    </div>
  );
}

const FAQ: [string, string][] = [
  ['Is Kotha free for renters?', 'Yes. Searching and sending an inquiry is free and needs no account. Kotha takes no commission from either side.'],
  ['Who posts the listings?', 'Landlords post their own units from the landlord desk. Listings marked Demo are sample data so you can try the search; they are not real homes.'],
  ['Why plan sketches instead of photos?', 'Each listing shows a simple plan drawn from its type, so the page never shows a photo that is not of that home. Photo upload is on the list for a later version.'],
  ['How do tenants log in?', 'The landlord adds a tenant and gets an 8-character code. The tenant creates a free account and enters the code to see their rent statement, receipts and repair requests.'],
  ['Does it work with Nepali months?', 'Yes. The rent book runs on Bikram Sambat months (Baisakh to Chaitra), and every receipt shows the BS and AD date.'],
  ['Is a Kotha receipt a tax invoice?', 'No. It is a rent receipt between landlord and tenant. Landlords should keep their own records for rental income tax.'],
];

export default function Home() {
  const { data, error, loading, reload } = useApi<{ items: Listing[]; total: number; localities: { locality: string; n: number }[] }>('/listings?sort=new');
  useEffect(() => { if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 60); }, []);
  return (
    <>
      <PublicHeader />
      <main id="main" className="page-in">
        {/* HERO: headline across the sheet, live plan drawing, search console on the baseline */}
        <section className="relative overflow-hidden border-b border-ink">
          <div className="mx-auto grid max-w-sheet gap-8 px-5 pt-10 pb-8 lg:grid-cols-12 lg:px-8 lg:pt-16">
            <div className="lg:col-span-7">
              <p className="eyebrow">Kathmandu Valley · rooms, flats and shutters</p>
              <h1 className="display mt-4 text-[52px] sm:text-[76px] lg:text-[96px]">Find a room.<br /><span className="text-ochre">Keep the</span> rent book.</h1>
              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-umber">Kotha (<span className="deva">कोठा</span>) lists rentals posted by the people who own them, then gives those landlords a proper desk: a monthly rent ledger in Nepali months, printable receipts, tenant logins and repair requests.</p>
            </div>
            <div className="relative lg:col-span-5"><div className="mx-auto aspect-[52/36] w-full max-w-[520px] lg:mt-6"><HeroPlan /></div>
              <p className="mt-2 text-right text-[11.5px] text-umber">Fig. 1 · a typical 2BHK, not to scale</p></div>
          </div>
          <div className="mx-auto max-w-sheet px-5 pb-10 lg:px-8"><SearchConsole /></div>
        </section>

        {/* LATEST LISTINGS */}
        <section className="mx-auto max-w-sheet px-5 py-14 lg:px-8">
          <DimRule n="01" label="On Kotha now" />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="display text-[34px] sm:text-[44px]">Recently listed</h2>
            <Link to="/rooms" className="btn-ghost">See every listing <Icon name="arrow" size={18} /></Link>
          </div>
          {data && data.localities.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">{data.localities.map((l) => <Link key={l.locality} to={`/rooms?locality=${encodeURIComponent(l.locality)}`} className="chip hover:border-slate">{l.locality} <span className="num text-umber">{l.n}</span></Link>)}</div>
          )}
          <div className="mt-6 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {loading && Array.from({ length: 4 }, (_, i) => <div key={i} className="w-[78vw] max-w-[300px] shrink-0 snap-start lg:w-auto lg:max-w-none"><ListingCardSkeleton /></div>)}
            {data?.items.slice(0, 4).map((l) => <div key={l.id} className="w-[78vw] max-w-[300px] shrink-0 snap-start lg:w-auto lg:max-w-none"><ListingCard l={l} /></div>)}
          </div>
          {error && <ErrorBox text={error} onRetry={() => reload()} />}
          {data && data.items.some((x) => x.is_demo) && <p className="mt-2 text-[13px] text-umber">Listings tagged <Tag tone="demo">Demo</Tag> are sample data for trying Kotha.</p>}
        </section>

        {/* FOR LANDLORDS: four drawing sheets */}
        <section id="landlords" className="scroll-mt-20 border-y border-ink bg-bone ruled">
          <div className="mx-auto grid max-w-sheet gap-10 px-5 py-16 lg:grid-cols-12 lg:px-8">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <DimRule n="02" label="For landlords" />
                <h2 className="display mt-8 text-[38px] sm:text-[50px]">A desk for the whole building.</h2>
                <p className="mt-5 text-[16px] leading-relaxed text-umber">Most landlords in the Valley keep rent in a notebook and receipts in a carbon pad. Kotha keeps the same things, adds the sums, and lets your tenants see their own page.</p>
                <div className="mt-7 flex flex-wrap gap-3"><Link to="/register?role=landlord" className="btn-primary">Start free</Link><DemoButtons compact /></div>
              </div>
            </div>
            <div className="space-y-6 lg:col-span-8">
              {[
                { n: 'A1', t: 'Properties and units', d: 'Add a house, its floors and every room, flat or shutter in it. See at a glance what is rented, listed or empty.', el: <Elevation /> },
                { n: 'A2', t: 'Monthly rent ledger', d: 'One click charges every tenant for the Nepali month. Add electricity or water from the sub-meter, record cash, bank, eSewa or Khalti payments.', el: <MiniLedger /> },
                { n: 'A3', t: 'Printable receipts', d: 'Every payment gets a numbered receipt with BS and AD dates and the amount in words. Print it, save it as PDF or send the link on WhatsApp.', el: (
                  <div className="mx-auto w-full max-w-[340px] border border-ink bg-[#FBF8F4] p-4 text-[12.5px]"><div className="flex justify-between border-b-2 border-ink pb-2"><span className="eyebrow">Rent receipt</span><span className="num font-semibold">KT-2083-0014</span></div>
                    <div className="flex justify-between border-b border-line py-1.5"><span className="text-umber">Received from</span><span>Tenant name</span></div><div className="flex justify-between border-b border-line py-1.5"><span className="text-umber">For</span><span>Rent, Kartik 2083</span></div>
                    <p className="display num mt-2 text-[24px]">Rs 17,000</p><p className="italic text-umber">Rupees Seventeen Thousand Only</p></div>) },
                { n: 'A4', t: 'Tenant logins and repairs', d: 'Tenants raise a leaking tap or a dead socket from their phone. You move it from Open to In progress to Resolved, with notes they can read.', el: (
                  <ol className="mx-auto w-full max-w-[340px] border-l-2 border-slate pl-5 text-[13.5px]">
                    {[['Open', 'Kitchen tap leaking', 'Tenant · 9:12 am'], ['In progress', 'Plumber booked for tomorrow', 'Landlord · 11:40 am'], ['Resolved', 'Washer replaced', 'Landlord · next day']].map(([s, n, w], i) => (
                      <li key={i} className="relative pb-4"><span className={`absolute -left-[27px] top-1 h-3 w-3 border-2 border-slate ${i === 2 ? 'bg-slate' : 'bg-bone'}`} /><Tag tone={['open', 'in_progress', 'resolved'][i]}>{s}</Tag><p className="mt-1 font-medium">{n}</p><p className="text-[12px] text-umber">{w}</p></li>
                    ))}
                  </ol>) },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 40}>
                  <article className="grid border border-ink bg-plaster md:grid-cols-[1fr_1.1fr]">
                    <div className="border-b md:border-b-0 md:border-r border-ink p-6"><p className="eyebrow">Sheet {s.n}</p><h3 className="display mt-2 text-[26px]">{s.t}</h3><p className="mt-3 text-[15px] leading-relaxed text-umber">{s.d}</p></div>
                    <div className="flex items-center justify-center p-6">{s.el}</div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING: a schedule, not a tier grid */}
        <section id="pricing" className="scroll-mt-20 mx-auto max-w-sheet px-5 py-16 lg:px-8">
          <DimRule n="03" label="Pricing" />
          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4"><h2 className="display text-[38px] sm:text-[48px]">Free for renters. Free for a small building.</h2>
              <p className="mt-4 text-[15px] text-umber">Landlord Pro is for owners with more than five units. Online checkout is not built yet: Pro is switched on by the Kotha team after an eSewa or bank payment.</p></div>
            <div className="overflow-x-auto lg:col-span-8">
              <table className="tbl min-w-[520px] border border-ink bg-[#FBF8F4]">
                <thead><tr><th className="w-1/2">Schedule of features</th><th>Free</th><th className="!text-slate">Landlord Pro</th></tr></thead>
                <tbody>
                  <tr><td className="text-umber">Price</td><td><span className="display num text-[22px]">Rs 0</span></td><td><span className="display num text-[22px]">Rs 699</span><span className="text-umber"> /month</span><br /><span className="text-[12.5px] text-umber">or Rs 6,990 a year</span></td></tr>
                  {[['Units (rooms, flats, shutters)', 'Up to 5', 'Unlimited'], ['Public listings + inquiries', 'Yes', 'Yes'], ['Monthly rent ledger (BS months)', 'Yes', 'Yes'], ['Numbered printable receipts', 'Yes', 'Yes'], ['Tenant logins + repair requests', 'Yes', 'Yes'], ['Properties', 'Up to 50', 'Up to 50'], ['Support', 'Email', 'WhatsApp, same day']].map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td className="font-medium">{c}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ: drawing notes */}
        <section id="faq" className="scroll-mt-20 border-t border-ink">
          <div className="mx-auto max-w-sheet px-5 py-16 lg:px-8">
            <DimRule n="04" label="Notes" />
            <div className="mt-8 grid gap-x-10 md:grid-cols-2">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="group border-b border-line py-4">
                  <summary className="flex cursor-pointer list-none items-start gap-4 text-[17px] font-semibold"><span className="eyebrow mt-1 w-8 shrink-0">N{i + 1}</span><span className="flex-1">{q}</span><Icon name="plus" size={18} className="mt-1 transition-transform group-open:rotate-45" /></summary>
                  <p className="mt-2 pl-12 text-[15px] leading-relaxed text-umber">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate text-plaster">
          <div className="mx-auto flex max-w-sheet flex-col gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between lg:px-8">
            <div><p className="eyebrow !text-tan">Try it now</p><h2 className="display mt-2 text-[34px] sm:text-[46px]">Walk through a sample building.</h2><p className="mt-2 max-w-xl text-tan">The demo desk has ten sample units, three sample tenants and four months of rent. It resets every few hours.</p></div>
            <DemoButtons light />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
