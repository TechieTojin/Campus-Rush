import { createContext, useContext, useEffect, useRef } from 'react';

// Provided by RealtimeProvider (lib/realtime.jsx).
export const RealtimeContext = createContext({ status: 'off', lastEventAt: null, subscribe: () => () => {} });

export const useRealtimeStatus = () => useContext(RealtimeContext);

// Calls `handler(event)` for matching event types (or '*'), plus `{ type: 'resync' }` after a reconnect.
// Events are only hints — handlers refetch from the API; payloads are never treated as data.
// Bursts are coalesced with a short debounce so one change doesn't trigger several refetches.
export function useRealtime(types, handler, { debounceMs = 300 } = {}) {
  const { subscribe } = useContext(RealtimeContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const key = Array.isArray(types) ? types.join('|') : types;
  useEffect(() => {
    const wanted = key.split('|');
    let timer = null;
    let last = null;
    const unsubscribe = subscribe((event) => {
      if (event.type !== 'resync' && !wanted.includes('*') && !wanted.includes(event.type)) return;
      last = event;
      clearTimeout(timer);
      timer = setTimeout(() => handlerRef.current(last), debounceMs);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [key, subscribe, debounceMs]);
}
