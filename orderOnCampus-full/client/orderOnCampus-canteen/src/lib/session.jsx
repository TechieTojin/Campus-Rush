import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, setSessionExpiredHandler } from './api';
import { SessionContext } from './sessionContext';

const CANTEEN_KEY = 'cr.activeCanteen';
const readActive = () => { try { return localStorage.getItem(CANTEEN_KEY); } catch { return null; } };
const writeActive = (id) => { try { localStorage.setItem(CANTEEN_KEY, id); } catch { /* storage unavailable */ } };

// status: 'loading' | 'signedOut' | 'signedIn' | 'expired' | 'offline'
export function SessionProvider({ children }) {
  const [staff, setStaff] = useState(null);
  const [status, setStatus] = useState('loading');
  const [activeId, setActiveId] = useState(readActive);
  const statusRef = useRef(status);
  statusRef.current = status;

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setStaff(me);
      setStatus('signedIn');
      return me;
    } catch (e) {
      if (e.response?.status === 401) {
        if (statusRef.current === 'signedIn' || statusRef.current === 'expired') {
          setStatus('expired');
        } else {
          setStaff(null);
          setStatus('signedOut');
        }
      } else {
        setStatus((s) => (s === 'loading' ? 'offline' : s));
      }
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    // Keep the last known staff/canteen so the page underneath the "sign in again" dialog still renders.
    setSessionExpiredHandler(() => setStatus((s) => (s === 'signedIn' ? 'expired' : s)));
  }, []);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* cookie is cleared server-side when reachable */ }
    setStaff(null);
    setStatus('signedOut');
  }, []);

  const canteens = useMemo(() => staff?.ownedCanteens || [], [staff]);
  const canteen = canteens.find((c) => c._id === activeId) || canteens[0] || null;

  const selectCanteen = useCallback((id) => { setActiveId(id); writeActive(id); }, []);

  const updateCanteenSummary = useCallback((patch) => {
    setStaff((s) => s && { ...s, ownedCanteens: s.ownedCanteens.map((c) => (c._id === patch._id ? { ...c, ...patch } : c)) });
  }, []);

  const value = useMemo(
    () => ({ staff, status, canteen, canteens, refresh, signOut, setStaff, selectCanteen, updateCanteenSummary }),
    [staff, status, canteen, canteens, refresh, signOut, selectCanteen, updateCanteenSummary]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
