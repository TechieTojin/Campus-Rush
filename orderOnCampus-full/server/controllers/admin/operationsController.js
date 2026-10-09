// Platform-wide dashboard, analytics, orders and menu oversight for admins.
const { Canteen, Staff, User, Order, MenuItem, Activity, AuditLog } = require('../../lib/models');
const { transitionOrder, STATUSES } = require('../../lib/orders');
const { _internals: M } = require('../manageController');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const fail = (res, status, message) => res.status(status).json({ message });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ACTIVE_STUDENT_DAYS = 30;

// Date range in India time; defaults to the last 30 days, at most a year.
const range = (q) => {
    const today = M.dayKey(new Date());
    const to = M.DATE.test(q.to || '') ? q.to : today;
    const from = M.DATE.test(q.from || '') ? q.from : M.addDays(to, -29);
    if (from > to) return { error: 'Start date must be before end date' };
    if ((M.startOfDay(to) - M.startOfDay(from)) / 86400000 > 366) return { error: 'Choose a range of at most one year' };
    return { from, to };
};

const canteenNames = async () => new Map((await Canteen.find({}, 'name').lean()).map((c) => [String(c._id), c.name]));

// Per-canteen totals using the same definitions as the canteen website.
const byCanteen = (orders, names) => {
    const map = new Map();
    orders.forEach((o) => {
        const key = String(o.canteen);
        const e = map.get(key) || { canteenId: key, name: names.get(key) || 'Unknown canteen', orders: [] };
        e.orders.push(o);
        map.set(key, e);
    });
    return [...map.values()].map((e) => ({ canteenId: e.canteenId, name: e.name, ...M.summarise(e.orders) })).sort((a, b) => b.grossValue - a.grossValue);
};

const paymentSplit = (orders) => {
    const open = orders.filter((o) => o.status !== 'Cancelled');
    return {
        paidCount: open.filter((o) => o.paymentStatus === 'paid').length,
        unpaidCount: open.filter((o) => o.paymentStatus !== 'paid').length,
        // Completed (handed over) but no payment recorded by staff — worth following up.
        completedUnpaidCount: open.filter((o) => o.status === 'Completed' && o.paymentStatus !== 'paid').length,
        completedUnpaidValue: M.round2(open.filter((o) => o.status === 'Completed' && o.paymentStatus !== 'paid').reduce((s, o) => s + o.totalPrice, 0)),
    };
};

exports.overview = async (req, res) => {
    const r = range(req.query);
    if (r.error) return fail(res, 400, r.error);
    const today = M.dayKey(new Date());
    const since = new Date(Date.now() - ACTIVE_STUDENT_DAYS * 86400000);
    const [names, students, suspendedStudents, activeStudentIds, canteenCounts, staffCounts, menuIds, inRange, all, activity] = await Promise.all([
        canteenNames(),
        User.countDocuments(),
        User.countDocuments({ status: 'suspended' }),
        Order.distinct('user', { timestamp: { $gte: since } }),
        Canteen.aggregate([{ $group: { _id: { $ifNull: ['$status', 'active'] }, n: { $sum: 1 } } }]),
        Staff.aggregate([{ $group: { _id: { $ifNull: ['$status', 'active'] }, n: { $sum: 1 } } }]),
        Canteen.distinct('menu'),
        Order.find({ timestamp: { $gte: M.startOfDay(r.from), $lte: M.endOfDay(r.to) } }).populate('items', 'name price category').lean(),
        Order.find({}, 'status totalPrice paymentStatus timestamp canteen').lean(),
        Activity.find().sort({ createdAt: -1 }).limit(12).lean(),
    ]);
    const items = await MenuItem.find({ _id: { $in: menuIds } }, 'name price available category canteen').lean();
    const todays = all.filter((o) => M.dayKey(o.timestamp) === today);
    const cc = Object.fromEntries(canteenCounts.map((c) => [c._id, c.n]));
    const sc = Object.fromEntries(staffCounts.map((c) => [c._id, c.n]));
    const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((o) => o.status === s).length]));
    res.json({
        status: 'ok',
        data: {
            range: r,
            definitions: { activeStudents: `Students who placed at least one order in the last ${ACTIVE_STUDENT_DAYS} days` },
            students: { total: students, active: activeStudentIds.length, suspended: suspendedStudents },
            canteens: { total: Object.values(cc).reduce((a, b) => a + b, 0), active: cc.active || 0, pending: cc.pending || 0, suspended: cc.suspended || 0, rejected: cc.rejected || 0 },
            staff: { total: Object.values(sc).reduce((a, b) => a + b, 0), active: sc.active || 0, invited: sc.invited || 0, suspended: sc.suspended || 0 },
            menu: { total: items.length, available: items.filter((i) => i.available).length },
            orders: { total: all.length, byStatus: statusCounts },
            today: M.summarise(todays),
            allTime: { ...M.summarise(all), payments: paymentSplit(all) },
            period: { ...M.summarise(inRange), payments: paymentSplit(inRange) },
            daily: M.series(inRange, r.from, r.to),
            topCanteens: byCanteen(inRange, names).slice(0, 5),
            popular: M.itemSales(inRange, items).items.slice(0, 8).map((i) => ({ ...i, canteen: names.get(String(items.find((x) => String(x._id) === i.itemId)?.canteen)) || '' })),
            activity: activity.map((a) => ({ ...a, canteenName: names.get(String(a.canteen)) || '' })),
        },
    });
};

