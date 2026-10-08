import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import canteenSlice from './slices/canteenSlice'


export const store = configureStore({
    reducer: {
        auth : authSlice,
        canteen: canteenSlice
    },
})