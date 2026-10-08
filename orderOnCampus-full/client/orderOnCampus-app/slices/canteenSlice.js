import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    canteen: null,
}

export const canteenSlice = createSlice({
    name: 'canteen',
    initialState,
    reducers: {
        setCanteen: (state, action) => {
            state.canteen = action.payload;
        },
    },
})

// Action creators are generated for each case reducer function
export const { setCanteen } = canteenSlice.actions;

export const selectCanteen = state => state.canteen.canteen;

export default canteenSlice.reducer