import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';

// Loads data on mount / when deps change. `reload({ silent: true })` refreshes without flashing skeletons.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: undefined, error: '', loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async ({ silent } = {}) => {
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, error: '', loading: false });
      return data;
    } catch (e) {
      if (id === seq.current) setState((s) => ({ ...s, error: errorMessage(e), loading: false }));
      return undefined;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
}

// Calls fn every `ms` while the tab is visible, and once immediately when it becomes visible again.
export function usePolling(fn, ms, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled || !ms) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') fnRef.current(); };
    const id = setInterval(tick, ms);
    const onVisible = () => { if (document.visibilityState === 'visible') fnRef.current(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [ms, enabled]);
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Campus Rush Canteen` : 'Campus Rush · Canteen Portal';
  }, [title]);
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

// Warn before leaving a page with unsaved form changes.
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
