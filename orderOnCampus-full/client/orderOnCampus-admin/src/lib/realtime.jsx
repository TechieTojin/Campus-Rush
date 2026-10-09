import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from './api';
import { RealtimeContext } from './realtimeContext';

// One authenticated Socket.IO connection per tab. The server authenticates it from the HttpOnly
// admin cookie and decides which rooms it joins; this client can't subscribe to anything itself.
export function RealtimeProvider({ enabled, children }) {
  const [status, setStatus] = useState('off'); // off | connecting | live | offline
  const [lastEventAt, setLastEventAt] = useState(null);
  const listeners = useRef(new Set());
  const seen = useRef([]);

  const dispatch = useCallback((event) => {
    listeners.current.forEach((fn) => { try { fn(event); } catch (e) { console.error(e); } });
  }, []);

  useEffect(() => {
    if (!enabled) { setStatus('off'); return undefined; }
    setStatus('connecting');
    const socket = io(API_URL, { withCredentials: true, auth: { role: 'admin' }, reconnectionDelayMax: 10000 });
    let everConnected = false;
    socket.on('connect', () => {
      setStatus('live');
      // After any reconnect, data may have changed while we were away: ask pages to refetch.
      if (everConnected) dispatch({ type: 'resync', at: new Date().toISOString() });
      everConnected = true;
    });
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.on('event', (event) => {
      if (!event?.id || seen.current.includes(event.id)) return; // drop duplicates
      seen.current = [event.id, ...seen.current].slice(0, 200);
      setLastEventAt(Date.now());
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
  }, [enabled, dispatch]);

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const value = useMemo(() => ({ status, lastEventAt, subscribe }), [status, lastEventAt, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
