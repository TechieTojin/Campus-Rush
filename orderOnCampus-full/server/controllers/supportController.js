// Support requests: students (app) and canteen staff (website) create them; admins handle them.
// Requesters only ever see their own tickets and the admins' "reply" notes, never internal notes.
const { Ticket, Order, Admin } = require('../lib/models');
const realtime = require('../lib/realtime');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const CATEGORIES = ['order', 'payment', 'account', 'menu', 'app', 'other'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const fail = (res, status, message) => res.status(status).json({ message });

const parseNew = (b) => {
    const subject = typeof b.subject === 'string' ? b.subject.trim() : '';
    const message = typeof b.message === 'string' ? b.message.trim() : '';
    if (subject.length < 4 || subject.length > 120) return { error: 'Subject must be 4–120 characters' };
    if (message.length < 10 || message.length > 2000) return { error: 'Describe the problem in 10–2000 characters' };
    const category = CATEGORIES.includes(b.category) ? b.category : 'other';
    return { data: { subject, message, category } };
};

// What a requester may see.
const requesterView = (t) => ({
    _id: t._id, ref: `S-${String(t._id).slice(-6).toUpperCase()}`, subject: t.subject, message: t.message, category: t.category, status: t.status,
    order: t.order || null, createdAt: t.createdAt, updatedAt: t.updatedAt,
    replies: (t.notes || []).filter((n) => n.visibility === 'reply').map((n) => ({ text: n.text, by: 'Campus Rush support', at: n.at })),
});

const notifyAdmins = (t) => realtime.emit('support.updated', { ticketId: String(t._id) }, { admin: true });

// ---------------------------------------------------------------- students
exports.studentCreate = async (req, res) => {
    const { data, error } = parseNew(req.body || {});
    if (error) return fail(res, 400, error);
    let order;
    if (req.body.orderId) {
        if (!OBJECT_ID.test(req.body.orderId)) return fail(res, 400, 'Unknown order');
        order = await Order.findOne({ _id: req.body.orderId, user: req.user._id }, '_id canteen');
        if (!order) return fail(res, 400, 'That order isn’t on your account');
    }
    const t = await Ticket.create({ ...data, source: 'student', user: req.user._id, order: order?._id, canteen: order?.canteen, history: [{ status: 'open', by: 'student' }] });
    notifyAdmins(t);
    res.status(201).json({ status: 'ok', data: requesterView(t) });
};

exports.studentList = async (req, res) => {
    const items = await Ticket.find({ source: 'student', user: req.user._id }).sort({ updatedAt: -1 }).limit(50).lean();
    res.json({ status: 'ok', data: items.map(requesterView) });
};

// ---------------------------------------------------------------- canteen staff
exports.staffCreate = async (req, res) => {
    const { data, error } = parseNew(req.body || {});
    if (error) return fail(res, 400, error);
    const canteen = res.locals.canteen;
    const t = await Ticket.create({ ...data, source: 'canteen', staff: res.locals.user._id, canteen: canteen._id, history: [{ status: 'open', by: 'staff' }] });
    notifyAdmins(t);
    res.status(201).json({ status: 'ok', data: requesterView(t) });
};

exports.staffList = async (req, res) => {
    const items = await Ticket.find({ source: 'canteen', canteen: res.locals.canteen._id }).sort({ updatedAt: -1 }).limit(50).lean();
    res.json({ status: 'ok', data: items.map(requesterView) });
};

// ---------------------------------------------------------------- admins
exports.adminList = async (req, res) => {
    const filter = {};
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.status === 'unresolved') filter.status = { $in: ['open', 'in_progress'] };
    if (['student', 'canteen'].includes(req.query.source)) filter.source = req.query.source;
    if (req.query.assigned === 'me') filter.assignedTo = res.locals.admin._id;
    if (req.query.assigned === 'none') filter.assignedTo = null;
    const items = await Ticket.find(filter).sort({ updatedAt: -1 }).limit(200)
        .populate('user', 'name').populate('staff', 'username').populate('canteen', 'name').populate('assignedTo', 'name').lean();
    const counts = await Ticket.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    res.json({
        status: 'ok',
        counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
        data: items.map((t) => ({
            _id: t._id, ref: `S-${String(t._id).slice(-6).toUpperCase()}`, source: t.source, subject: t.subject, category: t.category, status: t.status, priority: t.priority,
            requester: t.source === 'student' ? t.user?.name || 'Former student' : t.staff?.username || 'Former staff',
            canteen: t.canteen ? { _id: t.canteen._id, name: t.canteen.name } : null,
            assignedTo: t.assignedTo ? { _id: t.assignedTo._id, name: t.assignedTo.name } : null,
            createdAt: t.createdAt, updatedAt: t.updatedAt,
        })),
    });
};

