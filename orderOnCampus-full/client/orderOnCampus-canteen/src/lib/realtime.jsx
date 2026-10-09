import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from './api';
import { RealtimeContext } from './realtimeContext';

// One authenticated Socket.IO connection per tab. The server authenticates it from the HttpOnly staff
// cookie and only joins it to this account's canteen rooms — the client can't choose what it receives.
// `onAccessChanged` runs when the server ends the connection (suspension, reassignment, revoked session),
// so the app can re-check the session.
export function RealtimeProvider({ enabled, sessionKey, onAccessChanged, children }) {
  const [status, setStatus] = useState('off'); // off | connecting | live | offline
  const [lastEventAt, setLastEventAt] = useState(null);
  const listeners = useRef(new Set());
  const seen = useRef([]);
  const accessRef = useRef(onAccessChanged);
  accessRef.current = onAccessChanged;

  const dispatch = useCallback((event) => {
    listeners.current.forEach((fn) => { try { fn(event); } catch (e) { console.error(e); } });
  }, []);

  useEffect(() => {
    if (!enabled) { setStatus('off'); return undefined; }
    setStatus('connecting');
    const socket = io(API_URL, { withCredentials: true, auth: { role: 'staff' }, reconnectionDelayMax: 10000 });
    let everConnected = false;
    socket.on('connect', () => {
      setStatus('live');
      if (everConnected) dispatch({ type: 'resync', at: new Date().toISOString() });
      everConnected = true;
    });
    socket.on('disconnect', (reason) => {
      setStatus('offline');
      // The server only disconnects us deliberately when our access changed.
      if (reason === 'io server disconnect') {
        accessRef.current?.();
        setTimeout(() => socket.connect(), 1500);
      }
    });
    socket.on('connect_error', () => setStatus('offline'));
    socket.on('event', (event) => {
      if (!event?.id || seen.current.includes(event.id)) return;
      seen.current = [event.id, ...seen.current].slice(0, 200);
      setLastEventAt(Date.now());
      if (event.type === 'session.revoked') accessRef.current?.();
      dispatch(event);
    });
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!socket.connected) socket.connect();
      dispatch({ type: 'resync', at: new Date().toISOString() });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, sessionKey, dispatch]);

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const value = useMemo(() => ({ status, lastEventAt, subscribe }), [status, lastEventAt, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
