import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    token: {},
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setToken: (state, action) => {
            state.token = action.payload;
        },
        setUser: (state, action) => {
            state.token = { data: action.payload };
        },
        mergeUser: (state, action) => {
            state.token = { data: { ...(state.token.data || {}), ...action.payload } };
        },
        clearUser: (state) => {
            state.token = {};
        },
    },
});

export const { setToken, setUser, mergeUser, clearUser } = authSlice.actions;
export const selectToken = state => state.auth.token;
export const selectUser = state => state.auth.token?.data || null;
export default authSlice.reducer;
