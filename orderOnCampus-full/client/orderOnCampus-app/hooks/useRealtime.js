import { useEffect, useRef, useState } from 'react';
import { getRealtimeStatus, subscribeRealtime, subscribeRealtimeStatus } from '../services/realtime';

// Runs `handler(event)` for the given event types (or '*'), plus `{ type: 'resync' }` after a reconnect
// or when the app returns to the foreground. Bursts are coalesced so one change means one refetch.
export function useRealtime(types, handler, { debounceMs = 300 } = {}) {
  const ref = useRef(handler);
  ref.current = handler;
  const key = Array.isArray(types) ? types.join('|') : types;
  useEffect(() => {
    const wanted = key.split('|');
    let timer = null;
    let last = null;
    const off = subscribeRealtime((event) => {
      if (event.type !== 'resync' && !wanted.includes('*') && !wanted.includes(event.type)) return;
      last = event;
      clearTimeout(timer);
      timer = setTimeout(() => ref.current(last), debounceMs);
    });
    return () => { clearTimeout(timer); off(); };
  }, [key, debounceMs]);
}

export function useRealtimeStatus() {
  const [status, setStatus] = useState(getRealtimeStatus);
  useEffect(() => subscribeRealtimeStatus(setStatus), []);
  return status;
}
