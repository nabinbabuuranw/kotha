import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from '../lib/router';
import { useApi } from '../lib/useApi';
import { api, errorText, type StatementLine, type MaintRequest, type MaintEvent, type Receipt } from '../lib/api';
import { MAINT_CATEGORIES, MAINT_STATUS_LABEL } from '../../shared/rent';
import { rs, kindLabel, ago, bsLabel } from '../lib/format';
import { DeskHeader } from './app/LandlordApp';
import { StatementTable } from './app/Ledger';
import { Field, Input, Select, Textarea, Modal, ErrorBox, SkeletonRows, Empty, Tag, useToast, Notice, Skeleton } from '../components/ui';
import { Icon } from '../components/Icons';
import { PlanGlyph } from '../components/PlanGlyph';
import { MaintTimeline, CATEGORY } from '../components/MaintTimeline';
import { ReceiptDoc } from '../components/ReceiptDoc';
const Settings = lazy(() => import('./Settings'));

const SHEETS = [{ to: '/home', n: 'T1', label: 'My home', icon: 'door' as const }, { to: '/home/requests', n: 'T2', label: 'Repairs', icon: 'wrench' as const }, { to: '/home/settings', n: 'T3', label: 'Settings', icon: 'settings' as const }];
type Home = { id: number; rent: number; deposit: number; start_date: string; status: string; unit_label: string; unit_kind: string; property_name: string; locality: string; address: string; landlord_name: string; landlord_phone: string | null; is_demo: number; lines: StatementLine[]; balance: number };

function LinkCode({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const submit = async (ev: FormEvent) => { ev.preventDefault(); setBusy(true); setE(null); try { await api('/t/link', { body: { code } }); toast('Linked to your home'); onDone(); } catch (x) { setE(errorText(x)); } finally { setBusy(false); } };
  return (
    <form onSubmit={submit} className="border border-ink bg-[#FBF8F4] p-5">
      <p className="text-[17px] font-semibold wide">Link your home</p><p className="mt-1 text-[14.5px] text-umber">Your landlord gets an 8-character code for you from their Kotha desk. Enter it to see your rent statement and receipts.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Input aria-label="Code from your landlord" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 10))} placeholder="e.g. K7M2QX9P" className="num max-w-[220px] tracking-[.2em] uppercase" /><button className="btn-primary" disabled={busy || code.replace(/[^A-Z0-9]/g, '').length !== 8}>{busy ? 'Linking…' : 'Link'}</button></div>
      {e && <div className="mt-3"><ErrorBox text={e} /></div>}
    </form>
  );
}

