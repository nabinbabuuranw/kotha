import { useState } from 'react';
import { useLocation, Link } from '../lib/router';
import { useApi } from '../lib/useApi';
import { api, errorText } from '../lib/api';
import { rs, kindLabel, dateTime } from '../lib/format';
import { DeskHeader } from './app/LandlordApp';
import { ErrorBox, SkeletonRows, Tag, useToast, Empty } from '../components/ui';

const SHEETS = [{ to: '/admin', n: 'X1', label: 'Overview', icon: 'plan' as const }, { to: '/admin/users', n: 'X2', label: 'Users', icon: 'users' as const }, { to: '/admin/listings', n: 'X3', label: 'Listings', icon: 'building' as const }, { to: '/admin/audit', n: 'X4', label: 'Audit trail', icon: 'shield' as const }];

function Overview() {
  const { data, error, loading, reload } = useApi<{ counts: Record<string, number>; demo_reset_at: number | null }>('/admin/overview'); const toast = useToast(); const [busy, setBusy] = useState(false);
  const reset = async () => { if (!confirm('Reset all demo data now?')) return; setBusy(true); try { await api('/admin/demo-reset', { body: {} }); toast('Demo data reset'); reload(true); } catch (x) { toast(errorText(x), 'err'); } finally { setBusy(false); } };
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />; if (loading) return <SkeletonRows rows={3} />;
  const c = data!.counts;
  const L: [string, string][] = [['landlords', 'Landlord accounts'], ['tenants', 'Tenant accounts'], ['demo_accounts', 'Of which demo'], ['disabled', 'Disabled'], ['properties', 'Properties'], ['units', 'Units'], ['listed', 'Listed units'], ['hidden', 'Hidden by admin'], ['open_requests', 'Open repairs'], ['payments', 'Payments recorded'], ['inquiries', 'Inquiries']];
  return (
    <div className="space-y-6">
      <p className="text-[14px] text-umber">Live counts from the database, demo accounts included.</p>
      <div className="grid grid-cols-2 border-l border-t border-ink sm:grid-cols-3 lg:grid-cols-4">{L.map(([k, l]) => <div key={k} className="border-b border-r border-ink p-4"><p className="text-[12.5px] text-umber">{l}</p><p className="display num mt-1 text-[30px]">{c[k]}</p></div>)}</div>
      <div className="flex flex-wrap items-center gap-3 border border-line p-4"><p className="text-[14px]">Demo data last reset {data!.demo_reset_at ? dateTime(data!.demo_reset_at) : 'never'}. It also resets itself every 3 hours when someone opens the demo.</p><button className="btn-ghost btn-sm" onClick={reset} disabled={busy}>Reset demo now</button></div>
    </div>
  );
}
function Users() {
  const { data, error, loading, reload } = useApi<{ items: any[] }>('/admin/users'); const toast = useToast();
  const upd = async (id: number, body: any, msg: string) => { try { await api(`/admin/users/${id}`, { method: 'PUT', body }); toast(msg); reload(true); } catch (x) { toast(errorText(x), 'err'); } };
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />; if (loading) return <SkeletonRows rows={5} />;
  return (
    <div className="overflow-x-auto border border-ink bg-[#FBF8F4]"><table className="tbl min-w-[760px]"><thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Units</th><th>Joined</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
      <tbody>{data!.items.map((u) => (
        <tr key={u.id}><td><p className="font-medium">{u.name}</p><p className="text-[12.5px] text-umber">{u.email}</p></td><td>{u.role}{u.is_demo ? <> <Tag tone="demo">Demo</Tag></> : null}</td><td>{u.role === 'landlord' ? u.plan : '–'}</td><td className="num">{u.role === 'landlord' ? u.units : '–'}</td><td className="text-[13px]">{dateTime(u.created_at)}</td>
          <td>{u.disabled ? <Tag tone="due">Disabled</Tag> : <Tag tone="paid">Active</Tag>}</td>
          <td className="whitespace-nowrap text-right">{u.role !== 'admin' && <>
            {u.role === 'landlord' && <button className="btn-quiet btn-sm" onClick={() => upd(u.id, { plan: u.plan === 'pro' ? 'free' : 'pro' }, 'Plan changed')}>{u.plan === 'pro' ? 'Set Free' : 'Set Pro'}</button>}
            <button className={`btn-quiet btn-sm ${u.disabled ? '' : 'text-due'}`} onClick={() => upd(u.id, { disabled: !u.disabled }, u.disabled ? 'User enabled' : 'User disabled, sessions ended')}>{u.disabled ? 'Enable' : 'Disable'}</button></>}</td></tr>))}</tbody></table></div>
  );
}
function Listings() {
  const { data, error, loading, reload } = useApi<{ items: any[] }>('/admin/listings'); const toast = useToast();
  const hide = async (id: number, hidden: boolean) => { const reason = hidden ? prompt('Reason for hiding (kept in the audit trail)') : ''; if (hidden && reason === null) return; try { await api(`/admin/listings/${id}`, { method: 'PUT', body: { hidden, reason } }); toast(hidden ? 'Listing hidden' : 'Listing visible again'); reload(true); } catch (x) { toast(errorText(x), 'err'); } };
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />; if (loading) return <SkeletonRows rows={5} />;
  if (!data!.items.length) return <Empty title="No listings" />;
  return (
    <div className="overflow-x-auto border border-ink bg-[#FBF8F4]"><table className="tbl min-w-[720px]"><thead><tr><th>Listing</th><th>Owner</th><th>Rent</th><th>Inquiries</th><th>State</th><th className="text-right">Moderation</th></tr></thead>
      <tbody>{data!.items.map((l) => (
        <tr key={l.id}><td><Link to={`/rooms/${l.id}`} className="font-medium underline underline-offset-2">{l.label}</Link><p className="text-[12.5px] text-umber">{kindLabel(l.kind)} · {l.locality}</p></td><td className="text-[13px]">{l.owner_email}{l.is_demo ? <> <Tag tone="demo">Demo</Tag></> : null}</td><td className="num">{rs(l.rent)}</td><td className="num">{l.inquiries}</td>
          <td>{l.hidden ? <Tag tone="due">Hidden</Tag> : <Tag tone="listed">Visible</Tag>}</td><td className="text-right"><button className="btn-quiet btn-sm" onClick={() => hide(l.id, !l.hidden)}>{l.hidden ? 'Unhide' : 'Hide'}</button></td></tr>))}</tbody></table></div>
  );
}
function Audit() {
  const { data, error, loading, reload } = useApi<{ items: any[] }>('/admin/audit');
  if (error) return <ErrorBox text={error} onRetry={() => reload()} />; if (loading) return <SkeletonRows rows={6} />;
  return (
    <ol className="relative ml-2 border-l-2 border-slate pl-6">{data!.items.map((a) => (
      <li key={a.id} className="relative pb-4"><span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 bg-slate" /><p className="text-[14px]"><b>{a.action}</b> <span className="text-umber">{a.target}</span> {a.detail && <span className="text-umber">· {a.detail}</span>}</p><p className="text-[12px] text-umber">{a.actor_email || 'system'} · {dateTime(a.created_at)}</p></li>))}</ol>
  );
}
export default function Admin() {
  const { path } = useLocation(); const sub = path.split('/')[2] || '';
  const body = sub === '' ? <Overview /> : sub === 'users' ? <Users /> : sub === 'listings' ? <Listings /> : sub === 'audit' ? <Audit /> : <Empty title="Not found" />;
  const t = SHEETS.find((s) => s.to === (sub ? '/admin/' + sub : '/admin'));
  return (
    <div className="min-h-screen">
      <DeskHeader sheets={SHEETS} who="Platform admin" />
      <main key={sub} className="page-in mx-auto max-w-sheet px-4 py-6 lg:px-6 lg:py-8"><div className="mb-6 flex items-baseline justify-between border-b border-ink pb-3"><h1 className="display text-[30px] sm:text-[38px]">{t?.label || ''}</h1><span className="eyebrow">{t?.n}</span></div>{body}</main>
    </div>
  );
}
