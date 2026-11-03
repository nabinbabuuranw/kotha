import { useEffect, useState } from 'react';
import { navigate, useLocation, Link } from '../lib/router';
import { useApi } from '../lib/useApi';
import type { Listing } from '../lib/api';
import { LOCALITIES, UNIT_KINDS, KIND_LABEL, SUITED, SUITED_LABEL } from '../../shared/rent';
import { PublicHeader, Footer } from '../components/PublicHeader';
import { ListingCard, ListingCardSkeleton } from '../components/ListingCard';
import { ErrorBox, Select, Input, Check, Modal, Tag } from '../components/ui';
import { Icon } from '../components/Icons';

type Res = { items: Listing[]; total: number; page: number; pages: number; localities: { locality: string; n: number }[] };
const KEYS = ['q', 'locality', 'kind', 'min', 'max', 'furnished', 'parking', 'water', 'bath', 'suited', 'sort', 'page'] as const;
const LABEL: Record<string, (v: string) => string> = {
  q: (v) => `"${v}"`, locality: (v) => v, kind: (v) => (KIND_LABEL as any)[v] || v, min: (v) => `From Rs ${Number(v).toLocaleString('en-IN')}`, max: (v) => `Up to Rs ${Number(v).toLocaleString('en-IN')}`,
  furnished: (v) => ({ none: 'Unfurnished', semi: 'Semi-furnished', full: 'Furnished' } as any)[v], parking: (v) => (v === 'car' ? 'Car parking' : 'Bike parking'), water: () => '24h water', bath: () => 'Attached bath', suited: (v) => SUITED_LABEL[v],
};

function Filters({ f, set }: { f: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <div className="space-y-5">
      <label className="block"><span className="field-label">Keyword</span><Input defaultValue={f.q || ''} placeholder="balcony, near TU…" onKeyDown={(e) => { if (e.key === 'Enter') set('q', (e.target as HTMLInputElement).value.trim()); }} onBlur={(e) => e.target.value.trim() !== (f.q || '') && set('q', e.target.value.trim())} /></label>
      <label className="block"><span className="field-label">Locality</span><Select value={f.locality || ''} onChange={(e) => set('locality', e.target.value)}><option value="">Anywhere</option>{LOCALITIES.map((l) => <option key={l}>{l}</option>)}</Select></label>
      <fieldset><legend className="field-label">Type</legend><div className="flex flex-wrap gap-1.5">
        {UNIT_KINDS.map((k) => <button type="button" key={k} className="chip" aria-pressed={f.kind === k} onClick={() => set('kind', f.kind === k ? '' : k)}>{KIND_LABEL[k]}</button>)}</div></fieldset>
      <fieldset><legend className="field-label">Monthly rent (Rs)</legend><div className="grid grid-cols-2 gap-2">
        <Input inputMode="numeric" aria-label="Minimum rent" placeholder="Min" defaultValue={f.min || ''} onBlur={(e) => set('min', e.target.value.replace(/\D/g, ''))} />
        <Input inputMode="numeric" aria-label="Maximum rent" placeholder="Max" defaultValue={f.max || ''} onBlur={(e) => set('max', e.target.value.replace(/\D/g, ''))} /></div></fieldset>
      <label className="block"><span className="field-label">Furnishing</span><Select value={f.furnished || ''} onChange={(e) => set('furnished', e.target.value)}><option value="">Any</option><option value="none">Unfurnished</option><option value="semi">Semi-furnished</option><option value="full">Furnished</option></Select></label>
      <label className="block"><span className="field-label">Parking</span><Select value={f.parking || ''} onChange={(e) => set('parking', e.target.value)}><option value="">Not needed</option><option value="bike">At least bike</option><option value="car">Car</option></Select></label>
      <label className="block"><span className="field-label">Suits</span><Select value={f.suited || ''} onChange={(e) => set('suited', e.target.value)}><option value="">Anyone</option>{SUITED.filter((s) => s !== 'anyone').map((s) => <option key={s} value={s}>{SUITED_LABEL[s]}</option>)}</Select></label>
      <div className="space-y-2.5"><Check label="24-hour water" checked={f.water === '1'} onChange={(e) => set('water', e.target.checked ? '1' : '')} /><br /><Check label="Attached bathroom" checked={f.bath === '1'} onChange={(e) => set('bath', e.target.checked ? '1' : '')} /></div>
    </div>
  );
}

