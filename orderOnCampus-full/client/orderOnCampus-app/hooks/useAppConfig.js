import { useEffect, useState } from 'react';
import { getAppConfig } from '../services/api';
import { subscribeRealtime } from '../services/realtime';

// Validated, server-controlled settings the app supports (maintenance notice, featured canteens,
// feature switches, support contact). Shared by all screens and refreshed when admins change them.
const DEFAULT = { maintenance: { enabled: false, message: '' }, support: {}, studentApp: { featuredCanteens: [], showPopularItems: true, enableFavorites: true }, ordering: {} };
let config = DEFAULT;
let loaded = false;
let inflight = null;
const listeners = new Set();

export function refreshAppConfig() {
  if (!inflight) {
    inflight = getAppConfig()
      .then((c) => { config = { ...DEFAULT, ...c }; loaded = true; listeners.forEach((fn) => fn(config)); return config; })
      .catch(() => config)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

subscribeRealtime((event) => {
  if (event.type === 'config.updated' || event.type === 'resync') refreshAppConfig();
});

export function useAppConfig() {
  const [value, setValue] = useState(config);
  useEffect(() => {
    listeners.add(setValue);
    if (!loaded) refreshAppConfig();
    return () => listeners.delete(setValue);
  }, []);
  return value;
}
