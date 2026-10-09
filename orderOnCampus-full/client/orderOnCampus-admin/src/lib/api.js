import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');

// The admin session is an HttpOnly cookie set by the API. Mutations echo the readable
// `admin_csrf` cookie in a header (double-submit), which other sites cannot read.
const http = axios.create({ baseURL: `${API_URL}/admin`, withCredentials: true, timeout: 20000 });

const readCookie = (name) => {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
};

http.interceptors.request.use((config) => {
  if (['post', 'put', 'patch', 'delete'].includes((config.method || '').toLowerCase())) {
    const token = readCookie('admin_csrf');
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

let onExpired = null;
export const setSessionExpiredHandler = (fn) => { onExpired = fn; };

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipExpiry && onExpired) onExpired(error.response.data?.message);
    return Promise.reject(error);
  }
);

export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response) {
    const data = error.response.data;
    if (data && typeof data === 'object' && data.message) return data.message;
    if (error.response.status === 403) return 'Your administrator role doesn’t allow this.';
    if (error.response.status === 404) return 'Not found.';
    if (error.response.status === 429) return 'Too many attempts. Please wait and try again.';
    return fallback;
  }
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Check your connection and retry.';
  if (error?.request) return 'Can’t reach the Campus Rush server. Check that it’s running and your connection is up.';
  return error?.message || fallback;
};

export const imageUrl = (path) => (path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : '');

const data = (p) => p.then((r) => r.data);
const get = (url, params) => data(http.get(url, { params }));

export const api = {
  // auth
  login: (email, password) => data(http.post('/auth/login', { email, password }, { skipExpiry: true })),
  setup: (token, password) => data(http.post('/auth/setup', { token, password }, { skipExpiry: true })),
  me: () => data(http.get('/auth/me', { skipExpiry: true })).then((r) => r.data),
  logout: () => data(http.post('/auth/logout')),
  logoutAll: () => data(http.post('/auth/logout-all')),
  updateProfile: (body) => data(http.put('/auth/profile', body)).then((r) => r.data),
  changePassword: (body) => data(http.put('/auth/password', body)),
  upload: (file, onProgress) => data(http.post('/uploads', file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
  })),

  overview: (params) => get('/overview', params).then((r) => r.data),
  analytics: (params) => get('/analytics', params).then((r) => r.data),

  canteens: (params) => get('/canteens', params),
  createCanteen: (body) => data(http.post('/canteens', body)).then((r) => r.data),
  canteen: (id) => get(`/canteens/${id}`).then((r) => r.data),
  updateCanteen: (id, body) => data(http.put(`/canteens/${id}`, body)).then((r) => r.data),
  setCanteenStatus: (id, status, reason) => data(http.put(`/canteens/${id}/status`, { status, reason })).then((r) => r.data),
  canteenOrders: (id, params) => get(`/canteens/${id}/orders`, params),

  menu: (params) => get('/menu', params),
  canteenMenu: (cid) => get(`/canteens/${cid}/menu`),
  menuItem: (cid, id) => get(`/canteens/${cid}/menu/${id}`).then((r) => r.data),
  createItem: (cid, body) => data(http.post(`/canteens/${cid}/menu`, body)).then((r) => r.data),
  updateItem: (cid, id, body) => data(http.put(`/canteens/${cid}/menu/${id}`, body)).then((r) => r.data),
  archiveItem: (cid, id) => data(http.delete(`/canteens/${cid}/menu/${id}`)),
  itemActivity: (id) => get(`/menu/${id}/activity`).then((r) => r.data),

  categories: (cid) => get(`/canteens/${cid}/categories`).then((r) => r.data),
  createCategory: (cid, name) => data(http.post(`/canteens/${cid}/categories`, { name })).then((r) => r.data),
  renameCategory: (cid, from, to) => data(http.put(`/canteens/${cid}/categories/rename`, { from, to })).then((r) => r.data),
  reorderCategories: (cid, order) => data(http.put(`/canteens/${cid}/categories/order`, { order })).then((r) => r.data),
  removeCategory: (cid, name, moveTo) => data(http.put(`/canteens/${cid}/categories/remove`, { name, moveTo })).then((r) => r.data),

  staff: (params) => get('/staff', params).then((r) => r.data),
  staffMember: (id) => get(`/staff/${id}`).then((r) => r.data),
  createStaff: (body) => data(http.post('/staff', body)),
  updateStaff: (id, body) => data(http.put(`/staff/${id}`, body)).then((r) => r.data),
  setStaffStatus: (id, status, reason) => data(http.put(`/staff/${id}/status`, { status, reason })),
  removeStaffAccess: (id) => data(http.post(`/staff/${id}/remove-access`)),
  resetStaffAccess: (id) => data(http.post(`/staff/${id}/reset-access`)),

  students: (params) => get('/students', params),
  student: (id) => get(`/students/${id}`).then((r) => r.data),
  setStudentStatus: (id, status, reason) => data(http.put(`/students/${id}/status`, { status, reason })),

  orders: (params) => get('/orders', params),
  liveOrders: (params) => get('/orders/live', params),
  order: (id) => get(`/orders/${id}`).then((r) => r.data),
  setOrderStatus: (id, status, reason) => data(http.put(`/orders/${id}/status`, { status, reason })),

  announcements: () => get('/announcements').then((r) => r.data),
  createAnnouncement: (body) => data(http.post('/announcements', body)).then((r) => r.data),
  updateAnnouncement: (id, body) => data(http.put(`/announcements/${id}`, body)).then((r) => r.data),

  banners: () => get('/banners').then((r) => r.data),
  createBanner: (body) => data(http.post('/banners', body)).then((r) => r.data),
  updateBanner: (id, body) => data(http.put(`/banners/${id}`, body)).then((r) => r.data),
  deleteBanner: (id) => data(http.delete(`/banners/${id}`)),

  settings: () => get('/settings').then((r) => r.data),
  updateSettings: (body) => data(http.put('/settings', body)).then((r) => r.data),

  tickets: (params) => get('/support', params),
  ticket: (id) => get(`/support/${id}`).then((r) => r.data),
  updateTicket: (id, body) => data(http.put(`/support/${id}`, body)),
  addTicketNote: (id, text, visibility) => data(http.post(`/support/${id}/notes`, { text, visibility })),

  admins: () => get('/admins').then((r) => r.data),
  adminActivity: (id) => get(`/admins/${id}/activity`).then((r) => r.data),
  inviteAdmin: (body) => data(http.post('/admins', body)),
  setAdminRole: (id, role) => data(http.put(`/admins/${id}/role`, { role })).then((r) => r.data),
  setAdminStatus: (id, status) => data(http.put(`/admins/${id}/status`, { status })).then((r) => r.data),

  audit: (params) => get('/audit', params),
  health: () => get('/system/health').then((r) => r.data),
};

// Mirrors server/lib/orders.js, which stays the authority.
export const TRANSITIONS = {
  Placed: ['Processing', 'Cancelled'],
  Processing: ['Ready', 'Completed'],
  Ready: ['Completed'],
  Completed: [],
  Cancelled: [],
};
