import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-local conveniences only (never account data or anything the server owns).
const KEYS = { cart: 'cr.cart.v1', recentItems: 'cr.recentItems.v1', recentSearches: 'cr.recentSearches.v1' };

const read = async (key, fallback) => {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

export const loadCart = () => read(KEYS.cart, null);
export const saveCart = (cart) => (cart?.items?.length ? write(KEYS.cart, cart) : AsyncStorage.removeItem(KEYS.cart).catch(() => {}));

export const loadRecentItems = () => read(KEYS.recentItems, []);
export const saveRecentItems = (list) => write(KEYS.recentItems, list);

export const loadRecentSearches = () => read(KEYS.recentSearches, []);
export const saveRecentSearches = (list) => write(KEYS.recentSearches, list);

export const clearLocalHistory = () => AsyncStorage.multiRemove([KEYS.recentItems, KEYS.recentSearches]).catch(() => {});
export const clearLocalCart = () => AsyncStorage.removeItem(KEYS.cart).catch(() => {});
