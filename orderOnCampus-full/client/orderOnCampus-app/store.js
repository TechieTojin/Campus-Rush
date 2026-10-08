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
})

