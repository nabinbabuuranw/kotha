import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { rs } from '../../lib/format';
import { Brand, ErrorBox, Skeleton, Tag, Empty } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icons';
import { ReceiptDoc } from '../../components/ReceiptDoc';
import type { Receipt } from '../../lib/api';
const Properties = lazy(() => import('./Properties'));
const Tenants = lazy(() => import('./Tenants'));
const Ledger = lazy(() => import('./Ledger'));
const Requests = lazy(() => import('./Requests'));
const Inquiries = lazy(() => import('./Inquiries'));
const Settings = lazy(() => import('../Settings'));

const SHEETS: { to: string; n: string; label: string; icon: IconName }[] = [
  { to: '/app', n: 'A1', label: 'Overview', icon: 'plan' }, { to: '/app/properties', n: 'A2', label: 'Properties', icon: 'building' },
  { to: '/app/tenants', n: 'A3', label: 'Tenants', icon: 'users' }, { to: '/app/ledger', n: 'A4', label: 'Rent ledger', icon: 'ledger' },
  { to: '/app/requests', n: 'A5', label: 'Repairs', icon: 'wrench' }, { to: '/app/inquiries', n: 'A6', label: 'Inquiries', icon: 'inbox' },
  { to: '/app/settings', n: 'A7', label: 'Settings', icon: 'settings' },
];

