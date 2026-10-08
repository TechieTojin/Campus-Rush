import { configureStore } from '@reduxjs/toolkit'
import CartSlice from './slices/CartSlice'
import canteenSlice from './slices/canteenSlice'
import  authSlice  from './slices/AuthSlice'

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

