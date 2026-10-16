import { useEffect, useState } from 'react';
import { loadRecentItems, loadRecentSearches, saveRecentItems, saveRecentSearches } from '../services/storage';

// Recently viewed dishes and recent searches, stored on this device only. Entries are just ids;
// screens resolve them against the live catalogue so prices and availability are always current.
const MAX_ITEMS = 12;
const MAX_SEARCHES = 6;
let items = [];
let searches = [];
let loaded = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn({ items, searches }));

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  [items, searches] = await Promise.all([loadRecentItems(), loadRecentSearches()]);
  emit();
}

export function recordView(itemId, canteenId) {
  if (!itemId || !canteenId) return;
  items = [{ itemId, canteenId, at: Date.now() }, ...items.filter((i) => i.itemId !== itemId)].slice(0, MAX_ITEMS);
  saveRecentItems(items);
  emit();
}

export function recordSearch(q) {
  const term = (q || '').trim();
  if (term.length < 2) return;
  searches = [term, ...searches.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, MAX_SEARCHES);
  saveRecentSearches(searches);
  emit();
}

export function clearRecent() {
  items = [];
  searches = [];
  saveRecentItems(items);
  saveRecentSearches(searches);
  emit();
}

export function useRecent() {
  const [snap, setSnap] = useState({ items, searches });
  useEffect(() => {
    listeners.add(setSnap);
    ensureLoaded();
    setSnap({ items, searches });
    return () => listeners.delete(setSnap);
  }, []);
  return snap;
}