export default function Rooms() {
  const { search } = useLocation();
  const f: Record<string, string> = Object.fromEntries(new URLSearchParams(search));
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(search); if (v) p.set(k, v); else p.delete(k); if (k !== 'page') p.delete('page');
    navigate('/rooms' + (p.toString() ? '?' + p : ''), { replace: k !== 'page' });
  };
  const qs = new URLSearchParams(KEYS.flatMap((k) => (f[k] ? [[k, f[k]]] : []))).toString();
  const { data, error, loading, reload } = useApi<Res>('/listings' + (qs ? '?' + qs : ''));
  const [sheet, setSheet] = useState(false);
  const active = KEYS.filter((k) => !['sort', 'page'].includes(k) && f[k]);
  useEffect(() => { document.title = 'Find a room · Kotha'; }, []);
  return (
    <>
      <PublicHeader />
      <main className="page-in mx-auto max-w-sheet px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
          <div><p className="eyebrow">Listings · Kathmandu Valley</p><h1 className="display mt-2 text-[38px] sm:text-[52px]">Find a room</h1></div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost lg:hidden" onClick={() => setSheet(true)}><Icon name="settings" size={18} />Filters{active.length ? ` (${active.length})` : ''}</button>
            <label className="flex items-center gap-2 text-[14px] text-umber">Sort<Select value={f.sort || 'new'} onChange={(e) => set('sort', e.target.value === 'new' ? '' : e.target.value)} className="!h-10 w-[170px]" aria-label="Sort"><option value="new">Newest first</option><option value="rent_asc">Rent: low to high</option><option value="rent_desc">Rent: high to low</option></Select></label>
          </div>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block"><div className="sticky top-24 border border-line bg-[#F8F3EC] p-5"><p className="eyebrow mb-4">Filters</p><Filters key={search} f={f} set={set} /></div></aside>
          <section aria-live="polite">
            <div className="mb-4 flex min-h-[32px] flex-wrap items-center gap-2">
              <p className="mr-2 text-[14.5px] text-umber">{loading ? 'Searching…' : data ? <><b className="num text-ink">{data.total}</b> {data.total === 1 ? 'place' : 'places'} to rent</> : ''}</p>
              {active.map((k) => <button key={k} className="chip !bg-bone" onClick={() => set(k, '')} aria-label={`Remove filter ${LABEL[k](f[k])}`}>{LABEL[k](f[k])}<Icon name="close" size={14} /></button>)}
              {active.length > 1 && <button className="btn-quiet btn-sm" onClick={() => navigate('/rooms', { replace: true })}>Clear all</button>}
            </div>
            {error && <ErrorBox text={error} onRetry={() => reload()} />}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading && Array.from({ length: 6 }, (_, i) => <ListingCardSkeleton key={i} />)}
              {!loading && data?.items.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
            {!loading && data && data.items.length === 0 && (
              <div className="border border-dashed border-line px-6 py-12 text-center">
                <Icon name="search" size={30} className="mx-auto text-umber" /><p className="mt-3 text-[18px] font-semibold wide">Nothing matches all of that yet</p>
                <p className="mx-auto mt-1 max-w-md text-[14.5px] text-umber">Try a higher rent, another type, or drop a filter.{data.localities.length ? ' Places listed now:' : ''}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">{data.localities.slice(0, 6).map((l) => <Link key={l.locality} to={`/rooms?locality=${encodeURIComponent(l.locality)}`} className="chip">{l.locality} · {l.n}</Link>)}</div>
                {active.length > 0 && <button className="btn-ghost mt-5" onClick={() => navigate('/rooms', { replace: true })}>Clear filters</button>}
              </div>
            )}
            {data && data.pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pages">
                <button className="btn-ghost btn-sm" disabled={data.page <= 1} onClick={() => set('page', String(data.page - 1))}><Icon name="back" size={16} />Previous</button>
                <span className="num px-3 text-[14px]">Page {data.page} of {data.pages}</span>
                <button className="btn-ghost btn-sm" disabled={data.page >= data.pages} onClick={() => set('page', String(data.page + 1))}>Next<Icon name="arrow" size={16} /></button>
              </nav>
            )}
            {data?.items.some((x) => x.is_demo) && <p className="mt-6 text-[13px] text-umber"><Tag tone="demo">Demo</Tag> listings are sample data for trying Kotha, not real homes.</p>}
          </section>
        </div>
        <Modal open={sheet} onClose={() => setSheet(false)} title="Filters"><Filters f={f} set={set} /><button className="btn-primary mt-6 w-full" onClick={() => setSheet(false)}>Show {data ? data.total : ''} places</button></Modal>
      </main>
      <Footer />
    </>
  );
}
