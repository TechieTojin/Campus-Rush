import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, setSessionExpiredHandler } from './api';
import { SessionContext } from './sessionContext';
import { applyTheme } from './theme';

// status: 'loading' | 'signedOut' | 'signedIn' | 'expired' | 'offline'
export function SessionProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState('loading');
  const [expiredReason, setExpiredReason] = useState('');
  const statusRef = useRef(status);
  statusRef.current = status;

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setAdmin(me);
      setStatus('signedIn');
      applyTheme(me.preferences?.theme || 'system');
      return me;
    } catch (e) {
      if (e.response?.status === 401) {
        if (statusRef.current === 'signedIn' || statusRef.current === 'expired') setStatus('expired');
        else { setAdmin(null); setStatus('signedOut'); }
      } else if (statusRef.current === 'loading') {
        setStatus('offline');
      }
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Keep the last known admin so the page underneath the "sign in again" dialog still renders.
  useEffect(() => {
    setSessionExpiredHandler((message) => {
      if (statusRef.current === 'signedIn') {
        setExpiredReason(message || '');
        setStatus('expired');
      }
    });
  }, []);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* the cookie expires on its own if the server is unreachable */ }
    setAdmin(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(() => ({ admin, status, expiredReason, refresh, signOut, setAdmin }), [admin, status, expiredReason, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
