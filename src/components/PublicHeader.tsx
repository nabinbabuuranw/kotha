import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from '../lib/router';
import { useAuth, homeFor } from '../lib/auth';
import { Brand } from './ui';
import { Icon } from './Icons';

const LINKS = [{ to: '/rooms', label: 'Find a room' }, { to: '/#landlords', label: 'For landlords' }, { to: '/#pricing', label: 'Pricing' }, { to: '/#faq', label: 'Questions' }];

export function PublicHeader() {
  const { path } = useLocation(); const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLDivElement>(null); const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const active = LINKS.findIndex((l) => l.to === path || (l.to !== '/rooms' && false) || (l.to === '/rooms' && path.startsWith('/rooms')));
  const [hover, setHover] = useState<number | null>(null);
  useLayoutEffect(() => {
    const i = hover ?? active; const el = i >= 0 ? nav.current?.querySelectorAll('a')[i] as HTMLElement | undefined : undefined;
    setInd(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, [hover, active, path]);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink bg-plaster/95 backdrop-blur-[2px]">
      <div className="mx-auto flex h-16 max-w-sheet items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav ref={nav} className="relative hidden md:flex items-center gap-1" onMouseLeave={() => setHover(null)} aria-label="Main">
          {LINKS.map((l, i) => (
            <Link key={l.to} to={l.to} onMouseEnter={() => setHover(i)} aria-current={i === active ? 'page' : undefined}
              className={`px-3 py-2 text-[14.5px] font-medium transition-colors ${i === active ? 'text-ink' : 'text-umber hover:text-ink'}`}>{l.label}</Link>
          ))}
          {ind && (
            <span className="nav-ind pointer-events-none absolute -bottom-[13px] left-0 flex items-center" style={{ transform: `translateX(${ind.x + 8}px)`, width: ind.w - 16 }} aria-hidden="true">
              <span className="h-2.5 border-l border-slate" /><span className="flex-1 border-t-2 border-slate" /><span className="h-2.5 border-l border-slate" />
            </span>
          )}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          {user ? <Link to={homeFor(user.role)} className="btn-primary btn-sm">Open my desk <Icon name="arrow" size={16} /></Link> : <>
            <Link to="/login" className="btn-quiet btn-sm">Sign in</Link>
            <Link to="/register?role=landlord" className="btn-primary btn-sm">List your rooms</Link>
          </>}
        </div>
        <button className="md:hidden btn-quiet !px-2" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} size={24} /></button>
      </div>
      {open && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-plaster border-t border-ink page-in overflow-y-auto">
          <nav className="px-5 py-4" aria-label="Mobile">
            {LINKS.map((l, i) => (
              <Link key={l.to} to={l.to} className="flex items-baseline justify-between border-b border-line py-4">
                <span className="display text-[30px]">{l.label}</span><span className="eyebrow">0{i + 1}</span>
              </Link>
            ))}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {user ? <Link to={homeFor(user.role)} className="btn-primary col-span-2">Open my desk</Link> : <>
                <Link to="/login" className="btn-ghost">Sign in</Link><Link to="/register?role=landlord" className="btn-primary">List your rooms</Link>
              </>}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="no-print border-t border-ink bg-plaster">
      <div className="mx-auto max-w-sheet px-5 lg:px-8 py-10">
        {/* title block, like the corner of an architectural drawing */}
        <div className="grid grid-cols-2 md:grid-cols-6 border border-ink text-[13.5px]">
          <div className="col-span-2 md:col-span-2 border-b md:border-b-0 md:border-r border-ink p-4">
            <Brand />
            <p className="mt-3 text-umber max-w-xs">Rooms to rent in the Kathmandu Valley, and a rent book for the people who own them.</p>
          </div>
          <div className="border-r border-b md:border-b-0 border-ink p-4"><p className="eyebrow mb-2">Renters</p><Link to="/rooms" className="block py-1 hover:underline">Find a room</Link><Link to="/register?role=tenant" className="block py-1 hover:underline">Tenant login</Link></div>
          <div className="border-b md:border-b-0 md:border-r border-ink p-4"><p className="eyebrow mb-2">Landlords</p><Link to="/register?role=landlord" className="block py-1 hover:underline">Start free</Link><Link to="/#pricing" className="block py-1 hover:underline">Pricing</Link></div>
          <div className="border-r border-ink p-4"><p className="eyebrow mb-2">Legal</p><Link to="/terms" className="block py-1 hover:underline">Terms</Link><Link to="/privacy" className="block py-1 hover:underline">Privacy</Link></div>
          <div className="p-4"><p className="eyebrow mb-2">Sheet</p><p className="num">Day 003 / 100</p><p className="text-umber">Kathmandu, 2083 BS</p></div>
        </div>
        <p className="mt-4 text-[12.5px] text-umber">Listings marked <b>Demo</b> are sample data for trying the product. Kotha does not charge renters and does not take a commission.</p>
      </div>
    </footer>
  );
}