exports.analytics = async (req, res) => {
    const r = range(req.query);
    if (r.error) return fail(res, 400, r.error);
    const filter = { timestamp: { $gte: M.startOfDay(r.from), $lte: M.endOfDay(r.to) } };
    if (OBJECT_ID.test(req.query.canteen || '')) filter.canteen = req.query.canteen;
    const [orders, names, menuIds] = await Promise.all([
        Order.find(filter).populate('items', 'name price category').lean(),
        canteenNames(),
        Canteen.distinct('menu'),
    ]);
    const items = await MenuItem.find({ _id: { $in: menuIds } }, 'name price category canteen').lean();
    const summary = M.summarise(orders);
    const cancelledValue = M.round2(orders.filter((o) => o.status === 'Cancelled').reduce((s, o) => s + o.totalPrice, 0));
    const sales = M.itemSales(orders, items);
    res.json({
        status: 'ok',
        data: {
            ...r,
            timezone: M.TZ,
            summary: { ...summary, cancelledValue, customers: new Set(orders.map((o) => String(o.user))).size, payments: paymentSplit(orders) },
            daily: M.series(orders, r.from, r.to),
            canteens: byCanteen(orders, names),
            items: sales.items.slice(0, 50).map((i) => ({ ...i, canteen: names.get(String(items.find((x) => String(x._id) === i.itemId)?.canteen)) || '' })),
            categories: sales.categories,
            legacyOrders: sales.legacyOrders,
        },
    });
};

// ================================================================= orders

