import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, navigate, useLocation } from '../lib/router';
import { api, errorText } from '../lib/api';
import { useAuth, homeFor } from '../lib/auth';
import { Brand, ErrorBox, Field, Input } from '../components/ui';
import { Icon } from '../components/Icons';
import { DemoButtons } from '../components/DemoButtons';
import { PlanGlyph } from '../components/PlanGlyph';

function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <main className="page-in grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r border-ink bg-bone ruled p-10 lg:flex">
        <Brand />
        <div><PlanGlyph kind="flat_2bhk" animate className="w-full max-w-[460px]" /><p className="mt-4 max-w-sm text-[15px] text-umber">Rooms to rent in the Valley, and the rent book that goes with them.</p></div>
        <p className="text-[12px] text-umber">Sheet 003 · Kotha</p>
      </div>
      <div className="flex flex-col p-6 sm:p-10">
        <div className="lg:hidden"><Brand /></div>
        <div className="m-auto w-full max-w-[420px] py-10">
          <h1 className="display text-[38px]">{title}</h1><p className="mt-2 text-[15px] text-umber">{sub}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}

export function Login() {
  const { setUser, user } = useAuth(); const { search } = useLocation(); const demo = new URLSearchParams(search).get('demo');
  const [f, setF] = useState({ email: '', password: '' }); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null);
  useEffect(() => { document.title = 'Sign in · Kotha'; }, []);
  useEffect(() => { if (user) navigate(homeFor(user.role), { replace: true }); }, [user]);
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { const r = await api('/auth/login', { body: f }); setUser(r.user); navigate(homeFor(r.user.role)); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Sign in" sub="Landlords, tenants and the Kotha team sign in here.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input type="email" required autoComplete="email" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} /></Field>
        <Field label="Password"><div className="relative"><Input type={show ? 'text' : 'password'} required autoComplete="current-password" value={f.password} onChange={(x) => setF({ ...f, password: x.target.value })} className="pr-12" />
          <button type="button" className="absolute right-1 top-1 btn-quiet !h-9 !px-2" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eyeoff' : 'eye'} size={18} /></button></div></Field>
        {e && <ErrorBox text={e} />}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-5 text-[14.5px] text-umber">New here? <Link to="/register" className="font-semibold text-slate underline underline-offset-4">Create a free account</Link></p>
      <div className={`mt-8 border p-4 ${demo ? 'border-slate' : 'border-line'}`}><p className="eyebrow mb-3">Just looking? Use the sample data</p><DemoButtons /></div>
    </Shell>
  );
}

export function Register() {
  const { setUser, user } = useAuth(); const { search } = useLocation();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', role: new URLSearchParams(search).get('role') === 'tenant' ? 'tenant' : 'landlord', website: '' });
  const [busy, setBusy] = useState(false); const [e, setE] = useState<string | null>(null);
  useEffect(() => { document.title = 'Create an account · Kotha'; }, []);
  useEffect(() => { if (user) navigate(homeFor(user.role), { replace: true }); }, [user]);
  const submit = async (ev: FormEvent) => {
    ev.preventDefault(); setBusy(true); setE(null);
    try { const r = await api('/auth/register', { body: f }); setUser(r.user); navigate(homeFor(r.user.role)); } catch (x) { setE(errorText(x)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Create an account" sub="Free. No card, no commission.">
      <form onSubmit={submit} className="space-y-4">
        <fieldset><legend className="field-label">I am a</legend>
          <div className="grid grid-cols-2 border border-ink">
            {(['landlord', 'tenant'] as const).map((r) => (
              <button type="button" key={r} aria-pressed={f.role === r} onClick={() => setF({ ...f, role: r })} className={`px-4 py-3 text-left transition-colors ${r === 'tenant' ? 'border-l border-ink' : ''} ${f.role === r ? 'bg-slate text-plaster' : 'hover:bg-bone'}`}>
                <span className="block font-semibold">{r === 'landlord' ? 'Landlord' : 'Tenant'}</span><span className={`block text-[12.5px] ${f.role === r ? 'text-tan' : 'text-umber'}`}>{r === 'landlord' ? 'I rent out rooms or flats' : 'My landlord uses Kotha'}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Full name"><Input required autoComplete="name" value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
        <Field label="Email"><Input type="email" required autoComplete="email" value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} /></Field>
        <Field label="Mobile (optional)"><Input inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} /></Field>
        <Field label="Password" hint="8 or more characters, with a letter and a number."><Input type="password" required autoComplete="new-password" value={f.password} onChange={(x) => setF({ ...f, password: x.target.value })} /></Field>
        <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={f.website} onChange={(x) => setF({ ...f, website: x.target.value })} /></div>
        {e && <ErrorBox text={e} />}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-[12.5px] text-umber">By creating an account you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy policy</Link>.</p>
      </form>
      <p className="mt-5 text-[14.5px] text-umber">Already have one? <Link to="/login" className="font-semibold text-slate underline underline-offset-4">Sign in</Link></p>
    </Shell>
  );
}
