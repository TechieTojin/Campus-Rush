import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'token';

const http = axios.create({ baseURL: API_URL, timeout: 15000 });

let unauthorizedHandler = null;
export const onUnauthorized = (handler) => {
  unauthorizedHandler = handler;
};

http.interceptors.request.use(async (config) => {
  if (!config.skipAuth) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && !error.config?.skipAuth && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);

export const saveSession = async (token) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem('isLoggedIn', 'true');
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, 'isLoggedIn']);
};

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response) {
    const data = error.response.data;
    if (data && typeof data === 'object' && (data.message || data.error)) return data.message || data.error;
    if (typeof data === 'string' && data.length < 120) return data;
    return fallback;
  }
  if (error?.request) return "Can't reach Campus Rush right now. Check your connection and try again.";
  return error?.message || fallback;
};

export const isNetworkError = (error) => !!error?.request && !error?.response;

// The backend answers login failures with HTTP 200 and a plain string.
export async function login(email, password) {
  const res = await http.post('/users/login', { email: email.trim(), password }, { skipAuth: true });
  if (res.data?.status === 'ok' && res.data.data) {
    await saveSession(res.data.data);
    return res.data.data;
  }
  if (res.data === 'Incorrect password') throw new Error('Incorrect password. Please try again.');
  if (res.data === 'No user found') throw new Error('No account found with that email.');
  throw new Error('Could not sign in. Please try again.');
}

export async function register({ name, email, password }) {
  const res = await http.post('/users/register', { name: name.trim(), email: email.trim(), password }, { skipAuth: true });
  if (res.data === 'exists') throw new Error('An account with this email already exists. Try signing in.');
  return res.data;
}

export async function fetchMe() {
  const token = await getToken();
  if (!token) {
    const err = new Error('Not signed in');
    err.response = { status: 401 };
    throw err;
  }
  const res = await http.post('/users/get-user', { token });
  return res.data.data;
}

export const updateProfile = async (body) => (await http.put('/users/me', body)).data.data;
export const changePassword = async (body) => (await http.put('/users/me/password', body)).data;

export const getCanteens = async () => (await http.get('/canteens/get-canteens', { skipAuth: true })).data.data || [];
export const getCanteen = async (id) => (await http.get(`/canteens/${id}/get-canteen`, { skipAuth: true })).data.data;
export const getPopularItems = async (canteenId) =>
  (await http.get(`/most-ordered-item/${canteenId}`, { skipAuth: true })).data.data || [];

export const addFavorite = (canteenId) => http.post('/users/set-fav', { canteenId });
export const removeFavorite = (canteenId) => http.delete(`/users/favoriteCanteens/${canteenId}`);

export const placeOrder = async ({ canteenId, itemIds }) =>
  (await http.post('/users/place-order', { canteen: canteenId, items: itemIds })).data;
export const getMyOrders = async () => (await http.get('/users/me/orders')).data.data || [];

export default http;