const ordersQuery = async (q) => {
    const filter = {};
    if (OBJECT_ID.test(q.canteen || '')) filter.canteen = q.canteen;
    if (q.status && q.status !== 'all') {
        const list = q.status === 'active' ? M.ACTIVE : String(q.status).split(',').filter((s) => STATUSES.includes(s));
        if (!list.length) return { error: 'Unknown status filter' };
        filter.status = { $in: list };
    }
    if (q.from || q.to) {
        if ((q.from && !M.DATE.test(q.from)) || (q.to && !M.DATE.test(q.to))) return { error: 'Dates must be YYYY-MM-DD' };
        filter.timestamp = {};
        if (q.from) filter.timestamp.$gte = M.startOfDay(q.from);
        if (q.to) filter.timestamp.$lte = M.endOfDay(q.to);
    }
    if (q.payment === 'paid') filter.paymentStatus = 'paid';
    if (q.payment === 'unpaid') filter.paymentStatus = { $ne: 'paid' };
    if (OBJECT_ID.test(q.user || '')) filter.user = q.user;
    const search = str(q.q, 40).replace(/^#/, '');
    if (search) {
        const users = await User.find({ name: new RegExp(M.escapeRegex(search), 'i') }, '_id').limit(200).lean();
        const or = [{ user: { $in: users.map((u) => u._id) } }];
        if (/^[0-9a-fA-F]{1,24}$/.test(search)) or.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${search}$`, options: 'i' } } });
        filter.$or = or;
    }
    return { filter };
};

const withCanteen = (o, names) => ({ ...M.shapeOrder(o), canteen: { _id: o.canteen, name: names.get(String(o.canteen)) || 'Unknown canteen' } });

exports.listOrders = async (req, res) => {
    const { filter, error } = await ordersQuery(req.query);
    if (error) return fail(res, 400, error);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const [total, orders, names] = await Promise.all([
        Order.countDocuments(filter),
        M.populateOrder(Order.find(filter).sort({ timestamp: req.query.sort === 'oldest' ? 1 : -1 }).skip((p - 1) * limit).limit(limit)),
        canteenNames(),
    ]);
    res.json({ status: 'ok', data: orders.map((o) => withCanteen(o, names)), total, page: p, pages: Math.max(1, Math.ceil(total / limit)) });
};

exports.liveOrders = async (req, res) => {
    const today = M.dayKey(new Date());
    const filter = { $or: [{ status: { $in: M.ACTIVE } }, { timestamp: { $gte: M.startOfDay(today) } }] };
    if (OBJECT_ID.test(req.query.canteen || '')) filter.canteen = req.query.canteen;
    const [orders, names] = await Promise.all([M.populateOrder(Order.find(filter).sort({ timestamp: 1 })), canteenNames()]);
    res.json({ status: 'ok', data: orders.map((o) => withCanteen(o, names)), serverTime: new Date() });
};

exports.getOrder = async (req, res) => {
    if (!OBJECT_ID.test(req.params.orderId)) return fail(res, 404, 'Order not found');
    const order = await M.populateOrder(Order.findById(req.params.orderId));
    if (!order) return fail(res, 404, 'Order not found');
    const [names, audit, activity] = await Promise.all([
        canteenNames(),
        AuditLog.find({ 'target.id': String(order._id) }).sort({ at: -1 }).lean(),
        Activity.find({ order: order._id }).sort({ createdAt: 1 }).lean(),
    ]);
    res.json({ status: 'ok', data: { ...withCanteen(order, names), audit: audit.map((a) => ({ action: a.action, actor: a.actor?.name, at: a.at, result: a.result, reason: a.details?.changes?.reason })), activity } });
};

// Admin override: same transition rules as staff, plus a mandatory reason that is audited and shown to the canteen.
exports.setOrderStatus = async (req, res) => {
    if (!OBJECT_ID.test(req.params.orderId)) return fail(res, 404, 'Order not found');
    const reason = str(req.body?.reason, 300);
    if (reason.length < 5) return fail(res, 400, 'Give a reason for this change (at least 5 characters)');
    const order = await Order.findById(req.params.orderId);
    if (!order) return fail(res, 404, 'Order not found');
    const result = await transitionOrder(order, req.body?.status, { actor: 'admin', actorName: res.locals.admin.name, reason });
    if (!result.order) return fail(res, result.status, result.message);
    res.locals.auditOutcome = { from: order.status, to: result.order.status };
    res.json({ status: 'ok', data: { _id: result.order._id, status: result.order.status } });
};

// ================================================================= global menu

exports.listMenu = async (req, res) => {
    const canteens = await Canteen.find(OBJECT_ID.test(req.query.canteen || '') ? { _id: req.query.canteen } : {}, 'name menu menuCategories status').lean();
    const owner = new Map();
    canteens.forEach((c) => c.menu.forEach((id) => owner.set(String(id), c)));
    const filter = { _id: { $in: [...owner.keys()] } };
    const q = str(req.query.q, 60);
    if (q) filter.name = new RegExp(M.escapeRegex(q), 'i');
    if (req.query.availability === 'available') filter.available = true;
    if (req.query.availability === 'unavailable') filter.available = false;
    if (typeof req.query.category === 'string' && req.query.category) filter.category = req.query.category === '__none' ? '' : req.query.category;
    const items = await MenuItem.find(filter).sort({ updatedAt: -1, name: 1 }).limit(500).lean();
    res.json({
        status: 'ok',
        data: items.map((i) => {
            const c = owner.get(String(i._id));
            return { ...i, canteen: { _id: c._id, name: c.name, status: c.status || 'active' } };
        }),
        canteens: canteens.map((c) => ({ _id: c._id, name: c.name, categories: c.menuCategories || [], status: c.status || 'active' })),
    });
};

exports.itemActivity = async (req, res) => {
    if (!OBJECT_ID.test(req.params.itemId)) return fail(res, 404, 'Item not found');
    const [activity, audit] = await Promise.all([
        Activity.find({ item: req.params.itemId }).sort({ createdAt: -1 }).limit(30).lean(),
        AuditLog.find({ 'details.params.itemId': req.params.itemId }).sort({ at: -1 }).limit(30).lean(),
    ]);
    res.json({ status: 'ok', data: { activity, audit: audit.map((a) => ({ action: a.action, actor: a.actor?.name, at: a.at, result: a.result, changes: a.details?.changes })) } });
};
