// System health and audit log browsing. Health reports only what the server can actually observe;
// no secrets, connection strings, stack traces or host details are returned.
const mongoose = require('mongoose');
const { AuditLog, Order, Activity } = require('../../lib/models');
const realtime = require('../../lib/realtime');
const errors = require('../../lib/errorStats');

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

exports.health = async (req, res) => {
    const db = mongoose.connection;
    let dbPingMs = null;
    let dbOk = false;
    try {
        const t = Date.now();
        await db.db.admin().ping();
        dbPingMs = Date.now() - t;
        dbOk = true;
    } catch { dbOk = false; }
    const [lastOrder, lastActivity] = await Promise.all([
        Order.findOne({}, 'timestamp status').sort({ timestamp: -1 }).lean(),
        Activity.findOne({}, 'createdAt type').sort({ createdAt: -1 }).lean(),
    ]).catch(() => [null, null]);
    const rt = realtime.stats();
    const warnings = [];
    if (!dbOk) warnings.push('Database is not responding.');
    if (dbPingMs !== null && dbPingMs > 250) warnings.push(`Database responses are slow (${dbPingMs} ms).`);
    const e = errors.snapshot();
    if (e.lastHour > 0) warnings.push(`${e.lastHour} server error${e.lastHour === 1 ? '' : 's'} in the last hour.`);
    if (!rt.attached) warnings.push('Realtime server is not attached.');
    res.json({
        status: 'ok',
        data: {
            checkedAt: new Date(),
            api: { ok: true, uptimeSeconds: Math.round(process.uptime()), node: process.version.split('.')[0], environment: process.env.NODE_ENV === 'production' ? 'production' : 'development' },
            database: { ok: dbOk, state: STATES[db.readyState] || 'unknown', pingMs: dbPingMs },
            realtime: { ok: rt.attached, connected: rt.connected, eventsSinceStart: rt.emitted, rejectedConnections: rt.rejected, recentEvents: rt.recent, since: rt.startedAt },
            errors: e,
            lastOrderAt: lastOrder?.timestamp || null,
            lastActivityAt: lastActivity?.createdAt || null,
            warnings,
        },
    });
};

exports.audit = async (req, res) => {
    const filter = {};
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
    if (q) {
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ action: re }, { 'actor.name': re }, { 'target.label': re }, { 'target.id': q }];
    }
    if (typeof req.query.action === 'string' && /^[a-z.]{2,40}$/.test(req.query.action)) filter.action = new RegExp(`^${req.query.action.replace('.', '\\.')}`);
    if (['success', 'failure'].includes(req.query.result)) filter.result = req.query.result;
    if (['admin', 'staff', 'student', 'system'].includes(req.query.actorType)) filter['actor.type'] = req.query.actorType;
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '')) filter.at = { ...(filter.at || {}), $gte: new Date(`${req.query.from}T00:00:00+05:30`) };
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '')) filter.at = { ...(filter.at || {}), $lte: new Date(`${req.query.to}T23:59:59.999+05:30`) };
    const [total, items, actions] = await Promise.all([
        AuditLog.countDocuments(filter),
        AuditLog.find(filter).sort({ at: -1 }).skip((p - 1) * limit).limit(limit).lean(),
        AuditLog.distinct('action'),
    ]);
    res.json({ status: 'ok', data: items, total, page: p, pages: Math.max(1, Math.ceil(total / limit)), actions: actions.sort() });
};
