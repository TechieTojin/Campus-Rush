import { createSlice } from '@reduxjs/toolkit';

// items: [{ _id, name, price, description, available, quantity }]
const initialState = {
  canteen: null,
  items: [],
};

const pickItem = ({ _id, name, price, description, available }) => ({ _id, name, price, description, available });
const pickCanteen = ({ _id, name, location }) => ({ _id, name, location });

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
    setQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const existing = state.items.find(i => i._id === itemId);
      if (!existing) return;
      if (quantity <= 0) state.items = state.items.filter(i => i._id !== itemId);
      else existing.quantity = quantity;
      if (!state.items.length) state.canteen = null;
    },
    removeFromCart: (state, action) => {
      const existing = state.items.find(i => i._id === action.payload._id);
      if (!existing) return;
      existing.quantity -= 1;
      if (existing.quantity <= 0) state.items = state.items.filter(i => i._id !== action.payload._id);
      if (!state.items.length) state.canteen = null;
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

export const { addToCart, setQuantity, removeFromCart, removeItem, emptyCart } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCanteen = (state) => state.cart.canteen;
export const selectCartCount = (state) => state.cart.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartTotal = (state) => state.cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
export const selectItemQuantity = (itemId) => (state) =>
  state.cart.items.find(i => i._id === itemId)?.quantity || 0;

export default cartSlice.reducer;
