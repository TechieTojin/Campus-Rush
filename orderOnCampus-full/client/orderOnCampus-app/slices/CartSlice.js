import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      state.items.push(action.payload); // Use push instead of spread operator for appending a single item
    },
    removeFromCart: (state, action) => {
      const indexToRemove = state.items.findIndex(item => item._id === action.payload._id);
      if (indexToRemove !== -1) {
        const itemToRemove = state.items[indexToRemove];
        if (itemToRemove.quantity > 1) {
          state.items[indexToRemove].quantity -= 1;
        } else {
          state.items.splice(indexToRemove, 1);
        }
      }
    },
    emptyCart: (state) => {
      state.items = [];
    },
  },
});

// Action creators are generated for each case reducer function
export const { addToCart, removeFromCart, emptyCart } = cartSlice.actions;

// Selectors
export const selectCartItems = (state) => state.cart.items;

// Memoized selector
export const selectCartTotal = (state) =>
  state.cart.items.reduce((total, item) => total + item.price, 0);

// Reducer
export default cartSlice.reducer;
