import { lazy, Suspense, useEffect } from 'react';
import { useLocation, navigate } from './lib/router';
import { useAuth } from './lib/auth';
import Home from './pages/Home';
const Rooms = lazy(() => import('./pages/Rooms'));
const RoomDetail = lazy(() => import('./pages/RoomDetail'));
const AuthPages = lazy(() => import('./pages/Auth').then((m) => ({ default: (p: { page: 'login' | 'register' }) => (p.page === 'login' ? <m.Login /> : <m.Register />) })));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PublicReceipt = lazy(() => import('./pages/PublicReceipt'));
const LandlordApp = lazy(() => import('./pages/app/LandlordApp'));
const TenantApp = lazy(() => import('./pages/TenantApp'));
const Admin = lazy(() => import('./pages/Admin'));

function Loading() {
  return <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading"><svg width="48" height="48" viewBox="0 0 48 48" className="draw"><rect x="4" y="4" width="40" height="40" fill="none" stroke="#22333B" strokeWidth="2" style={{ ['--len' as any]: 160 }} /><path d="M4 26h18M22 4v12" stroke="#22333B" strokeWidth="1.5" style={{ ['--len' as any]: 40, ['--d' as any]: '.3s' }} /></svg></div>;
}
function Guard({ role, children }: { role: string; children: JSX.Element }) {
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading && !user) navigate('/login', { replace: true }); }, [loading, user]);
  if (loading || !user) return <Loading />;
  if (user.role !== role) return <NotFound />;
  return children;
}
export default function App() {
  const { path } = useLocation();
  let el: JSX.Element;
  let m: RegExpMatchArray | null;
  if (path === '/' || path === '/landlords') el = <Home />;
  else if (path === '/rooms') el = <Rooms />;
  else if ((m = path.match(/^\/rooms\/(\d{1,12})$/))) el = <RoomDetail key={m[1]} id={m[1]} />;
  else if (path === '/login' || path === '/register') el = <AuthPages page={path.slice(1) as 'login' | 'register'} />;
  else if (path === '/terms' || path === '/privacy') el = <Legal kind={path.slice(1) as 'terms' | 'privacy'} />;
  else if ((m = path.match(/^\/r\/([A-Za-z0-9_-]{20,64})$/))) el = <PublicReceipt token={m[1]} />;
  else if (path === '/app' || path.startsWith('/app/')) el = <Guard role="landlord"><LandlordApp /></Guard>;
  else if (path === '/home' || path.startsWith('/home/')) el = <Guard role="tenant"><TenantApp /></Guard>;
  else if (path === '/admin' || path.startsWith('/admin/')) el = <Guard role="admin"><Admin /></Guard>;
  else el = <NotFound />;
  return <Suspense fallback={<Loading />}>{el}</Suspense>;
}
