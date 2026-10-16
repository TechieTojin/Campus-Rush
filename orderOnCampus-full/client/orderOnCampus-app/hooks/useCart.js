import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../components/ui/feedback';
import { confirm } from '../components/ui/sheet';
import { animateLayout } from '../components/ui/primitives';
import { addToCart, removeItem, restoreItem, selectCartCanteen, selectCartCount, selectCartItems, setCart, setQuantity, updateLine } from '../slices/CartSlice';
import { orderLines } from '../utils/format';
import { lineKeyFor, revalidate, syncSelections } from '../utils/customisation';
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
      confirm({
        title: 'Start a new cart?',
        message: `Your cart has items from ${cartCanteen.name}. An order can only come from one canteen, so this replaces your current cart.`,
        confirmLabel: 'Start new cart',
        cancelLabel: 'Keep cart',
        icon: 'shopping-bag',
      }).then((ok) => ok && commit());
      return;
    }
    commit();
  }, [cartCanteen]);

  // `selections`/`instructions` describe one configuration of the dish. The per-dish limit counts
  // every configuration together, matching the server.
  const add = useCallback((item, canteen, quantity = 1, { toast = true, selections = [], instructions = '' } = {}) => {
    const sameCanteen = !cartCanteen || cartCanteen._id === canteen._id;
    const current = sameCanteen ? items.filter(i => i._id === item._id).reduce((n, i) => n + i.quantity, 0) : 0;
    const baseCount = sameCanteen ? count : 0;
    const allowed = Math.max(0, Math.min(maxQty - current, maxItems - baseCount, quantity));
    if (!allowed) {
      showToast(current >= maxQty ? `You can order up to ${maxQty} of the same item` : `An order can have up to ${maxItems} items`, 'alert-circle');
      return;
    }
    confirmSwitch(canteen, () => {
      dispatch(addToCart({ item, canteen, quantity: allowed, selections, instructions }));
      if (toast) showToast(allowed < quantity ? `Added ${allowed} — that's the limit per order` : `${item.name} added to cart`, 'shopping-bag');
    });
  }, [cartCanteen, items, count, maxQty, maxItems, confirmSwitch, dispatch]);

  // Remove a whole line with an Undo that restores it in place.
  const remove = useCallback((lineKey) => {
    const index = items.findIndex(i => i.lineKey === lineKey);
    if (index === -1) return;
    const line = items[index];
    const canteen = cartCanteen;
    animateLayout();
    dispatch(removeItem(lineKey));
    showToast(`Removed ${line.name}`, 'trash-2', { actionLabel: 'Undo', onAction: () => { animateLayout(); dispatch(restoreItem({ item: line, index, canteen })); } });
  }, [items, cartCanteen, dispatch]);

  const update = useCallback((lineKey, quantity) => {
    const line = items.find(i => i.lineKey === lineKey);
    const current = line?.quantity || 0;
    if (quantity > current) {
      const dishTotal = line ? items.filter(i => i._id === line._id).reduce((n, i) => n + i.quantity, 0) : 0;
      if (dishTotal + (quantity - current) > maxQty) { showToast(`You can order up to ${maxQty} of the same item`, 'alert-circle'); return; }
      if (count + (quantity - current) > maxItems) { showToast(`An order can have up to ${maxItems} items`, 'alert-circle'); return; }
    }
    if (quantity <= 0) { remove(lineKey); return; }
    dispatch(setQuantity({ lineKey, quantity }));
  }, [items, count, maxQty, maxItems, remove, dispatch]);

  // Change the choices on a line already in the cart.
  const editLine = useCallback((lineKey, { item, selections = [], instructions = '', quantity } = {}) => {
    animateLayout();
    dispatch(updateLine({ lineKey, item, selections, instructions, quantity }));
  }, [dispatch]);

  // Rebuild a past order from the live menu. Items and option choices that no longer exist are
  // skipped and reported, so a student is never quietly charged for something different.
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
      // The saved choices have to still be orderable, at today's prices.
      const selections = syncSelections(live, l.selections || []);
      if (revalidate(live, selections)) { skipped.push(l.name); return; }
      const q = Math.min(l.quantity, maxQty, maxItems - total);
      if (q <= 0) { skipped.push(l.name); return; }
      total += q;
      added.push({ ...live, quantity: q, selections, instructions: l.instructions || '', lineKey: lineKeyFor(live._id, selections, l.instructions) });
    });
    if (!added.length) { showToast('None of those items are available right now', 'alert-circle'); return; }
    confirmSwitch(canteen, () => {
      dispatch(setCart({ canteen, items: added }));
      showToast(skipped.length ? `Added ${added.length} item${added.length === 1 ? '' : 's'} · ${skipped.length} unavailable` : 'Added your previous order to the cart', 'repeat');
      onDone?.();
    });
  }, [maxQty, maxItems, confirmSwitch, dispatch]);

  return { add, update, remove, editLine, reorder, cartCanteen, maxQty, maxItems, count };
}