export function DeskHeader({ sheets, who }: { sheets: typeof SHEETS; who: string }) {
  const { path } = useLocation(); const { user, logout } = useAuth();
  const strip = useRef<HTMLDivElement>(null);
  const p2 = path.startsWith('/app/receipt') ? '/app/ledger' : path.startsWith('/home/receipt') ? '/home' : path;
  const active = sheets.reduce((best, s, i) => (p2 === s.to || p2.startsWith(s.to + '/') ? (s.to.length > (sheets[best]?.to.length ?? -1) || best < 0 ? i : best) : best), -1);
  useEffect(() => { (strip.current?.querySelector('[aria-current="page"]') as HTMLElement | null)?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [path]);
  return (
    <header className="no-print sticky top-0 z-30 border-b border-ink bg-plaster">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3"><Brand to={sheets[0].to} /><span className="hidden sm:inline text-umber">/</span><span className="hidden sm:inline text-[14px] font-medium">{who}</span>{user?.is_demo ? <Tag tone="demo">Demo data</Tag> : null}</div>
        <div className="flex items-center gap-1"><span className="hidden md:inline text-[13.5px] text-umber mr-2">{user?.name}</span>
          <button className="btn-quiet btn-sm" onClick={async () => { await logout(); location.href = '/'; }}><Icon name="logout" size={18} /><span className="hidden sm:inline">Sign out</span></button></div>
      </div>
      {/* sheet index: a row of title-block cells; scrolls sideways on phones */}
      <nav ref={strip} className="flex overflow-x-auto border-t border-ink [scrollbar-width:none]" aria-label="Desk sections">
        {sheets.map((s, i) => (
          <Link key={s.to} to={s.to} aria-current={i === active ? 'page' : undefined}
            className={`group relative flex shrink-0 md:shrink md:flex-1 items-center gap-2.5 border-r border-ink px-3.5 py-2.5 transition-colors last:border-r-0 ${i === active ? 'bg-slate text-plaster' : 'hover:bg-bone'}`}>
            <span className={`num text-[11px] font-semibold tracking-[.1em] ${i === active ? 'text-tan' : 'text-umber'}`}>{s.n}</span>
            <Icon name={s.icon} size={18} /><span className="text-[14px] font-medium whitespace-nowrap">{s.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

function Stat({ k, v, sub, tone }: { k: string; v: ReactNode; sub?: ReactNode; tone?: string }) {
  return <div className="border-r border-b border-line p-4"><p className="text-[12.5px] text-umber">{k}</p><p className={`display num mt-1 text-[22px] sm:text-[28px] ${tone || ''}`}>{v}</p>{sub && <p className="text-[12.5px] text-umber">{sub}</p>}</div>;
}

type OverviewData = { month: string; month_label: string; counts: any; dues: any[]; recent: any[]; trend: { month: string; label: string; charged: number; collected: number }[] };
function Overview() {
  const { data, error, loading, reload } = useApi<OverviewData>('/l/overview');
  const props = useApi<{ items: any[] }>('/l/units');
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />;
  if (loading || !data) return <div className="space-y-4"><Skeleton className="h-28" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div>;
  const c = data.counts; const pct = c.charged ? Math.min(100, Math.round((c.collected / c.charged) * 100)) : 0;
  const max = Math.max(1, ...data.trend.map((t) => Math.max(t.charged, t.collected)));
  const byProp: Record<string, any[]> = {}; for (const u of props.data?.items || []) (byProp[u.property_name] ||= []).push(u);
  return (
    <div className="space-y-8">
      <section className="border border-ink bg-[#FBF8F4]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink px-5 py-4">
          <div><p className="eyebrow">Rent for {data.month_label}</p><p className="mt-1"><span className="display num text-[40px]">{rs(c.collected)}</span><span className="text-umber"> collected of {rs(c.charged)} charged</span></p></div>
          {c.not_charged > 0 && <Link to="/app/ledger" className="btn-primary btn-sm"><Icon name="ledger" size={16} />Charge {c.not_charged} tenant{c.not_charged > 1 ? 's' : ''} for {data.month_label.split(' ')[0]}</Link>}
        </div>
        {/* scale-ruler meter */}
        <div className="px-5 py-5">
          <div className="relative h-8 border border-ink bg-plaster">
            <div className="grow-x absolute inset-y-0 left-0 bg-slate" style={{ width: pct + '%' }} />
            {Array.from({ length: 11 }, (_, i) => <span key={i} className="absolute bottom-0 h-2 border-l border-ink/50" style={{ left: i * 10 + '%' }} />)}
          </div>
          <div className="mt-1.5 flex justify-between text-[11.5px] text-umber num"><span>0%</span><span>{pct}% collected</span><span>100%</span></div>
        </div>
        <div className="grid grid-cols-2 border-t border-line md:grid-cols-4">
          <Stat k="Units" v={c.units} sub={`${c.occupied} rented · ${c.listed} listed`} />
          <Stat k="Owed to you (all months)" v={rs(Math.max(0, c.outstanding))} tone={c.outstanding > 0 ? 'text-due' : ''} />
          <Stat k="Open repairs" v={c.open_requests} sub={<Link to="/app/requests" className="underline">See requests</Link>} />
          <Stat k="New inquiries" v={c.new_inquiries} sub={<Link to="/app/inquiries" className="underline">Open inbox</Link>} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="eyebrow mb-3">Occupancy elevation</h2>
          {props.loading ? <Skeleton className="h-56" /> : Object.keys(byProp).length === 0 ? (
            <Empty title="No units yet" action={<Link to="/app/properties" className="btn-primary">Add your first property</Link>}>Add a property and its rooms or flats to see them here.</Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(byProp).map(([name, units]) => (
                <div key={name} className="border border-ink bg-[#FBF8F4] p-4">
                  <p className="text-[15px] font-semibold">{name}</p><p className="text-[12.5px] text-umber">{units[0].locality}</p>
                  <div className="mt-3 border-x-2 border-b-2 border-slate">
                    {Array.from(new Set(units.map((u) => u.floor))).sort((a, b) => b - a).map((fl) => (
                      <div key={fl} className="flex gap-1.5 border-t border-slate/40 p-1.5">
                        <span className="w-6 shrink-0 self-center text-[10px] text-umber num">{fl === 0 ? 'G' : fl}</span>
                        {units.filter((u) => u.floor === fl).map((u) => (
                          <Link key={u.id} to="/app/properties" title={`${u.label}: ${u.tenant_name ? 'rented to ' + u.tenant_name : u.listed ? 'listed' : 'vacant'}`}
                            className={`h-7 flex-1 border border-slate ${u.tenant_name ? 'bg-slate' : u.listed ? 'hatch' : 'bg-plaster'}`}><span className="sr-only">{u.label}</span></Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4 text-[12px] text-umber sm:col-span-2"><span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 bg-slate" />Rented</span><span className="inline-flex items-center gap-1.5"><span className="hatch h-3 w-5 border border-slate" />Listed</span><span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 border border-slate" />Vacant</span></div>
            </div>
          )}
        </section>
        <section className="lg:col-span-5 space-y-8">
          <div>
            <h2 className="eyebrow mb-3">Who owes rent</h2>
            {data.dues.length === 0 ? <p className="border border-line p-4 text-[14.5px] text-umber">Nobody owes anything right now.</p> : (
              <ul className="border-t border-ink">{data.dues.map((d) => (
                <li key={d.tenancy_id} className="flex items-center justify-between gap-3 border-b border-line py-3">
                  <div><p className="font-medium">{d.tenant_name}</p><p className="text-[12.5px] text-umber">{d.unit_label} · {d.property_name}</p></div>
                  <div className="text-right"><p className="num font-semibold text-due">{rs(d.balance)}</p><Link to="/app/ledger" className="text-[12.5px] underline">Record payment</Link></div>
                </li>))}</ul>
            )}
          </div>
          <div>
            <h2 className="eyebrow mb-3">Six months, charged vs collected</h2>
            <div className="flex h-40 items-end gap-3 border-b border-ink px-1" role="img" aria-label="Bar chart of rent charged and collected for the last six months">
              {data.trend.map((t, i) => (
                <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-32 w-full items-end justify-center gap-1">
                    <span className="grow-y w-1/3 border border-slate bg-plaster" style={{ height: `${(t.charged / max) * 100}%`, ['--d' as any]: `${i * 60}ms` }} title={`Charged ${rs(t.charged)}`} />
                    <span className="grow-y w-1/3 bg-slate" style={{ height: `${(t.collected / max) * 100}%`, ['--d' as any]: `${i * 60 + 30}ms` }} title={`Collected ${rs(t.collected)}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-3 px-1">{data.trend.map((t) => <span key={t.month} className="flex-1 text-center text-[11px] text-umber">{t.label}</span>)}</div>
            <div className="mt-2 flex gap-4 text-[12px] text-umber"><span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 border border-slate" />Charged</span><span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 bg-slate" />Collected</span></div>
          </div>
          {data.recent.length > 0 && <div><h2 className="eyebrow mb-3">Latest receipts</h2><ul className="border-t border-ink">{data.recent.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-line py-2.5 text-[14px]"><Link to={`/app/receipt/${p.id}`} className="underline underline-offset-2 num">{p.receipt_no}</Link><span>{p.tenant_name}</span><span className="num font-medium">{rs(p.amount)}</span></li>))}</ul></div>}
        </section>
      </div>
    </div>
  );
}

function ReceiptView({ id }: { id: string }) {
  const { data, error, loading } = useApi<{ receipt: Receipt }>(`/l/payments/${id}`);
  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3"><Link to="/app/ledger" className="btn-quiet btn-sm -ml-2"><Icon name="back" size={16} />Rent ledger</Link>
        {data && <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/r/${data.receipt.token}`); }}><Icon name="copy" size={16} />Copy tenant link</button><button className="btn-primary btn-sm" onClick={() => window.print()}><Icon name="print" size={16} />Print</button></div>}</div>
      {loading && <Skeleton className="h-[420px]" />}{error && <ErrorBox text={error} />}{data && <ReceiptDoc r={data.receipt} />}
    </div>
  );
}

export default function LandlordApp() {
  const { path } = useLocation();
  const sub = path.split('/')[2] || '';
  const titles: Record<string, string> = { '': 'Overview', properties: 'Properties', tenants: 'Tenants', ledger: 'Rent ledger', requests: 'Repairs', inquiries: 'Inquiries', settings: 'Settings', receipt: 'Receipt' };
  useEffect(() => { document.title = `${titles[sub] || 'Desk'} · Kotha landlord desk`; }, [sub]);
  let body: JSX.Element;
  if (sub === '') body = <Overview />;
  else if (sub === 'properties') body = <Properties />;
  else if (sub === 'tenants') body = <Tenants />;
  else if (sub === 'ledger') body = <Ledger />;
  else if (sub === 'requests') body = <Requests />;
  else if (sub === 'inquiries') body = <Inquiries />;
  else if (sub === 'settings') body = <Settings />;
  else if (sub === 'receipt' && path.split('/')[3]) body = <ReceiptView id={path.split('/')[3]} />;
  else body = <Empty title="Not on this desk"><Link to="/app" className="underline">Back to overview</Link></Empty>;
  return (
    <div className="min-h-screen">
      <DeskHeader sheets={SHEETS} who="Landlord desk" />
      <main key={sub} className="page-in mx-auto max-w-sheet px-4 py-6 lg:px-6 lg:py-8">
        {sub !== 'receipt' && <div className="no-print mb-6 flex items-baseline justify-between border-b border-ink pb-3"><h1 className="display text-[30px] sm:text-[38px]">{titles[sub] || ''}</h1><span className="eyebrow">{SHEETS.find((s) => s.to === (sub ? '/app/' + sub : '/app'))?.n}</span></div>}
        <Suspense fallback={<Skeleton className="h-64" />}>{body}</Suspense>
      </main>
    </div>
  );
}
