// Realtime invalidation events over Socket.IO.
//
// Clients never receive data they couldn't already fetch: events only say *what changed*
// (type + ids), and clients refetch through the normal authorized REST endpoints.
// Rooms are assigned on the server from the authenticated identity; clients cannot join rooms.
//
//   admin            every authenticated admin
//   admin:<id>       one admin account (used for session revocation)
//   staff:<id>       one staff account (used for session revocation)
//   canteen:<id>     staff assigned to that canteen
//   canteens         every signed-in staff member (platform announcements only — no private data)
//   user:<id>        one student
//   students         all signed-in students (public menu/canteen/content changes)
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let io = null;
const recent = []; // last events, for the admin system-health page (no payload data beyond ids)
const stats = { emitted: 0, connected: { admin: 0, staff: 0, student: 0 }, rejected: 0, startedAt: new Date() };

const parseCookies = (header = '') =>
  Object.fromEntries(header.split(';').map((p) => p.trim().split('=')).filter(([k, v]) => k && v !== undefined).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

// Resolves the socket's identity exactly like the REST middleware does (including status and token version).
async function authenticate(socket) {
  const { Admin, Staff, User } = require('./models');
  const secret = process.env.JWT_SECRET;
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const want = socket.handshake.auth?.role;

  if ((want === 'admin' || !want) && cookies.admin_token) {
    const d = jwt.verify(cookies.admin_token, secret);
    if (d.typ !== 'admin') throw new Error('bad token');
    const admin = await Admin.findById(d._id);
    if (!admin || admin.status !== 'active' || (admin.tokenVersion || 0) !== (d.tv || 0)) throw new Error('inactive');
    return { kind: 'admin', id: String(admin._id), exp: d.exp, rooms: ['admin', `admin:${admin._id}`] };
  }
  if ((want === 'staff' || !want) && cookies.token) {
    const d = jwt.verify(cookies.token, secret);
    const staff = await Staff.findById(d._id);
    if (!staff || staff.status === 'suspended' || (staff.tokenVersion || 0) !== (d.tv || 0)) throw new Error('inactive');
    return { kind: 'staff', id: String(staff._id), exp: d.exp, rooms: [`staff:${staff._id}`, 'canteens', ...staff.ownedCanteens.map((c) => `canteen:${c}`)] };
  }
  const bearer = socket.handshake.auth?.token;
  if (bearer) {
    const d = jwt.verify(bearer, secret);
    const user = await User.findById(d._id);
    if (!user) throw new Error('inactive');
    return { kind: 'student', id: String(user._id), exp: d.exp, rooms: [`user:${user._id}`, 'students'] };
  }
  throw new Error('unauthenticated');
}

exports.attach = (server) => {
  io = server;
  io.use(async (socket, next) => {
    try {
      socket.data.principal = await authenticate(socket);
      next();
    } catch {
      stats.rejected += 1;
      next(new Error('unauthorized'));
    }
  });
  io.on('connection', (socket) => {
    const p = socket.data.principal;
    p.rooms.forEach((r) => socket.join(r));
    stats.connected[p.kind] += 1;
    // Disconnect when the credential expires so a socket can't outlive its session.
    const ms = p.exp ? p.exp * 1000 - Date.now() : 0;
    const timer = ms > 0 ? setTimeout(() => socket.disconnect(true), Math.min(ms, 2147483000)) : null;
    socket.emit('ready', { kind: p.kind, at: new Date().toISOString() });
    socket.on('disconnect', () => {
      stats.connected[p.kind] = Math.max(0, stats.connected[p.kind] - 1);
      if (timer) clearTimeout(timer);
    });
  });
};

// emit('order.updated', { canteenId, orderId, userId, status }, { canteen, user, admin, students })
exports.emit = (type, ids = {}, targets = {}) => {
  const event = { id: crypto.randomUUID(), type, at: new Date().toISOString(), ...ids };
  recent.unshift({ type, at: event.at, scope: Object.keys(targets).filter((k) => targets[k]).join(',') });
  recent.length = Math.min(recent.length, 50);
  stats.emitted += 1;
  if (!io) return event;
  const rooms = [];
  if (targets.admin) rooms.push('admin');
  if (targets.students) rooms.push('students');
  if (targets.allCanteens) rooms.push('canteens');
  if (targets.canteen) rooms.push(`canteen:${targets.canteen}`);
  if (targets.user) rooms.push(`user:${targets.user}`);
  if (targets.staff) rooms.push(`staff:${targets.staff}`);
  if (rooms.length) io.to(rooms).emit('event', event);
  return event;
};

// Route middleware: run `fn(req, res)` after a successful (2xx) response — used to emit change events
// from shared handlers without touching each one.
exports.afterSuccess = (fn) => (req, res, next) => {
  res.on('finish', () => { if (res.statusCode < 300) { try { fn(req, res); } catch (e) { console.error('realtime emit failed', e.message); } } });
  next();
};

// Change notifications for one canteen's public data (menu, profile, categories).
exports.canteenChanged = (type) => exports.afterSuccess((req, res) => {
  const canteenId = String(res.locals.canteen?._id || req.params.canteenId);
  exports.emit(type, { canteenId, itemId: req.params.itemId }, { admin: true, students: true, canteen: canteenId });
});

// Force-disconnect a principal's sockets (suspension, reassignment, password change).
exports.disconnect = (room) => { if (io) io.in(room).disconnectSockets(true); };

exports.stats = () => ({ ...stats, connected: { ...stats.connected }, recent: recent.slice(0, 20), attached: !!io });
