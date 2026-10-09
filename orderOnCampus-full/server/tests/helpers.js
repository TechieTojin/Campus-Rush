// Test helpers: an HTTP client with a per-actor cookie jar and CSRF handling, and Socket.IO clients.
// Tests run against the locally running API (default http://localhost:5001) using credentials from
// server/.env. They never print credentials, cookies or tokens.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { io } = require('socket.io-client');

const BASE = (process.env.TEST_API_URL || 'http://localhost:5001').replace(/\/$/, '');
const RUN = Date.now().toString(36);

class Client {
  constructor(name) { this.name = name; this.jar = {}; this.bearer = null; }

  cookieHeader() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; '); }

  async req(method, url, body, { raw, type, csrf = true, headers: extra = {} } = {}) {
    const headers = { ...extra };
    const cookie = this.cookieHeader();
    if (cookie) headers.Cookie = cookie;
    if (this.bearer) headers.Authorization = `Bearer ${this.bearer}`;
    if (csrf && method !== 'GET') {
      const token = this.jar.admin_csrf || this.jar.staff_csrf;
      if (token) headers['X-CSRF-Token'] = token;
    }
    let payload;
    if (raw) { payload = raw; headers['Content-Type'] = type; }
    else if (body !== undefined && method !== 'GET') { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
    const res = await fetch(BASE + url, { method, headers, body: payload });
    for (const c of res.headers.getSetCookie?.() || []) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i);
      const v = kv.slice(i + 1);
      if (!v || /expires=Thu, 01 Jan 1970/i.test(c)) delete this.jar[k]; else this.jar[k] = v;
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  }

  get(url, opts) { return this.req('GET', url, undefined, opts); }
  post(url, body, opts) { return this.req('POST', url, body, opts); }
  put(url, body, opts) { return this.req('PUT', url, body, opts); }
  del(url, opts) { return this.req('DELETE', url, undefined, opts); }
}

const asAdmin = async (email = process.env.ADMIN_BOOTSTRAP_EMAIL, password = process.env.ADMIN_BOOTSTRAP_PASSWORD) => {
  const c = new Client('admin');
  const r = await c.post('/admin/auth/login', { email, password }, { csrf: false });
  if (r.status !== 200) throw new Error(`admin login failed (${r.status})`);
  return c;
};

const asStaff = async (email, password) => {
  const c = new Client('staff');
  const r = await c.post('/staff/login', { email, password }, { csrf: false });
  if (r.status !== 200) throw new Error(`staff login failed (${r.status})`);
  c.me = (await c.get('/staff/auth')).json?.data;
  return c;
};

const asStudent = async (email, password) => {
  const c = new Client('student');
  const r = await c.post('/users/login', { email, password });
  if (r.json?.status !== 'ok') throw new Error('student login failed');
  c.bearer = r.json.data;
  c.me = (await c.post('/users/get-user', { token: c.bearer })).json?.data;
  return c;
};

// Socket that records every event it receives.
const socket = (opts) => new Promise((resolve) => {
  const s = io(BASE, { transports: ['websocket'], reconnection: false, timeout: 5000, ...opts });
  s.events = [];
  s.on('event', (e) => s.events.push(e));
  s.on('connect', () => resolve({ ok: true, s }));
  s.on('connect_error', (err) => resolve({ ok: false, s, error: err.message }));
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, { timeout = 4000, step = 50 } = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await fn()) return Date.now() - start; await wait(step); }
  return -1;
};

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc00000030101009d0f2a0f0000000049454e44ae426082', 'hex');
const HASH = /\$2[aby]\$\d{2}\$/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;

module.exports = { BASE, RUN, Client, asAdmin, asStaff, asStudent, socket, wait, until, PNG, HASH, EMAIL };
