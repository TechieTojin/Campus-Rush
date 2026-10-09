import { createSlice } from '@reduxjs/toolkit';

// items: [{ _id, name, price, description, available, image, dietary, prepTime, category, quantity }]
const initialState = {
  canteen: null,
  items: [],
};

const pickItem = ({ _id, name, price, description, available, image, dietary, prepTime, category }) =>
  ({ _id, name, price, description, available, image, dietary, prepTime, category });
const pickCanteen = ({ _id, name, location, pickupInstructions }) => ({ _id, name, location, pickupInstructions });

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Caller must confirm before adding an item from a different canteen; this replaces the cart.
    addToCart: (state, action) => {
      const { item, canteen, quantity = 1 } = action.payload;
      if (state.canteen && state.canteen._id !== canteen._id) {
        state.items = [];
      }
      state.canteen = pickCanteen(canteen);
      const existing = state.items.find(i => i._id === item._id);
      if (existing) existing.quantity += quantity;
      else state.items.push({ ...pickItem(item), quantity });
    },
    // Replace the whole cart (reorder, restore from device storage).
    setCart: (state, action) => {
      const { canteen, items } = action.payload || {};
      state.canteen = canteen && items?.length ? pickCanteen(canteen) : null;
      state.items = canteen && items?.length ? items.map(i => ({ ...pickItem(i), quantity: i.quantity })) : [];
    },
    // Undo for a removed line: puts it back where it was.
    restoreItem: (state, action) => {
      const { item, index, canteen } = action.payload;
      if (state.canteen && canteen && state.canteen._id !== canteen._id) return;
      if (!state.canteen && canteen) state.canteen = pickCanteen(canteen);
      if (state.items.some(i => i._id === item._id)) return;
      state.items.splice(Math.min(index ?? state.items.length, state.items.length), 0, item);
    },
    setQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const existing = state.items.find(i => i._id === itemId);
      if (!existing) return;
      if (quantity <= 0) state.items = state.items.filter(i => i._id !== itemId);
      else existing.quantity = quantity;
      if (!state.items.length) state.canteen = null;
    },
    // Keep cart prices/availability in step with the live menu (the server charges current prices).
    syncWithMenu: (state, action) => {
      const { canteenId, menu } = action.payload;
      if (!state.canteen || state.canteen._id !== canteenId) return;
      state.items.forEach((i) => {
        const live = menu.find(m => m._id === i._id);
        if (live) Object.assign(i, { price: live.price, available: !!live.available, name: live.name, image: live.image, dietary: live.dietary, prepTime: live.prepTime });
        else i.available = false;
      });
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => i._id !== action.payload);
      if (!state.items.length) state.canteen = null;
    },
    emptyCart: (state) => {
      state.items = [];
      state.canteen = null;
    },
  },
});

export const { addToCart, setCart, restoreItem, setQuantity, syncWithMenu, removeItem, emptyCart } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCanteen = (state) => state.cart.canteen;
export const selectCartCount = (state) => state.cart.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartTotal = (state) => state.cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
export const selectItemQuantity = (itemId) => (state) =>
  state.cart.items.find(i => i._id === itemId)?.quantity || 0;

export default cartSlice.reducer;
