import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from './api';
interface AuthState { user: User | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void>; setUser: (u: User | null) => void }
const Ctx = createContext<AuthState>(null as any);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  const refresh = useCallback(async () => {
    try { const r = await api('/me'); set({ user: r.user, loading: false }); } catch { set({ user: null, loading: false }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const logout = useCallback(async () => { try { await api('/auth/logout', { method: 'POST' }); } finally { set({ user: null, loading: false }); } }, []);
  const setUser = useCallback((u: User | null) => set({ user: u, loading: false }), []);
  return <Ctx.Provider value={{ ...s, refresh, logout, setUser }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export const homeFor = (role?: string) => (role === 'landlord' ? '/app' : role === 'admin' ? '/admin' : '/home');
