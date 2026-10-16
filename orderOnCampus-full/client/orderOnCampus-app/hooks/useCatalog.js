import { useEffect, useMemo, useState } from 'react';
import { getCanteens, getPopularItems } from '../services/api';
import { subscribeRealtime } from '../services/realtime';

// One shared, live copy of the canteen catalogue (canteens + their menus) for every screen.
// Fetched once, refreshed when staff/admins change menus or canteens (realtime) or on demand.
let state = { canteens: [], status: 'idle', error: null, updatedAt: 0 };
let popular = { list: [], status: 'idle' };
let inflight = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(state));

export function refreshCatalog() {
  if (!inflight) {
    if (state.status === 'idle' || state.status === 'error') { state = { ...state, status: state.canteens.length ? 'ready' : 'loading' }; emit(); }
    inflight = getCanteens()
      .then((canteens) => { state = { canteens, status: 'ready', error: null, updatedAt: Date.now() }; emit(); refreshPopular(canteens); return canteens; })
      .catch((error) => { state = { ...state, status: state.canteens.length ? 'ready' : 'error', error }; emit(); return state.canteens; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

// Real popularity from the server's per-canteen "most ordered" counts.
async function refreshPopular(canteens) {
  const ranked = await Promise.all(
    canteens.filter((c) => c.menu?.length).map(async (c) => {
      try {
        const top = await getPopularItems(c._id);
        return top.map((t) => ({ item: c.menu.find((m) => m.name === t.name), canteen: c, ordered: t.quantity })).filter((p) => p.item);
      } catch {
        return [];
      }
    })
  );
  popular = { list: ranked.flat().sort((a, b) => b.ordered - a.ordered), status: 'ready' };
  state = { ...state }; // new reference so subscribers re-render with the popularity data
  emit();
}

let timer = null;
subscribeRealtime((event) => {
  if (!['menu.updated', 'canteen.updated', 'order.created', 'resync'].includes(event.type)) return;
  clearTimeout(timer);
  timer = setTimeout(refreshCatalog, 400);
});

export const resetCatalog = () => { state = { canteens: [], status: 'idle', error: null, updatedAt: 0 }; popular = { list: [], status: 'idle' }; emit(); };

export const isOpen = (c) => !!c && c.openStatus !== false && c.status !== 'suspended';

export function useCatalog() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = () => setSnap(state);
    listeners.add(fn);
    if (state.status === 'idle') refreshCatalog();
    else setSnap(state);
    return () => listeners.delete(fn);
  }, []);

  const helpers = useMemo(() => {
    const byId = new Map();
    const items = new Map();
    snap.canteens.forEach((c) => {
      byId.set(c._id, c);
      (c.menu || []).forEach((m) => m && items.set(m._id, { item: m, canteen: c }));
    });
    return {
      canteenById: (id) => byId.get(id),
      findItem: (id) => items.get(String(id)),
      allItems: [...items.values()],
    };
  }, [snap.canteens]);

  return { ...snap, ...helpers, popular: popular.list, popularReady: popular.status === 'ready', reload: refreshCatalog };
}
