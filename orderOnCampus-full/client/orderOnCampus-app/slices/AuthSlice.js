import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    token: {}, // Assuming token is an object containing name and email
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setToken: (state, action) => {
            state.token = action.payload;
        },
    },
});

export const { setToken } = authSlice.actions; 
export const selectToken = state => state.auth.token; 
export default authSlice.reducer;
