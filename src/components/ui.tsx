import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icons';
import { Link } from '../lib/router';

export function Brand({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className={`group inline-flex items-baseline gap-2 ${light ? 'text-plaster' : 'text-ink'}`} >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="self-center"><rect x="1.5" y="1.5" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M1.5 11h9M10.5 1.5v6M14 11h6.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 15a4 4 0 0 1 4 4" fill="none" stroke={light ? '#C6AC8F' : '#7A5A2E'} strokeWidth="1.4" /></svg>
      <span className="text-[22px] display tracking-tight">Kotha</span>
      <span className={`deva text-[15px] font-semibold ${light ? 'text-tan' : 'text-ochre'}`}>कोठा</span>
    <span className="sr-only">, home</span></Link>
  );
}

/** Dimension line: the section divider of a drawing sheet. */
export function DimRule({ n, label, className = '', light = false }: { n?: string; label: string; className?: string; light?: boolean }) {
  const c = light ? 'border-tan/60 text-tan' : 'border-ink/70 text-umber';
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className={`h-3 border-l ${c}`} />
      <span className={`flex-1 border-t ${c}`} />
      <span className={`eyebrow ${light ? '!text-tan' : ''}`}>{n ? `${n} · ` : ''}{label}</span>
      <span className={`flex-1 border-t ${c}`} />
      <span className={`h-3 border-l ${c}`} />
    </div>
  );
}

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[13px] text-due">{error}</span> : hint ? <span className="mt-1 block text-[12.5px] text-umber">{hint}</span> : null}
    </label>
  );
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`input ${p.className || ''}`} />;
export const Select = ({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) => <select {...p} className={`input ${p.className || ''}`}>{children}</select>;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={4} {...p} className={`input ${p.className || ''}`} />;
export function Check({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="inline-flex items-center gap-2.5 text-[14.5px] cursor-pointer select-none"><input type="checkbox" {...p} className="check" /><span>{label}</span></label>;
}

export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skel ${className}`} aria-hidden="true" />; }
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-2" role="status" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}
export function Empty({ icon = 'plan', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line px-6 py-10 text-center">
      <Icon name={icon} size={30} className="mx-auto text-umber" />
      <p className="mt-3 text-[17px] font-semibold wide">{title}</p>
      {children && <div className="mx-auto mt-1.5 max-w-md text-[14.5px] text-umber">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-due/50 bg-due/5 px-4 py-3 text-[14.5px] text-due">
      <span>{text}</span>{onRetry && <button className="btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'ok' | 'warn' }) {
  const t = tone === 'ok' ? 'border-paid/50 bg-paid/5 text-paid' : tone === 'warn' ? 'border-part/50 bg-part/5 text-part' : 'border-line bg-bone/60 text-umber';
  return <div className={`border px-4 py-3 text-[14.5px] ${t}`}>{children}</div>;
}

const TONES: Record<string, string> = {
  paid: 'border-paid/40 text-paid bg-paid/5', due: 'border-due/40 text-due bg-due/5', part: 'border-part/40 text-part bg-part/5',
  open: 'border-due/40 text-due bg-due/5', in_progress: 'border-part/40 text-part bg-part/5', resolved: 'border-paid/40 text-paid bg-paid/5', closed: 'border-line text-umber',
  new: 'border-slate/40 text-slate bg-slate/5', replied: 'border-line text-umber', demo: 'border-ochre/50 text-ochre bg-ochre/5', neutral: 'border-line text-umber',
  urgent: 'border-due text-plaster bg-due', listed: 'border-slate text-slate', vacant: 'border-line text-umber', occupied: 'border-slate bg-slate text-plaster',
};
export function Tag({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) { return <span className={`tag ${TONES[tone] || TONES.neutral}`}>{children}</span>; }

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/45 backdrop-in" onClick={onClose} />
      <div ref={ref} className={`modal-in relative w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto bg-plaster border border-ink`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink bg-plaster px-5 py-3.5">
          <h2 className="text-[17px] font-semibold wide">{title}</h2>
          <button className="btn-quiet !h-9 !px-2" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

type Toast = { id: number; text: string; tone: 'ok' | 'err' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'err') => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, set] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random(); set((x) => [...x, { id, text, tone }]);
    setTimeout(() => set((x) => x.filter((t) => t.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print fixed bottom-4 left-1/2 z-[60] w-[min(92vw,420px)] -translate-x-1/2 space-y-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast-in flex items-center gap-2.5 border px-4 py-3 text-[14.5px] ${t.tone === 'ok' ? 'border-slate bg-slate text-plaster' : 'border-due bg-due text-plaster'}`}>
            <Icon name={t.tone === 'ok' ? 'check' : 'close'} size={18} />{t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function PageTitle({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
      <div>{eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}<h1 className="display text-[30px] sm:text-[38px]">{title}</h1>{children && <p className="mt-2 max-w-2xl text-[15px] text-umber">{children}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
