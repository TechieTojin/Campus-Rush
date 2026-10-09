// Admin management of canteens, staff accounts and students.
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Canteen, Staff, User, Order, MenuItem, Activity, AuditLog } = require('../../lib/models');
const realtime = require('../../lib/realtime');
const { _internals: M } = require('../manageController');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const EMAIL = /^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ message });
const page = (q) => ({ page: Math.max(1, parseInt(q.page, 10) || 1), limit: Math.min(100, Math.max(1, parseInt(q.limit, 10) || 25)) });
const registeredAt = (doc) => doc.createdAt || mongoose.Types.ObjectId.createFromHexString(String(doc._id)).getTimestamp();
const CANTEEN_APP_URL = (process.env.CANTEEN_APP_URL || 'http://localhost:5173').replace(/\/$/, '');

const newSetupToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, hash: crypto.createHash('sha256').update(token).digest('hex'), expires: new Date(Date.now() + 72 * 3600 * 1000) };
};

const emitCanteen = (canteenId) => realtime.emit('canteen.updated', { canteenId: String(canteenId) }, { admin: true, students: true, canteen: String(canteenId) });

// Loads :canteenId for admin routes so the shared canteen handlers (menu, categories, profile) can run.
exports.loadCanteen = async (req, res, next) => {
    const { canteenId } = req.params;
    if (!OBJECT_ID.test(canteenId || '')) return fail(res, 404, 'Canteen not found');
    const canteen = await Canteen.findById(canteenId);
    if (!canteen) return fail(res, 404, 'Canteen not found');
    res.locals.canteen = canteen;
    return next();
};

// ================================================================= canteens

const canteenRow = (c, staffByCanteen, stats) => ({
    _id: c._id, name: c.name, location: c.location, category: c.category, logo: c.logo, coverImage: c.coverImage,
    status: c.status || 'active', statusReason: c.statusReason || '', openStatus: c.openStatus,
    menuCount: c.menu.length, openingTime: c.openingTime, closingTime: c.closingTime,
    staff: (staffByCanteen.get(String(c._id)) || []).map((s) => ({ _id: s._id, name: s.username, role: s.role || 'manager', status: s.status || 'active' })),
    orders: stats?.orders || 0, grossValue: M.round2(stats?.gross || 0),
});

