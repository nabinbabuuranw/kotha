import { useState, type FormEvent } from 'react';
import { useApi } from '../../lib/useApi';
import { api, errorText, type Unit } from '../../lib/api';
import { ktmTodayIso } from '../../../shared/rent';
import { rs, waLink, bsLabel } from '../../lib/format';
import { Field, Input, Select, Textarea, Modal, ErrorBox, SkeletonRows, Empty, Tag, useToast, Notice } from '../../components/ui';
import { Icon } from '../../components/Icons';
import { Statement } from './Ledger';

type T = { id: number; name: string; phone: string | null; email: string | null; notes: string; invite_code: string; linked: number; tenancy_id: number | null; rent: number | null; start_date: string | null; unit_label: string | null; property_name: string | null; balance: number };

function TenantForm({ t, onDone }: { t?: T; onDone: (id?: number) => void }) {
  const [f, setF] = useState({ name: t?.name || '', phone: t?.phone || '', email: t?.email || '', notes: t?.notes || '' });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { const r = await api(t ? `/l/tenants/${t.id}` : '/l/tenants', { method: t ? 'PUT' : 'POST', body: f }); toast(t ? 'Tenant saved' : 'Tenant added'); onDone(r.id); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Mobile"><Input inputMode="tel" placeholder="98XXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Email (optional)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Private notes" hint="Citizenship number, emergency contact, agreement date. Only you see this."><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      {e && <ErrorBox text={e} />}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : t ? 'Save tenant' : 'Add tenant'}</button>
    </form>
  );
}

function MoveIn({ t, onDone }: { t: T; onDone: () => void }) {
  const units = useApi<{ items: Unit[] }>('/l/units');
  const vacant = (units.data?.items || []).filter((u) => !u.tenant_name);
  const [f, setF] = useState({ unit_id: '', start_date: ktmTodayIso(), rent: '', deposit: '' });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const pick = (id: string) => { const u = vacant.find((x) => String(x.id) === id); setF({ ...f, unit_id: id, rent: u ? String(u.rent / 100) : '', deposit: u ? String(u.deposit / 100) : '' }); };
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { await api('/l/tenancies', { body: { ...f, unit_id: Number(f.unit_id), tenant_id: t.id } }); toast(`${t.name} moved in`); onDone(); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  if (units.loading) return <SkeletonRows rows={2} />;
  if (!vacant.length) return <Notice>All your units are rented. Add a unit under Properties first.</Notice>;
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Unit" className="sm:col-span-2"><Select required value={f.unit_id} onChange={(e) => pick(e.target.value)}><option value="">Choose a vacant unit</option>{vacant.map((u) => <option key={u.id} value={u.id}>{u.property_name} · {u.label}</option>)}</Select></Field>
      <Field label="Move-in date"><Input type="date" required value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
      <Field label="Agreed rent (Rs)"><Input inputMode="decimal" value={f.rent} onChange={(e) => setF({ ...f, rent: e.target.value })} /></Field>
      <Field label="Deposit held (Rs)"><Input inputMode="decimal" value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value })} /></Field>
      {e && <div className="sm:col-span-2"><ErrorBox text={e} /></div>}
      <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? 'Saving…' : 'Move in'}</button>
    </form>
  );
}