function MyHome() {
  const { data, error, loading, reload } = useApi<{ homes: Home[] }>('/t/home');
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />;
  if (loading) return <div className="space-y-4"><Skeleton className="h-48" /><SkeletonRows rows={4} /></div>;
  const homes = data!.homes;
  return (
    <div className="space-y-8">
      {homes.length === 0 && <Empty icon="key" title="No home linked yet">Once you enter your landlord's code, your rent book shows up here.</Empty>}
      {homes.map((h) => (
        <section key={h.id} className="space-y-6">
          {h.is_demo ? <Notice tone="warn">Demo data: this is a sample tenancy for trying Kotha.</Notice> : null}
          <div className="grid border border-ink bg-[#FBF8F4] md:grid-cols-[220px_1fr_260px]">
            <div className="flex items-center justify-center border-b md:border-b-0 md:border-r border-ink p-5"><PlanGlyph kind={h.unit_kind} className="w-full max-w-[180px]" /></div>
            <div className="border-b md:border-b-0 md:border-r border-ink p-5"><p className="eyebrow">{h.status === 'active' ? 'Your home' : 'Past home'}</p><p className="display mt-1 text-[28px]">{h.unit_label}</p>
              <p className="text-[14px] text-umber">{kindLabel(h.unit_kind)} · {h.property_name}, {h.locality}</p><p className="mt-3 text-[14px]">Rent <b className="num">{rs(h.rent)}</b> a month · deposit {rs(h.deposit)} · since {bsLabel(h.start_date)} BS</p>
              <p className="mt-3 text-[14px]">Landlord: <b>{h.landlord_name}</b>{h.landlord_phone && <> · <a className="underline" href={`tel:${h.landlord_phone}`}>{h.landlord_phone}</a></>}</p></div>
            <div className="flex flex-col justify-center p-5"><p className="eyebrow">{h.balance > 0 ? 'You owe' : h.balance < 0 ? 'Advance paid' : 'All settled'}</p><p className={`display num mt-1 text-[38px] ${h.balance > 0 ? 'text-due' : 'text-paid'}`}>{rs(Math.abs(h.balance))}</p>
              {h.status === 'active' && <Link to="/home/requests?new=1" className="btn-ghost btn-sm mt-3"><Icon name="wrench" size={16} />Report a problem</Link>}</div>
          </div>
          <div><h2 className="eyebrow mb-3">Rent statement</h2><div className="border border-ink bg-[#FBF8F4] p-1"><StatementTable lines={h.lines} balance={h.balance} receiptBase="/home/receipt/" /></div></div>
        </section>
      ))}
      <LinkCode onDone={() => reload(true)} />
    </div>
  );
}

function NewRequest({ homes, onDone }: { homes: Home[]; onDone: () => void }) {
  const active = homes.filter((h) => h.status === 'active');
  const [f, setF] = useState({ tenancy_id: active[0]?.id || 0, title: '', category: 'plumbing', priority: 'normal', description: '' });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const submit = async (ev: FormEvent) => { ev.preventDefault(); setBusy(true); setE(null); try { await api('/t/maintenance', { body: f }); toast('Sent to your landlord'); onDone(); } catch (x) { setE(errorText(x)); } finally { setBusy(false); } };
  if (!active.length) return <Notice>Link your home first (on My home), then you can report problems.</Notice>;
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {active.length > 1 && <Field label="Home" className="sm:col-span-2"><Select value={f.tenancy_id} onChange={(e) => setF({ ...f, tenancy_id: Number(e.target.value) })}>{active.map((h) => <option key={h.id} value={h.id}>{h.unit_label} · {h.property_name}</option>)}</Select></Field>}
      <Field label="What is wrong?" className="sm:col-span-2"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Bathroom tap leaking" /></Field>
      <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{MAINT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY[c]}</option>)}</Select></Field>
      <Field label="How urgent?"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="low">Can wait</option><option value="normal">Normal</option><option value="urgent">Urgent (safety, no water)</option></Select></Field>
      <Field label="Details" className="sm:col-span-2"><Textarea required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Since when, where exactly, good times to visit" /></Field>
      {e && <div className="sm:col-span-2"><ErrorBox text={e} /></div>}
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? 'Sending…' : 'Send to landlord'}</button>
    </form>
  );
}
function RequestDetail({ id, onChange }: { id: number; onChange: () => void }) {
  const { data, error, loading, reload } = useApi<{ request: MaintRequest; events: MaintEvent[] }>(`/t/maintenance/${id}`);
  const [note, setNote] = useState(''); const toast = useToast();
  const send = async (close = false) => { try { await api(`/t/maintenance/${id}/comment`, { body: { note, close } }); setNote(''); toast(close ? 'Request closed' : 'Note sent'); reload(true); onChange(); } catch (x) { toast(errorText(x), 'err'); } };
  if (loading) return <SkeletonRows rows={3} />; if (error) return <ErrorBox text={error} />;
  const r = data!.request;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2"><Tag tone={r.status}>{MAINT_STATUS_LABEL[r.status]}</Tag><Tag>{CATEGORY[r.category]}</Tag>{r.priority === 'urgent' && <Tag tone="urgent">Urgent</Tag>}</div>
      <p className="text-[15.5px] whitespace-pre-line">{r.description}</p>
      <MaintTimeline events={data!.events} />
      {r.status !== 'closed' && <div className="space-y-3 border-t border-ink pt-5"><Field label="Add a note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={!note.trim()} onClick={() => send(false)}>Send note</button>{r.status === 'resolved' && <button className="btn-ghost" onClick={() => send(true)}><Icon name="check" size={18} />It is fixed, close it</button>}</div></div>}
    </div>
  );
}
function Requests() {
  const { search } = useLocation();
  const homes = useApi<{ homes: Home[] }>('/t/home'); const list = useApi<{ items: MaintRequest[] }>('/t/maintenance');
  const [modal, setModal] = useState<'new' | MaintRequest | null>(new URLSearchParams(search).get('new') ? 'new' : null);
  if (list.error) return <ErrorBox text={list.error} onRetry={() => list.reload()} />;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-[14.5px] text-umber">Report a problem and follow it until it is fixed.</p><button className="btn-primary" onClick={() => setModal('new')}><Icon name="plus" size={18} />Report a problem</button></div>
      {list.loading ? <SkeletonRows rows={3} /> : list.data!.items.length === 0 ? <Empty icon="wrench" title="No requests yet">Leaks, power, water, a broken latch: tell your landlord here and see each update.</Empty> : (
        <ul className="border-t border-ink">{list.data!.items.map((r) => (
          <li key={r.id}><button className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-line px-1 py-4 text-left hover:bg-bone/60" onClick={() => setModal(r)}>
            <span><span className="block text-[16px] font-semibold">{r.title}</span><span className="text-[13px] text-umber">{CATEGORY[r.category]} · {r.unit_label} · updated {ago(r.updated_at)}</span></span><Tag tone={r.status}>{MAINT_STATUS_LABEL[r.status]}</Tag></button></li>))}</ul>
      )}
      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="Report a problem">{modal === 'new' && (homes.data ? <NewRequest homes={homes.data.homes} onDone={() => { setModal(null); list.reload(true); }} /> : <SkeletonRows rows={2} />)}</Modal>
      <Modal wide open={!!modal && modal !== 'new'} onClose={() => setModal(null)} title={modal && modal !== 'new' ? modal.title : ''}>{modal && modal !== 'new' && <RequestDetail id={modal.id} onChange={() => list.reload(true)} />}</Modal>
    </div>
  );
}
function TenantReceipt({ id }: { id: string }) {
  const { data, error, loading } = useApi<{ receipt: Receipt }>(`/t/receipts/${id}`);
  return <div><div className="no-print mb-5 flex justify-between"><Link to="/home" className="btn-quiet btn-sm -ml-2"><Icon name="back" size={16} />My home</Link>{data && <button className="btn-primary btn-sm" onClick={() => window.print()}><Icon name="print" size={16} />Print</button>}</div>
    {loading && <Skeleton className="h-[400px]" />}{error && <ErrorBox text={error} />}{data && <ReceiptDoc r={data.receipt} />}</div>;
}
export default function TenantApp() {
  const { path } = useLocation(); const parts = path.split('/'); const sub = parts[2] || '';
  useEffect(() => { document.title = 'My home · Kotha'; }, []);
  const body = sub === '' ? <MyHome /> : sub === 'requests' ? <Requests /> : sub === 'settings' ? <Settings /> : sub === 'receipt' && parts[3] ? <TenantReceipt id={parts[3]} /> : <Empty title="Not found" />;
  const title = sub === '' ? 'My home' : sub === 'requests' ? 'Repairs' : sub === 'settings' ? 'Settings' : '';
  return (
    <div className="min-h-screen">
      <DeskHeader sheets={SHEETS} who="Tenant" />
      <main key={sub} className="page-in mx-auto max-w-[1080px] px-4 py-6 lg:py-8">
        {title && <h1 className="no-print display mb-6 border-b border-ink pb-3 text-[30px] sm:text-[38px]">{title}</h1>}
        <Suspense fallback={<Skeleton className="h-64" />}>{body}</Suspense>
      </main>
    </div>
  );
}
