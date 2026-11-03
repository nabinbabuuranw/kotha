import { useState, type FormEvent } from 'react';
import { useApi } from '../../lib/useApi';
import { api, errorText, type MaintRequest, type MaintEvent } from '../../lib/api';
import { MAINT_STATUS, MAINT_STATUS_LABEL } from '../../../shared/rent';
import { ago } from '../../lib/format';
import { Field, Select, Textarea, Modal, ErrorBox, SkeletonRows, Empty, Tag, useToast } from '../../components/ui';
import { MaintTimeline, CATEGORY } from '../../components/MaintTimeline';

function Detail({ id, onChange }: { id: number; onChange: () => void }) {
  const { data, error, loading, reload } = useApi<{ request: MaintRequest; events: MaintEvent[] }>(`/l/maintenance/${id}`);
  const [f, setF] = useState({ status: '', note: '' }); const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null); const toast = useToast();
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { await api(`/l/maintenance/${id}`, { body: { status: f.status || undefined, note: f.note } }); toast('Request updated'); setF({ status: '', note: '' }); reload(true); onChange(); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  if (loading) return <SkeletonRows rows={3} />; if (error) return <ErrorBox text={error} />;
  const r = data!.request;
  return (
    <div className="space-y-6">
      <div><div className="flex flex-wrap gap-2"><Tag tone={r.status}>{MAINT_STATUS_LABEL[r.status]}</Tag>{r.priority === 'urgent' && <Tag tone="urgent">Urgent</Tag>}<Tag>{CATEGORY[r.category]}</Tag></div>
        <p className="mt-2 text-[13.5px] text-umber">{r.property_name} · {r.unit_label}{r.tenant_name ? ` · ${r.tenant_name}` : ''}</p><p className="mt-3 text-[15.5px] whitespace-pre-line">{r.description}</p></div>
      <MaintTimeline events={data!.events} />
      <form onSubmit={submit} className="grid gap-3 border-t border-ink pt-5 sm:grid-cols-[180px_1fr]">
        <Field label="Move to"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Keep status</option>{MAINT_STATUS.filter((s) => s !== r.status).map((s) => <option key={s} value={s}>{MAINT_STATUS_LABEL[s]}</option>)}</Select></Field>
        <Field label="Note for the tenant"><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Plumber coming at 10 am tomorrow" /></Field>
        {e && <div className="sm:col-span-2"><ErrorBox text={e} /></div>}
        <button className="btn-primary sm:col-span-2" disabled={busy || (!f.status && !f.note.trim())}>{busy ? 'Saving…' : 'Update request'}</button>
      </form>
    </div>
  );
}

export default function Requests() {
  const [st, setSt] = useState('active');
  const { data, error, loading, reload } = useApi<{ items: MaintRequest[] }>(`/l/maintenance?status=${st}`);
  const [open, setOpen] = useState<MaintRequest | null>(null);
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {[['active', 'Open + in progress'], ['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['closed', 'Closed'], ['', 'All']].map(([k, l]) => <button key={k} className="chip" aria-pressed={st === k} onClick={() => setSt(k)}>{l}</button>)}
      </div>
      {error && <ErrorBox text={error} onRetry={() => reload()} />}
      {loading ? <SkeletonRows rows={4} /> : data && (data.items.length === 0 ? <Empty icon="wrench" title="No requests here">When a tenant reports a problem from their Kotha page, it lands here.</Empty> : (
        <ul className="border-t border-ink">{data.items.map((r) => (
          <li key={r.id}><button className="grid w-full gap-2 border-b border-line px-1 py-4 text-left transition-colors hover:bg-bone/60 sm:grid-cols-[1fr_auto]" onClick={() => setOpen(r)}>
            <span><span className="flex flex-wrap items-center gap-2"><span className="text-[16px] font-semibold">{r.title}</span>{r.priority === 'urgent' && <Tag tone="urgent">Urgent</Tag>}</span>
              <span className="mt-0.5 block text-[13px] text-umber">{CATEGORY[r.category]} · {r.property_name} · {r.unit_label}{r.tenant_name ? ` · ${r.tenant_name}` : ''}</span></span>
            <span className="flex items-center gap-3 sm:justify-end"><span className="text-[12.5px] text-umber">updated {ago(r.updated_at)}</span><Tag tone={r.status}>{MAINT_STATUS_LABEL[r.status]}</Tag></span>
          </button></li>))}</ul>
      ))}
      <Modal wide open={!!open} onClose={() => setOpen(null)} title={open?.title || ''}>{open && <Detail id={open.id} onChange={() => reload(true)} />}</Modal>
    </div>
  );
}