exports.listCanteens = async (req, res) => {
    const filter = {};
    const q = str(req.query.q, 60);
    if (q) filter.$or = [{ name: new RegExp(M.escapeRegex(q), 'i') }, { location: new RegExp(M.escapeRegex(q), 'i') }];
    if (['active', 'pending', 'suspended', 'rejected'].includes(req.query.status)) {
        filter.status = req.query.status === 'active' ? { $nin: ['pending', 'suspended', 'rejected'] } : req.query.status;
    }
    const canteens = await Canteen.find(filter).select('-orders').sort({ name: 1 }).lean();
    const ids = canteens.map((c) => c._id);
    const [staff, stats] = await Promise.all([
        Staff.find({ ownedCanteens: { $in: ids } }, 'username role status ownedCanteens').lean(),
        Order.aggregate([{ $match: { canteen: { $in: ids } } }, { $group: { _id: '$canteen', orders: { $sum: 1 }, gross: { $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalPrice', 0] } } } }]),
    ]);
    const byCanteen = new Map();
    staff.forEach((s) => s.ownedCanteens.forEach((cid) => byCanteen.set(String(cid), [...(byCanteen.get(String(cid)) || []), s])));
    const statMap = new Map(stats.map((s) => [String(s._id), s]));
    const counts = await Canteen.aggregate([{ $group: { _id: { $ifNull: ['$status', 'active'] }, n: { $sum: 1 } } }]);
    res.json({
        status: 'ok',
        data: canteens.map((c) => canteenRow({ ...c, menu: c.menu || [] }, byCanteen, statMap.get(String(c._id)))),
        counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
};

exports.createCanteen = async (req, res) => {
    const b = req.body || {};
    const name = str(b.name, 61);
    const location = str(b.location, 121);
    const category = str(b.category, 41);
    if (name.length < 3 || name.length > 60) return fail(res, 400, 'Canteen name must be 3–60 characters');
    if (location.length < 3 || location.length > 120) return fail(res, 400, 'Location must be 3–120 characters');
    if (!category) return fail(res, 400, 'Choose a canteen type');
    if (await Canteen.findOne({ name: new RegExp(`^${M.escapeRegex(name)}$`, 'i') })) return fail(res, 409, `A canteen called "${name}" already exists`);
    let manager = null;
    if (b.managerId) {
        if (!OBJECT_ID.test(b.managerId)) return fail(res, 400, 'Unknown staff account');
        manager = await Staff.findById(b.managerId);
        if (!manager) return fail(res, 400, 'Unknown staff account');
    }
    const canteen = await Canteen.create({
        name, location, category,
        canteenDescription: str(b.canteenDescription, 500),
        openStatus: false,
        status: 'active',
        statusChangedAt: new Date(),
        createdByAdmin: res.locals.admin._id,
        menu: [], orders: [], menuCategories: [],
    });
    if (manager) {
        await Staff.updateOne({ _id: manager._id }, { $addToSet: { ownedCanteens: canteen._id } });
        realtime.disconnect(`staff:${manager._id}`); // reconnect picks up the new canteen room
    }
    res.locals.auditOutcome = { canteenId: String(canteen._id), manager: manager ? manager.username : null };
    Activity.record({ canteen: canteen._id, type: 'admin_action', actor: 'admin', message: `Canteen created by Campus Rush admin ${res.locals.admin.name}` });
    emitCanteen(canteen._id);
    res.status(201).json({ status: 'ok', data: canteen });
};

exports.getCanteenDetail = async (req, res) => {
    const canteen = res.locals.canteen;
    const today = M.dayKey(new Date());
    const [staff, orders, items, activity, audit] = await Promise.all([
        Staff.find({ ownedCanteens: canteen._id }, 'username email role status lastLoginAt createdAt').lean(),
        Order.find({ canteen: canteen._id }).populate('items', 'name price category').lean(),
        MenuItem.find({ _id: { $in: canteen.menu } }).lean(),
        Activity.find({ canteen: canteen._id }).sort({ createdAt: -1 }).limit(15).lean(),
        AuditLog.find({ 'target.id': String(canteen._id) }).sort({ at: -1 }).limit(15).lean(),
    ]);
    const todays = orders.filter((o) => M.dayKey(o.timestamp) === today);
    const weekStart = M.addDays(today, -13);
    const o = canteen.toObject();
    delete o.orders;
    res.json({
        status: 'ok',
        data: {
            canteen: { ...o, status: o.status || 'active', menuCount: canteen.menu.length },
            staff: staff.map((s) => ({ ...s, role: s.role || 'manager', status: s.status || 'active' })),
            stats: { allTime: M.summarise(orders), today: M.summarise(todays), trend: M.series(orders.filter((x) => M.dayKey(x.timestamp) >= weekStart), weekStart, today) },
            menu: { total: items.length, available: items.filter((i) => i.available).length, categories: canteen.menuCategories || [] },
            popular: M.itemSales(orders, items).items.slice(0, 5),
            activity,
            audit: audit.map((a) => ({ _id: a._id, action: a.action, actor: a.actor?.name, result: a.result, at: a.at })),
        },
    });
};

// pending → active (approve) | rejected · active → suspended · suspended → active · rejected → active
const CANTEEN_TRANSITIONS = { pending: ['active', 'rejected'], active: ['suspended'], suspended: ['active'], rejected: ['active'] };

exports.setCanteenStatus = async (req, res) => {
    const canteen = res.locals.canteen;
    const next = req.body?.status;
    const reason = str(req.body?.reason, 300);
    const current = canteen.status || 'active';
    if (!(CANTEEN_TRANSITIONS[current] || []).includes(next)) return fail(res, 400, `Can’t change a ${current} canteen to ${next || 'that status'}`);
    if ((next === 'suspended' || next === 'rejected') && reason.length < 5) return fail(res, 400, 'Give a reason (at least 5 characters) — staff will see it');
    const before = { status: current, openStatus: canteen.openStatus };
    canteen.status = next;
    canteen.statusReason = next === 'active' ? '' : reason;
    canteen.statusChangedAt = new Date();
    if (next !== 'active') canteen.openStatus = false; // no new orders; existing orders stay with the canteen
    await canteen.save();
    res.locals.auditOutcome = { before, after: { status: next, openStatus: canteen.openStatus } };
    const label = { active: current === 'pending' ? 'approved' : 'reactivated', suspended: 'suspended', rejected: 'rejected' }[next];
    Activity.record({ canteen: canteen._id, type: 'admin_action', actor: 'admin', message: `Canteen ${label} by Campus Rush${reason ? ` — ${reason}` : ''}` });
    emitCanteen(canteen._id);
    res.json({ status: 'ok', data: { _id: canteen._id, status: canteen.status, statusReason: canteen.statusReason, openStatus: canteen.openStatus } });
};

// ================================================================= staff

const staffRow = (s, canteens) => ({
    _id: s._id, name: s.username, email: s.email, role: s.role || 'manager', status: s.status || 'active', statusReason: s.statusReason || '',
    canteens: (s.ownedCanteens || []).map((id) => canteens.get(String(id))).filter(Boolean),
    lastLoginAt: s.lastLoginAt || null, createdAt: registeredAt(s), hasPassword: !!s.password,
});

const canteenNames = async (ids) => new Map((await Canteen.find({ _id: { $in: ids } }, 'name status').lean()).map((c) => [String(c._id), { _id: c._id, name: c.name, status: c.status || 'active' }]));

exports.listStaff = async (req, res) => {
    const filter = {};
    const q = str(req.query.q, 60);
    if (q) filter.$or = [{ username: new RegExp(M.escapeRegex(q), 'i') }, { email: new RegExp(M.escapeRegex(q), 'i') }];
    if (['active', 'suspended', 'invited'].includes(req.query.status)) filter.status = req.query.status === 'active' ? { $nin: ['suspended', 'invited'] } : req.query.status;
    if (OBJECT_ID.test(req.query.canteen || '')) filter.ownedCanteens = req.query.canteen;
    if (req.query.canteen === 'none') filter.ownedCanteens = { $size: 0 };
    const staff = await Staff.find(filter, 'username email role status statusReason ownedCanteens lastLoginAt createdAt password').sort({ username: 1 }).lean();
    const names = await canteenNames(staff.flatMap((s) => s.ownedCanteens || []));
    res.json({ status: 'ok', data: staff.map((s) => staffRow(s, names)) });
};

exports.getStaff = async (req, res) => {
    if (!OBJECT_ID.test(req.params.staffId)) return fail(res, 404, 'Staff account not found');
    const s = await Staff.findById(req.params.staffId, 'username email role status statusReason ownedCanteens lastLoginAt createdAt password').lean();
    if (!s) return fail(res, 404, 'Staff account not found');
    const names = await canteenNames(s.ownedCanteens || []);
    const [activity, audit] = await Promise.all([
        Activity.find({ canteen: { $in: s.ownedCanteens || [] }, actor: 'staff' }).sort({ createdAt: -1 }).limit(15).lean(),
        AuditLog.find({ 'target.id': String(s._id) }).sort({ at: -1 }).limit(20).lean(),
    ]);
    res.json({ status: 'ok', data: { ...staffRow(s, names), activity, audit: audit.map((a) => ({ _id: a._id, action: a.action, actor: a.actor?.name, result: a.result, at: a.at, details: a.details?.outcome })) } });
};

const parseCanteenIds = async (value) => {
    if (value === undefined) return { ids: undefined };
    if (!Array.isArray(value) || value.length > 5 || value.some((id) => !OBJECT_ID.test(id))) return { error: 'Choose up to 5 valid canteens' };
    const found = await Canteen.countDocuments({ _id: { $in: value } });
    if (found !== new Set(value).size) return { error: 'One of the selected canteens doesn’t exist' };
    return { ids: [...new Set(value)] };
};

// Creates an account with no password. The admin receives a one-time setup link (valid 72h) to pass on;
// the staff member chooses their own password. Nobody else ever sees it.
exports.createStaff = async (req, res) => {
    const b = req.body || {};
    const name = str(b.name, 61);
    const email = str(b.email, 121).toLowerCase();
    if (name.length < 2 || name.length > 60) return fail(res, 400, 'Name must be 2–60 characters');
    if (!EMAIL.test(email)) return fail(res, 400, 'Enter a valid email address');
    if (!['manager', 'staff'].includes(b.role || 'manager')) return fail(res, 400, 'Role must be manager or staff');
    const { ids, error } = await parseCanteenIds(b.canteenIds || []);
    if (error) return fail(res, 400, error);
    if (await Staff.findOne({ email: new RegExp(`^${M.escapeRegex(email)}$`, 'i') })) return fail(res, 409, 'A staff account with this email already exists');
    const setup = newSetupToken();
    const staff = await Staff.create({
        username: name, email, password: '', role: b.role || 'manager', status: 'invited', ownedCanteens: ids,
        setupTokenHash: setup.hash, setupTokenExpires: setup.expires, createdByAdmin: res.locals.admin._id,
    });
    res.locals.auditOutcome = { staffId: String(staff._id), canteens: ids.length };
    realtime.emit('staff.updated', { staffId: String(staff._id) }, { admin: true });
    res.status(201).json({ status: 'ok', data: { _id: staff._id, name: staff.username, email: staff.email }, setupUrl: `${CANTEEN_APP_URL}/setup-password?token=${setup.token}`, setupExpires: setup.expires });
};

exports.updateStaff = async (req, res) => {
    if (!OBJECT_ID.test(req.params.staffId)) return fail(res, 404, 'Staff account not found');
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return fail(res, 404, 'Staff account not found');
    const b = req.body || {};
    const before = { name: staff.username, role: staff.role || 'manager', canteens: staff.ownedCanteens.map(String) };
    if (b.name !== undefined) {
        const name = str(b.name, 61);
        if (name.length < 2 || name.length > 60) return fail(res, 400, 'Name must be 2–60 characters');
        staff.username = name;
    }
    if (b.role !== undefined) {
        if (!['manager', 'staff'].includes(b.role)) return fail(res, 400, 'Role must be manager or staff');
        staff.role = b.role;
    }
    const { ids, error } = await parseCanteenIds(b.canteenIds);
    if (error) return fail(res, 400, error);
    if (ids) staff.ownedCanteens = ids;
    await staff.save();
    // Authorization reads assignments from the database on every request, so this applies immediately;
    // realtime sockets reconnect to pick up their new canteen rooms.
    realtime.disconnect(`staff:${staff._id}`);
    res.locals.auditOutcome = { before, after: { name: staff.username, role: staff.role, canteens: staff.ownedCanteens.map(String) } };
    realtime.emit('staff.updated', { staffId: String(staff._id) }, { admin: true, staff: String(staff._id) });
    const names = await canteenNames(staff.ownedCanteens);
    res.json({ status: 'ok', data: staffRow(staff.toObject(), names) });
};

exports.setStaffStatus = async (req, res) => {
    if (!OBJECT_ID.test(req.params.staffId)) return fail(res, 404, 'Staff account not found');
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return fail(res, 404, 'Staff account not found');
    const { status } = req.body || {};
    const reason = str(req.body?.reason, 300);
    if (!['active', 'suspended'].includes(status)) return fail(res, 400, 'Status must be active or suspended');
    if (status === 'suspended' && reason.length < 5) return fail(res, 400, 'Give a reason (at least 5 characters)');
    const before = staff.status || 'active';
    staff.status = status === 'active' ? (staff.password ? 'active' : 'invited') : 'suspended';
    staff.statusReason = status === 'suspended' ? reason : '';
    // Revoke existing sessions on suspension; the account must sign in again after reactivation.
    if (status === 'suspended') staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();
    realtime.emit('session.revoked', { staffId: String(staff._id) }, { staff: String(staff._id) });
    realtime.disconnect(`staff:${staff._id}`);
    realtime.emit('staff.updated', { staffId: String(staff._id) }, { admin: true });
    res.locals.auditOutcome = { before, after: staff.status };
    res.json({ status: 'ok', data: { _id: staff._id, status: staff.status } });
};

// Removes every canteen assignment and signs the account out; the account itself is kept for history.
exports.removeStaffAccess = async (req, res) => {
    if (!OBJECT_ID.test(req.params.staffId)) return fail(res, 404, 'Staff account not found');
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return fail(res, 404, 'Staff account not found');
    const before = staff.ownedCanteens.map(String);
    staff.ownedCanteens = [];
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();
    realtime.emit('session.revoked', { staffId: String(staff._id) }, { staff: String(staff._id) });
    realtime.disconnect(`staff:${staff._id}`);
    realtime.emit('staff.updated', { staffId: String(staff._id) }, { admin: true });
    res.locals.auditOutcome = { removedCanteens: before };
    res.json({ status: 'ok' });
};

// New one-time setup link. The old password stops working and existing sessions end.
exports.resetStaffAccess = async (req, res) => {
    if (!OBJECT_ID.test(req.params.staffId)) return fail(res, 404, 'Staff account not found');
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return fail(res, 404, 'Staff account not found');
    if (staff.status === 'suspended') return fail(res, 400, 'Reactivate the account before sending a new setup link');
    const setup = newSetupToken();
    staff.password = '';
    staff.status = 'invited';
    staff.setupTokenHash = setup.hash;
    staff.setupTokenExpires = setup.expires;
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();
    realtime.emit('session.revoked', { staffId: String(staff._id) }, { staff: String(staff._id) });
    realtime.disconnect(`staff:${staff._id}`);
    res.json({ status: 'ok', setupUrl: `${CANTEEN_APP_URL}/setup-password?token=${setup.token}`, setupExpires: setup.expires });
};

// ================================================================= students

// Only what's needed to manage accounts: name, email, status, dates and order totals. Never passwords or tokens.
exports.listStudents = async (req, res) => {
    const { page: p, limit } = page(req.query);
    const filter = {};
    const q = str(req.query.q, 60);
    if (q) filter.$or = [{ name: new RegExp(M.escapeRegex(q), 'i') }, { email: new RegExp(M.escapeRegex(q), 'i') }];
    if (req.query.status === 'suspended') filter.status = 'suspended';
    if (req.query.status === 'active') filter.status = { $ne: 'suspended' };
    const [total, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter, 'name email status statusReason lastLoginAt createdAt').sort({ _id: -1 }).skip((p - 1) * limit).limit(limit).lean(),
    ]);
    const stats = await Order.aggregate([
        { $match: { user: { $in: users.map((u) => u._id) } } },
        { $group: { _id: '$user', orders: { $sum: 1 }, value: { $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalPrice', 0] } }, last: { $max: '$timestamp' } } },
    ]);
    const map = new Map(stats.map((s) => [String(s._id), s]));
    res.json({
        status: 'ok',
        total, page: p, pages: Math.max(1, Math.ceil(total / limit)),
        data: users.map((u) => ({
            _id: u._id, name: u.name, email: u.email, status: u.status || 'active', statusReason: u.statusReason || '',
            registeredAt: registeredAt(u), lastLoginAt: u.lastLoginAt || null,
            orders: map.get(String(u._id))?.orders || 0, orderValue: M.round2(map.get(String(u._id))?.value || 0), lastOrderAt: map.get(String(u._id))?.last || null,
        })),
    });
};

exports.getStudent = async (req, res) => {
    if (!OBJECT_ID.test(req.params.userId)) return fail(res, 404, 'Student not found');
    const u = await User.findById(req.params.userId, 'name email status statusReason lastLoginAt createdAt favoriteCanteens').populate('favoriteCanteens', 'name').lean();
    if (!u) return fail(res, 404, 'Student not found');
    const orders = await M.populateOrder(Order.find({ user: u._id }).sort({ timestamp: -1 }).limit(50).populate('canteen', 'name'));
    const all = await Order.find({ user: u._id }, 'status totalPrice paymentStatus timestamp').lean();
    const audit = await AuditLog.find({ 'target.id': String(u._id) }).sort({ at: -1 }).limit(10).lean();
    res.json({
        status: 'ok',
        data: {
            _id: u._id, name: u.name, email: u.email, status: u.status || 'active', statusReason: u.statusReason || '',
            registeredAt: registeredAt(u), lastLoginAt: u.lastLoginAt || null,
            favorites: (u.favoriteCanteens || []).map((c) => c.name),
            summary: M.summarise(all),
            orders: orders.map((o) => ({ ...M.shapeOrder(o), canteen: o.canteen ? { _id: o.canteen._id, name: o.canteen.name } : null })),
            audit: audit.map((a) => ({ _id: a._id, action: a.action, actor: a.actor?.name, at: a.at, result: a.result })),
        },
    });
};

exports.setStudentStatus = async (req, res) => {
    if (!OBJECT_ID.test(req.params.userId)) return fail(res, 404, 'Student not found');
    const { status } = req.body || {};
    const reason = str(req.body?.reason, 300);
    if (!['active', 'suspended'].includes(status)) return fail(res, 400, 'Status must be active or suspended');
    if (status === 'suspended' && reason.length < 5) return fail(res, 400, 'Give a reason (at least 5 characters) — the student will see it');
    const user = await User.findById(req.params.userId);
    if (!user) return fail(res, 404, 'Student not found');
    const before = user.status || 'active';
    user.status = status;
    user.statusReason = status === 'suspended' ? reason : '';
    await user.save();
    res.locals.auditOutcome = { before, after: status };
    realtime.emit('account.updated', { userId: String(user._id) }, { user: String(user._id), admin: true });
    res.json({ status: 'ok', data: { _id: user._id, status: user.status } });
};
