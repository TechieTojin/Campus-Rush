import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../components/ui/feedback';
import { addFavorite, clearSession, errorMessage, fetchMe, removeFavorite } from '../services/api';
import { clearUser, selectUser, setUser } from '../slices/AuthSlice';
import { emptyCart } from '../slices/CartSlice';
import { store } from '../store';

export const navigationRef = createNavigationContainerRef();

export const resetTo = (name) => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
  }
};

export async function signOut() {
  await clearSession();
  store.dispatch(clearUser());
  store.dispatch(emptyCart());
  resetTo('Login');
}

let expiring = false;
export async function handleSessionExpired() {
  if (expiring) return;
  expiring = true;
  await signOut();
  Alert.alert('Session expired', 'Please sign in again to continue.');
  setTimeout(() => { expiring = false; }, 1500);
}

export async function refreshUser() {
  const user = await fetchMe();
  store.dispatch(setUser(user));
  return user;
}

export function useUser() {
  return useSelector(selectUser);
}

export function useFavorite(canteenId) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const isFavorite = !!user?.favoriteCanteens?.some(c => (c?._id || c) === canteenId);

  const toggle = useCallback(async (canteenName) => {
    if (busy || !canteenId) return;
    setBusy(true);
    try {
      if (isFavorite) await removeFavorite(canteenId);
      else await addFavorite(canteenId);
      const fresh = await fetchMe();
      dispatch(setUser(fresh));
      showToast(isFavorite ? `Removed ${canteenName || 'canteen'} from favorites` : `Saved ${canteenName || 'canteen'} to favorites`, 'heart');
    } catch (e) {
      if (e?.response?.status !== 401) Alert.alert('Favorites', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, canteenId, isFavorite, dispatch]);

  return { isFavorite, toggle, busy };
}
