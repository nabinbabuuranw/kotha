import { useApi } from '../../lib/useApi';
import { api, errorText } from '../../lib/api';
import { ago, waLink } from '../../lib/format';
import { ErrorBox, SkeletonRows, Empty, Tag, useToast } from '../../components/ui';
import { Icon } from '../../components/Icons';
type Inq = { id: number; name: string; phone: string; message: string; status: string; created_at: number; unit_label: string; property_name: string };
export default function Inquiries() {
  const { data, error, loading, reload } = useApi<{ items: Inq[] }>('/l/inquiries'); const toast = useToast();
  const mark = async (id: number, status: string) => { try { await api(`/l/inquiries/${id}`, { method: 'PUT', body: { status } }); reload(true); } catch (x) { toast(errorText(x), 'err'); } };
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />;
  if (loading) return <SkeletonRows rows={3} />;
  if (!data!.items.length) return <Empty icon="inbox" title="No inquiries yet">When someone asks about a listed unit, their name, number and message appear here.</Empty>;
  return (
    <ul className="grid gap-4 md:grid-cols-2">{data!.items.map((q) => (
      <li key={q.id} className={`border bg-[#FBF8F4] p-4 ${q.status === 'new' ? 'border-ink' : 'border-line opacity-80'}`}>
        <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{q.name}</p><p className="text-[12.5px] text-umber">About {q.unit_label} · {q.property_name} · {ago(q.created_at)}</p></div><Tag tone={q.status}>{q.status === 'new' ? 'New' : q.status === 'replied' ? 'Replied' : 'Closed'}</Tag></div>
        <p className="mt-3 text-[14.5px] whitespace-pre-line">{q.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-primary btn-sm" href={`tel:${q.phone}`}><Icon name="phone" size={16} />{q.phone}</a>
          <a className="btn-ghost btn-sm" href={waLink(q.phone, `Namaste ${q.name.split(' ')[0]}, about ${q.unit_label} on Kotha: `)} target="_blank" rel="noopener noreferrer" onClick={() => q.status === 'new' && mark(q.id, 'replied')}><Icon name="chat" size={16} />WhatsApp</a>
          {q.status !== 'replied' && <button className="btn-quiet btn-sm" onClick={() => mark(q.id, 'replied')}>Mark replied</button>}
          {q.status !== 'closed' && <button className="btn-quiet btn-sm" onClick={() => mark(q.id, 'closed')}>Close</button>}
        </div>
      </li>))}</ul>
  );
}