function TenantPanel({ t, onChange }: { t: T; onChange: () => void }) {
  const toast = useToast(); const [code, setCode] = useState(t.invite_code); const [edit, setEdit] = useState(false); const [end, setEnd] = useState(ktmTodayIso());
  const msg = `Namaste ${t.name.split(' ')[0]}, I keep our rent records on Kotha. Create a free tenant account at ${location.origin}/register?role=tenant and enter this code: ${code}. You will see your rent statement, receipts and can send repair requests.`;
  const reset = async () => { if (!confirm('Make a new code? The old code stops working and any linked tenant account is unlinked.')) return; try { const r = await api(`/l/tenants/${t.id}/new-code`, { body: {} }); setCode(r.invite_code); toast('New code made'); onChange(); } catch (x) { toast(errorText(x), 'err'); } };
  const endIt = async () => { try { await api(`/l/tenancies/${t.tenancy_id}/end`, { body: { end_date: end } }); toast('Tenancy ended'); onChange(); } catch (x) { toast(errorText(x), 'err'); } };
  if (edit) return <TenantForm t={t} onDone={() => { setEdit(false); onChange(); }} />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[14px] text-umber">{t.phone || 'No mobile'}{t.email ? ` · ${t.email}` : ''}</p>{t.notes && <p className="mt-1 text-[13.5px] text-umber whitespace-pre-line">{t.notes}</p>}</div><button className="btn-ghost btn-sm" onClick={() => setEdit(true)}>Edit details</button></div>
      <section className="border border-ink p-4">
        <p className="eyebrow">Tenant login code</p>
        <div className="mt-2 flex flex-wrap items-center gap-3"><code className="num border border-slate bg-bone px-3 py-1.5 text-[22px] font-semibold tracking-[.2em]">{code}</code>{t.linked ? <Tag tone="paid">Linked to an account</Tag> : <Tag>Not linked yet</Tag>}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {t.phone && <a className="btn-primary btn-sm" href={waLink(t.phone, msg)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} />Send on WhatsApp</a>}
          <button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(msg); toast('Message copied'); }}><Icon name="copy" size={16} />Copy message</button>
          <button className="btn-quiet btn-sm" onClick={reset}>New code</button>
        </div>
      </section>
      {t.tenancy_id ? (
        <>
          <section><p className="eyebrow mb-2">Current home</p><p className="text-[16px] font-semibold">{t.property_name} · {t.unit_label}</p><p className="text-[13.5px] text-umber">Since {t.start_date ? bsLabel(t.start_date) + ' BS' : ''} · rent {rs(t.rent || 0)}</p></section>
          <section><p className="eyebrow mb-2">Statement</p><Statement tenancyId={t.tenancy_id} /></section>
          <section className="border border-due/40 p-4"><p className="font-semibold">Moving out?</p><div className="mt-2 flex flex-wrap items-end gap-2"><Field label="Move-out date"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field><button className="btn-danger" onClick={endIt}>End tenancy</button></div><p className="mt-2 text-[12.5px] text-umber">The history stays. The unit becomes vacant so you can list it again.</p></section>
        </>
      ) : <section><p className="eyebrow mb-2">Move in</p><MoveIn t={t} onDone={onChange} /></section>}
    </div>
  );
}

export default function Tenants() {
  const { data, error, loading, reload } = useApi<{ items: T[] }>('/l/tenants');
  const [open, setOpen] = useState<number | 'new' | null>(null);
  const cur = typeof open === 'number' ? data?.items.find((t) => t.id === open) : undefined;
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-[14.5px] text-umber">Everyone who rents from you. Give each tenant their code so they can log in.</p><button className="btn-primary" onClick={() => setOpen('new')}><Icon name="plus" size={18} />Add tenant</button></div>
      {loading ? <SkeletonRows rows={4} /> : data!.items.length === 0 ? <Empty icon="users" title="No tenants yet" action={<button className="btn-primary" onClick={() => setOpen('new')}>Add a tenant</button>}>Add a tenant, then move them into a unit to start their rent book.</Empty> : (
        <div className="overflow-x-auto border border-ink bg-[#FBF8F4]"><table className="tbl min-w-[680px]">
          <thead><tr><th>Tenant</th><th>Home</th><th>Rent</th><th>Balance</th><th>Login</th><th /></tr></thead>
          <tbody>{data!.items.map((t) => (
            <tr key={t.id} className="cursor-pointer" onClick={() => setOpen(t.id)}>
              <td><p className="font-medium">{t.name}</p><p className="text-[12.5px] text-umber">{t.phone || ''}</p></td>
              <td>{t.unit_label ? <>{t.unit_label}<p className="text-[12.5px] text-umber">{t.property_name}</p></> : <span className="text-umber">Not housed</span>}</td>
              <td className="num">{t.rent ? rs(t.rent) : '–'}</td>
              <td className={`num font-semibold ${t.balance > 0 ? 'text-due' : t.balance < 0 ? 'text-paid' : ''}`}>{t.balance > 0 ? rs(t.balance) : t.balance < 0 ? `${rs(-t.balance)} adv.` : 'Nil'}</td>
              <td>{t.linked ? <Tag tone="paid">Linked</Tag> : <Tag>Code sent?</Tag>}</td>
              <td className="text-right"><button className="btn-quiet btn-sm" onClick={(e) => { e.stopPropagation(); setOpen(t.id); }}>Open <Icon name="chevron" size={16} /></button></td>
            </tr>))}</tbody>
        </table></div>
      )}
      <Modal open={open === 'new'} onClose={() => setOpen(null)} title="Add tenant"><TenantForm onDone={(id) => { reload(true); setOpen(id ?? null); }} /></Modal>
      <Modal wide open={!!cur} onClose={() => setOpen(null)} title={cur?.name || ''}>{cur && <TenantPanel key={cur.id + ':' + cur.tenancy_id} t={cur} onChange={() => reload(true)} />}</Modal>
    </div>
  );
}
