import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

// Staff auth is an HttpOnly cookie set by the API; nothing is stored in JS-accessible storage.
const http = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20000 });

// Mutations echo the readable `staff_csrf` cookie (double-submit CSRF protection).
const readCookie = (name) => {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
};
http.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes((config.method || '').toLowerCase())) {
    const token = readCookie('staff_csrf');
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

let onExpired = null;
export const setSessionExpiredHandler = (fn) => { onExpired = fn; };

http.interceptors.response.use(
  (res) => res,
  (error) => {
    // Suspension, revoked sessions and expiry all end the session; the server explains which.
    if (error.response?.status === 401 && !error.config?.skipExpiry && onExpired) onExpired(error.response.data?.message, error.response.data?.code);
    return Promise.reject(error);
  }
);

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response) {
    const data = error.response.data;
    if (data && typeof data === 'object' && (data.message || data.error)) return data.message || data.error;
    if (typeof data === 'string' && data.length < 160 && !data.startsWith('<')) return data;
    if (error.response.status === 403) return "You don't have access to that.";
    if (error.response.status === 404) return 'Not found.';
    return fallback;
  }
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Check your connection and retry.';
  if (error?.request) return "Can't reach the Campus Rush server. Check that it's running and your connection is up.";
  return error?.message || fallback;
};

export const imageUrl = (path) => (path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '');

const data = (p) => p.then((r) => r.data);

// ---- auth / account
export const api = {
  login: (email, password) => data(http.post('/staff/login', { email, password }, { skipExpiry: true })),
  register: (body) => data(http.post('/staff/register', body, { skipExpiry: true })),
  me: () => data(http.get('/staff/auth', { skipExpiry: true })).then((r) => r.data),
  logout: () => data(http.post('/staff/logout')),
  updateAccount: (body) => data(http.put('/staff/me', body)).then((r) => r.data),
  changePassword: (body) => data(http.put('/staff/me/password', body)),
  updatePreferences: (body) => data(http.put('/staff/me/preferences', body)).then((r) => r.data),
  createCanteen: (body) => data(http.post('/canteens', body)),
  setupPassword: (token, password) => data(http.post('/staff/setup-password', { token, password }, { skipExpiry: true })),
  appConfig: () => data(http.get('/app/config')).then((r) => r.data),

  // ---- canteen-scoped (server checks ownership on every call)
  canteen: (cid) => data(http.get(`/staff/canteens/${cid}`)).then((r) => r.data),
  updateCanteen: (cid, body) => data(http.put(`/staff/canteens/${cid}`, body)).then((r) => r.data),
  dashboard: (cid) => data(http.get(`/staff/canteens/${cid}/dashboard`)).then((r) => r.data),
  analytics: (cid, params) => data(http.get(`/staff/canteens/${cid}/analytics`, { params })).then((r) => r.data),

  menu: (cid) => data(http.get(`/staff/canteens/${cid}/menu`)),
  menuItem: (cid, id) => data(http.get(`/staff/canteens/${cid}/menu/${id}`)).then((r) => r.data),
  createItem: (cid, body) => data(http.post(`/staff/canteens/${cid}/menu`, body)).then((r) => r.data),
  updateItem: (cid, id, body) => data(http.put(`/staff/canteens/${cid}/menu/${id}`, body)).then((r) => r.data),
  archiveItem: (cid, id) => data(http.delete(`/staff/canteens/${cid}/menu/${id}`)),
  bulkAvailability: (cid, itemIds, available) => data(http.put(`/staff/canteens/${cid}/menu-availability`, { itemIds, available })),

  categories: (cid) => data(http.get(`/staff/canteens/${cid}/categories`)).then((r) => r.data),
  createCategory: (cid, name) => data(http.post(`/staff/canteens/${cid}/categories`, { name })).then((r) => r.data),
  renameCategory: (cid, from, to) => data(http.put(`/staff/canteens/${cid}/categories/rename`, { from, to })).then((r) => r.data),
  reorderCategories: (cid, order) => data(http.put(`/staff/canteens/${cid}/categories/order`, { order })).then((r) => r.data),
  removeCategory: (cid, name, moveTo) => data(http.put(`/staff/canteens/${cid}/categories/remove`, { name, moveTo })).then((r) => r.data),

  orders: (cid, params) => data(http.get(`/staff/canteens/${cid}/orders`, { params })),
  liveOrders: (cid) => data(http.get(`/staff/canteens/${cid}/orders/live`)),
  order: (cid, id) => data(http.get(`/staff/canteens/${cid}/orders/${id}`)).then((r) => r.data),
  setStatus: (id, status) => data(http.put(`/orders/${id}/status`, { status })),
  setPayment: (cid, id, paid) => data(http.put(`/staff/canteens/${cid}/orders/${id}/payment`, { paid })).then((r) => r.data),

  customers: (cid) => data(http.get(`/staff/canteens/${cid}/customers`)).then((r) => r.data),
  customerOrders: (cid, uid) => data(http.get(`/staff/canteens/${cid}/customers/${uid}/orders`)).then((r) => r.data),

  activity: (cid, params) => data(http.get(`/staff/canteens/${cid}/activity`, { params })),
  announcements: (cid) => data(http.get(`/staff/canteens/${cid}/announcements`)).then((r) => r.data),
  markAnnouncementRead: (cid, id) => data(http.post(`/staff/canteens/${cid}/announcements/${id}/read`)),
  supportTickets: (cid) => data(http.get(`/staff/canteens/${cid}/support`)).then((r) => r.data),
  createSupportTicket: (cid, body) => data(http.post(`/staff/canteens/${cid}/support`, body)).then((r) => r.data),
  markActivitySeen: (cid) => data(http.post(`/staff/canteens/${cid}/activity/seen`)),

  uploadImage: (file, onProgress) =>
    data(http.post('/staff/uploads', file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
    })),
};

// Mirrors the server's transition table (server/controllers/staffController.js), which remains the authority.
export const TRANSITIONS = {
  Placed: ['Processing', 'Cancelled'],
  Processing: ['Ready', 'Completed'],
  Ready: ['Completed'],
  Completed: [],
  Cancelled: [],
};

export default http;
