import { configureStore } from '@reduxjs/toolkit'
import CartSlice from './slices/CartSlice'
import canteenSlice from './slices/canteenSlice'
import authSlice from './slices/AuthSlice'
import { saveCart } from './services/storage'

export const store = configureStore({
  reducer: {
    auth : authSlice,
    cart : CartSlice,
    canteen : canteenSlice
  },
  // Development-only checks; the signed-in user's order history makes them exceed the default 32ms budget.
  middleware: (getDefault) => getDefault({
    serializableCheck: { warnAfter: 200 },
    immutableCheck: { warnAfter: 200 },
  }),
})

// Keep the cart across app restarts (device-local). Prices and availability are re-checked
// against the live menu before checkout, and the server re-prices every order.
let lastCart = store.getState().cart;
let saveTimer = null;
let persistEnabled = false;
export const enableCartPersistence = () => { persistEnabled = true; };
store.subscribe(() => {
  const cart = store.getState().cart;
  if (!persistEnabled || cart === lastCart) return;
  lastCart = cart;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCart(cart), 250);
});
