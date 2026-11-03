import { useState } from 'react';
import { navigate } from '../lib/router';
import { api, errorText } from '../lib/api';
import { useAuth, homeFor } from '../lib/auth';
import { Icon } from './Icons';

export function DemoButtons({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const { setUser } = useAuth(); const [busy, setBusy] = useState<string | null>(null); const [e, setE] = useState<string | null>(null);
  const go = async (as: 'landlord' | 'tenant') => {
    setBusy(as); setE(null);
    try { const r = await api('/auth/demo', { body: { as } }); setUser(r.user); navigate(homeFor(r.user.role)); } catch (x) { setE(errorText(x)); } finally { setBusy(null); }
  };
  const cls = light ? 'btn border-tan/60 text-plaster hover:bg-slate-2' : 'btn-ghost';
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button className={cls} onClick={() => go('landlord')} disabled={!!busy}><Icon name="key" size={18} />{busy === 'landlord' ? 'Opening…' : compact ? 'Demo landlord' : 'Open the demo landlord desk'}</button>
        <button className={cls} onClick={() => go('tenant')} disabled={!!busy}><Icon name="user" size={18} />{busy === 'tenant' ? 'Opening…' : compact ? 'Demo tenant' : 'Open the demo tenant page'}</button>
      </div>
      {e && <p className={`mt-2 text-[13px] ${light ? 'text-tan' : 'text-due'}`}>{e}</p>}
    </div>
  );
}

