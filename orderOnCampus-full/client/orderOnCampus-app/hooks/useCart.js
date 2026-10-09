import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../components/ui/feedback';
import { animateLayout } from '../components/ui/primitives';
import { addToCart, removeItem, restoreItem, selectCartCanteen, selectCartCount, selectCartItems, setCart, setQuantity } from '../slices/CartSlice';
import { orderLines } from '../utils/format';
import { useAppConfig } from './useAppConfig';

// Server defaults (Platform settings → order limits); the app mirrors them so students hear about
// a limit before checkout rather than from a rejected order.
export function useOrderLimits() {
  const ordering = useAppConfig().ordering || {};
  return { maxItems: ordering.maxItemsPerOrder || 20, maxQty: ordering.maxQuantityPerItem || 10 };
}

export default function useCart() {
  const dispatch = useDispatch();
  const cartCanteen = useSelector(selectCartCanteen);
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const { maxItems, maxQty } = useOrderLimits();

  const confirmSwitch = useCallback((canteen, commit) => {
    if (cartCanteen && cartCanteen._id !== canteen._id) {
      Alert.alert(
        'Start a new cart?',
        `Your cart has items from ${cartCanteen.name}. An order can only come from one canteen, so this will replace your current cart.`,
        [{ text: 'Keep current cart', style: 'cancel' }, { text: 'Start new cart', style: 'destructive', onPress: commit }]
      );
      return;
    }
    commit();
  }, [cartCanteen]);

  const add = useCallback((item, canteen, quantity = 1, { toast = true } = {}) => {
    const sameCanteen = !cartCanteen || cartCanteen._id === canteen._id;
    const current = sameCanteen ? items.find(i => i._id === item._id)?.quantity || 0 : 0;
    const baseCount = sameCanteen ? count : 0;
    const allowed = Math.max(0, Math.min(maxQty - current, maxItems - baseCount, quantity));
    if (!allowed) {
      showToast(current >= maxQty ? `You can order up to ${maxQty} of the same item` : `An order can have up to ${maxItems} items`, 'alert-circle');
      return;
    }
    confirmSwitch(canteen, () => {
      dispatch(addToCart({ item, canteen, quantity: allowed }));
      if (toast) showToast(allowed < quantity ? `Added ${allowed} — that's the limit per order` : `${item.name} added to cart`, 'shopping-bag');
    });
  }, [cartCanteen, items, count, maxQty, maxItems, confirmSwitch, dispatch]);

  // Remove a whole line with an Undo that restores it in place.
  const remove = useCallback((itemId) => {
    const index = items.findIndex(i => i._id === itemId);
    if (index === -1) return;
    const line = items[index];
    const canteen = cartCanteen;
    animateLayout();
    dispatch(removeItem(itemId));
    showToast(`Removed ${line.name}`, 'trash-2', { actionLabel: 'Undo', onAction: () => { animateLayout(); dispatch(restoreItem({ item: line, index, canteen })); } });
  }, [items, cartCanteen, dispatch]);

  const update = useCallback((itemId, quantity) => {
    const current = items.find(i => i._id === itemId)?.quantity || 0;
    if (quantity > current) {
      if (quantity > maxQty) { showToast(`You can order up to ${maxQty} of the same item`, 'alert-circle'); return; }
      if (count + (quantity - current) > maxItems) { showToast(`An order can have up to ${maxItems} items`, 'alert-circle'); return; }
    }
    if (quantity <= 0) { remove(itemId); return; }
    dispatch(setQuantity({ itemId, quantity }));
  }, [items, count, maxQty, maxItems, remove, dispatch]);

  // Rebuild a past order from the live menu. Unavailable or removed items are skipped and reported.
  const reorder = useCallback((order, canteen, onDone) => {
    if (!canteen) { showToast('This canteen is no longer on Campus Rush', 'alert-circle'); return; }
    if (canteen.openStatus === false || canteen.status === 'suspended') { showToast(`${canteen.name} isn't taking orders right now`, 'alert-circle'); return; }
    const { lines } = orderLines(order);
    const added = [];
    const skipped = [];
    let total = 0;
    lines.forEach((l) => {
      const live = (canteen.menu || []).find(m => m && String(m._id) === String(l._id));
      if (!live || !live.available) { skipped.push(l.name); return; }
      const q = Math.min(l.quantity, maxQty, maxItems - total);
      if (q <= 0) { skipped.push(l.name); return; }
      total += q;
      added.push({ ...live, quantity: q });
    });
    if (!added.length) { showToast('None of those items are available right now', 'alert-circle'); return; }
    confirmSwitch(canteen, () => {
      dispatch(setCart({ canteen, items: added }));
      showToast(skipped.length ? `Added ${added.length} item${added.length === 1 ? '' : 's'} · ${skipped.length} unavailable` : 'Added your previous order to the cart', 'repeat');
      onDone?.();
    });
  }, [maxQty, maxItems, confirmSwitch, dispatch]);

  return { add, update, remove, reorder, cartCanteen, maxQty, maxItems, count };
}
