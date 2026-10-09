// Administrator accounts (super_admin only). There is no public admin registration:
// new admins are invited here and set their own password through a one-time link.
const crypto = require('crypto');
const { Admin, AuditLog } = require('../../lib/models');
const realtime = require('../../lib/realtime');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const EMAIL = /^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
const fail = (res, status, message) => res.status(status).json({ message });
const ADMIN_APP_URL = (process.env.ADMIN_APP_URL || 'http://localhost:5174').replace(/\/$/, '');

const row = (a) => ({ _id: a._id, name: a.name, email: a.email, role: a.role, status: a.status, lastLoginAt: a.lastLoginAt || null, createdAt: a.createdAt, passwordChangedAt: a.passwordChangedAt || null });

const activeSuperAdmins = (exceptId) => Admin.countDocuments({ role: 'super_admin', status: 'active', _id: { $ne: exceptId } });

exports.list = async (req, res) => {
    const admins = await Admin.find().sort({ createdAt: 1 }).lean();
    res.json({ status: 'ok', data: admins.map(row) });
};

exports.activity = async (req, res) => {
    if (!OBJECT_ID.test(req.params.adminId)) return fail(res, 404, 'Administrator not found');
    const entries = await AuditLog.find({ 'actor.type': 'admin', 'actor.id': req.params.adminId }).sort({ at: -1 }).limit(50).lean();
    res.json({ status: 'ok', data: entries });
};

exports.invite = async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const role = req.body?.role || 'operations';
    if (name.length < 2 || name.length > 60) return fail(res, 400, 'Name must be 2–60 characters');
    if (!EMAIL.test(email)) return fail(res, 400, 'Enter a valid email address');
    if (!Admin.ROLES.includes(role)) return fail(res, 400, 'Unknown role');
    if (await Admin.findOne({ email })) return fail(res, 409, 'An administrator with this email already exists');
    const token = crypto.randomBytes(32).toString('hex');
    const admin = await Admin.create({
        name, email, role, status: 'invited', password: '',
        setupTokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        setupTokenExpires: new Date(Date.now() + 48 * 3600 * 1000),
        createdBy: res.locals.admin._id,
    });
    res.locals.auditOutcome = { adminId: String(admin._id), role };
    res.status(201).json({ status: 'ok', data: row(admin), setupUrl: `${ADMIN_APP_URL}/setup?token=${token}`, setupExpires: admin.setupTokenExpires });
};

exports.setRole = async (req, res) => {
    if (!OBJECT_ID.test(req.params.adminId)) return fail(res, 404, 'Administrator not found');
    const { role } = req.body || {};
    if (!Admin.ROLES.includes(role)) return fail(res, 400, 'Unknown role');
    const admin = await Admin.findById(req.params.adminId);
    if (!admin) return fail(res, 404, 'Administrator not found');
    if (String(admin._id) === String(res.locals.admin._id)) return fail(res, 400, 'You can’t change your own role');
    if (admin.role === 'super_admin' && role !== 'super_admin' && admin.status === 'active' && (await activeSuperAdmins(admin._id)) === 0) {
        return fail(res, 400, 'At least one active super admin must remain');
    }
    const before = admin.role;
    admin.role = role;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1; // new permissions apply from the next sign-in
    await admin.save();
    realtime.disconnect(`admin:${admin._id}`);
    res.locals.auditOutcome = { before, after: role };
    res.json({ status: 'ok', data: row(admin) });
};

exports.setStatus = async (req, res) => {
    if (!OBJECT_ID.test(req.params.adminId)) return fail(res, 404, 'Administrator not found');
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status)) return fail(res, 400, 'Status must be active or suspended');
    const admin = await Admin.findById(req.params.adminId);
    if (!admin) return fail(res, 404, 'Administrator not found');
    if (String(admin._id) === String(res.locals.admin._id)) return fail(res, 400, 'You can’t suspend your own account');
    if (status === 'suspended' && admin.role === 'super_admin' && admin.status === 'active' && (await activeSuperAdmins(admin._id)) === 0) {
        return fail(res, 400, 'At least one active super admin must remain');
    }
    if (status === 'active' && !admin.password) return fail(res, 400, 'This administrator hasn’t completed setup yet');
    const before = admin.status;
    admin.status = status;
    if (status === 'suspended') admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();
    realtime.disconnect(`admin:${admin._id}`);
    res.locals.auditOutcome = { before, after: status };
    res.json({ status: 'ok', data: row(admin) });
};
