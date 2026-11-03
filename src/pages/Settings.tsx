import { useState, type FormEvent } from 'react';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Field, Input, ErrorBox, Notice, useToast, Tag } from '../components/ui';
import { FREE_UNITS } from './settingsConst';
export default function Settings() {
  const { user, refresh } = useAuth(); const toast = useToast();
  const [p, setP] = useState({ name: user?.name || '', phone: user?.phone || '' }); const [pe, setPe] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: '', next: '' }); const [we, setWe] = useState<string | null>(null);
  const saveP = async (e: FormEvent) => { e.preventDefault(); setPe(null); try { await api('/me', { method: 'PUT', body: p }); toast('Profile saved'); refresh(); } catch (x) { setPe(errorText(x)); } };
  const saveW = async (e: FormEvent) => { e.preventDefault(); setWe(null); try { await api('/me/password', { body: pw }); toast('Password changed. Other devices are signed out.'); setPw({ current: '', next: '' }); } catch (x) { setWe(errorText(x)); } };
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <form onSubmit={saveP} className="space-y-4 border border-ink p-5"><h2 className="text-[18px] font-semibold wide">Profile</h2>
        <Field label="Name"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <Field label="Mobile" hint={user?.role === 'landlord' ? 'Shown on your receipts.' : undefined}><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={user?.email || ''} disabled /></Field>
        {pe && <ErrorBox text={pe} />}<button className="btn-primary w-full">Save profile</button></form>
      <form onSubmit={saveW} className="space-y-4 border border-ink p-5"><h2 className="text-[18px] font-semibold wide">Password</h2>
        <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
        <Field label="New password" hint="8+ characters with a letter and a number."><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        {we && <ErrorBox text={we} />}<button className="btn-primary w-full">Change password</button></form>
      {user?.role === 'landlord' && <div className="space-y-4 border border-ink p-5"><h2 className="text-[18px] font-semibold wide">Plan</h2>
        <p><Tag tone={user.plan === 'pro' ? 'paid' : 'neutral'}>{user.plan === 'pro' ? 'Landlord Pro' : 'Free'}</Tag></p>
        <p className="text-[14.5px] text-umber">{user.plan === 'pro' ? 'Unlimited units.' : `The Free plan covers ${FREE_UNITS} units. Landlord Pro (Rs 699 a month) removes the limit.`}</p>
        {user.plan !== 'pro' && <Notice>Online checkout is not built yet. To upgrade, pay by eSewa or bank and ask the Kotha team to switch your plan on.</Notice>}</div>}
    </div>
  );
}