exports.adminGet = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) return fail(res, 404, 'Ticket not found');
    const t = await Ticket.findById(req.params.id).populate('user', 'name').populate('staff', 'username').populate('canteen', 'name').populate('assignedTo', 'name').populate('order', 'status totalPrice timestamp').lean();
    if (!t) return fail(res, 404, 'Ticket not found');
    res.json({
        status: 'ok',
        data: {
            ...t, ref: `S-${String(t._id).slice(-6).toUpperCase()}`,
            requester: t.source === 'student' ? { type: 'student', _id: t.user?._id, name: t.user?.name || 'Former student' } : { type: 'staff', _id: t.staff?._id, name: t.staff?.username || 'Former staff' },
        },
    });
};

exports.adminUpdate = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) return fail(res, 404, 'Ticket not found');
    const t = await Ticket.findById(req.params.id);
    if (!t) return fail(res, 404, 'Ticket not found');
    const b = req.body || {};
    const before = { status: t.status, assignedTo: t.assignedTo ? String(t.assignedTo) : null, priority: t.priority };
    if (b.status !== undefined) {
        if (!STATUSES.includes(b.status)) return fail(res, 400, 'Unknown status');
        if (b.status !== t.status) t.history.push({ status: b.status, by: res.locals.admin.name });
        t.status = b.status;
    }
    if (b.priority !== undefined) {
        if (!['low', 'normal', 'high'].includes(b.priority)) return fail(res, 400, 'Unknown priority');
        t.priority = b.priority;
    }
    if (b.assignedTo !== undefined) {
        if (b.assignedTo === null || b.assignedTo === '') t.assignedTo = null;
        else if (!OBJECT_ID.test(b.assignedTo) || !(await Admin.exists({ _id: b.assignedTo, status: 'active' }))) return fail(res, 400, 'Assign to an active administrator');
        else t.assignedTo = b.assignedTo;
    }
    await t.save();
    res.locals.auditOutcome = { before, after: { status: t.status, assignedTo: t.assignedTo ? String(t.assignedTo) : null, priority: t.priority } };
    notifyAdmins(t);
    res.json({ status: 'ok' });
};

exports.adminNote = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) return fail(res, 404, 'Ticket not found');
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const visibility = req.body?.visibility === 'reply' ? 'reply' : 'internal';
    if (text.length < 2 || text.length > 2000) return fail(res, 400, 'Note must be 2–2000 characters');
    const t = await Ticket.findById(req.params.id);
    if (!t) return fail(res, 404, 'Ticket not found');
    t.notes.push({ by: res.locals.admin._id, byName: res.locals.admin.name, visibility, text });
    if (visibility === 'reply' && t.status === 'open') { t.status = 'in_progress'; t.history.push({ status: 'in_progress', by: res.locals.admin.name }); }
    await t.save();
    notifyAdmins(t);
    if (visibility === 'reply') {
        if (t.user) realtime.emit('support.updated', { ticketId: String(t._id) }, { user: String(t.user) });
        if (t.canteen && t.source === 'canteen') realtime.emit('support.updated', { ticketId: String(t._id) }, { canteen: String(t.canteen) });
    }
    res.status(201).json({ status: 'ok' });
};
