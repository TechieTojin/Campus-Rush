// Platform admin sessions: HttpOnly cookie `admin_token` (8h) + double-submit CSRF cookie `admin_csrf`.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Admin } = require('../../lib/models');
const realtime = require('../../lib/realtime');
const { issueCsrf, recordAudit, ADMIN_SESSION_MS, can } = require('../../middleware/auth');

const isProduction = process.env.NODE_ENV === 'production';
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}$/;
const PASSWORD_RULE = 'Use at least 12 characters with upper- and lower-case letters and a number';
const COOKIE = { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/' };
// A real hash of a random string, so unknown emails take as long to check as real ones.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);

const profile = (admin) => {
    const a = admin.toJSON();
    return {
        _id: a._id, name: a.name, email: a.email, role: a.role, status: a.status,
        lastLoginAt: a.lastLoginAt, passwordChangedAt: a.passwordChangedAt, createdAt: a.createdAt,
        preferences: a.preferences || { theme: 'system' },
        permissions: { manageAdmins: can(admin, 'admins.manage'), platformSettings: can(admin, 'platform.settings') },
    };
};

const startSession = (res, admin) => {
    const token = jwt.sign({ _id: admin._id, typ: 'admin', tv: admin.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: Math.floor(ADMIN_SESSION_MS / 1000) });
    res.cookie('admin_token', token, { ...COOKIE, maxAge: ADMIN_SESSION_MS });
    issueCsrf(res, 'admin_csrf', ADMIN_SESSION_MS);
};
const endSession = (res) => {
    res.clearCookie('admin_token', COOKIE);
    res.clearCookie('admin_csrf', { secure: isProduction, sameSite: 'strict', path: '/' });
};

exports.PASSWORD_REGEX = PASSWORD_REGEX;
exports.PASSWORD_RULE = PASSWORD_RULE;

exports.login = async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const admin = await Admin.findOne({ email });
    const ok = await bcrypt.compare(password, admin?.password || DUMMY_HASH);
    if (!admin || !admin.password || !ok) {
        recordAudit({ req, actor: { type: 'system' }, action: 'admin.login', target: { type: 'admin', label: email.slice(0, 120) }, result: 'failure', status: 401 });
        return res.status(401).json({ message: 'Incorrect email or password' });
    }
    if (admin.status !== 'active') {
        recordAudit({ req, actor: { type: 'admin', id: admin._id, name: admin.name, role: admin.role }, action: 'admin.login', target: { type: 'admin', id: String(admin._id), label: admin.email }, result: 'failure', status: 403, details: { reason: 'account not active' } });
        return res.status(403).json({ message: 'This administrator account is suspended.' });
    }
    admin.lastLoginAt = new Date();
    await admin.save();
    startSession(res, admin);
    recordAudit({ req, actor: { type: 'admin', id: admin._id, name: admin.name, role: admin.role }, action: 'admin.login', target: { type: 'admin', id: String(admin._id), label: admin.email } });
    return res.json({ status: 'ok', data: profile(admin) });
};

exports.me = async (req, res) => {
    // Older tabs may have lost the CSRF cookie; re-issue it for a valid session.
    if (!req.cookies.admin_csrf) issueCsrf(res, 'admin_csrf', ADMIN_SESSION_MS);
    res.json({ status: 'ok', data: profile(res.locals.admin) });
};

exports.logout = async (req, res) => {
    endSession(res);
    res.json({ status: 'ok' });
};

// Revokes every session for this admin (including this one).
exports.logoutAll = async (req, res) => {
    const admin = res.locals.admin;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();
    realtime.disconnect(`admin:${admin._id}`);
    endSession(res);
    recordAudit({ req, res, action: 'admin.sessions.revoke', target: { type: 'admin', id: String(admin._id), label: admin.email } });
    res.json({ status: 'ok' });
};

exports.updateProfile = async (req, res) => {
    const admin = res.locals.admin;
    const { name, theme } = req.body || {};
    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) return res.status(400).json({ message: 'Name must be 2–60 characters' });
        admin.name = name.trim();
    }
    if (theme !== undefined) {
        if (!['system', 'light', 'dark'].includes(theme)) return res.status(400).json({ message: 'Unknown theme' });
        admin.preferences = { ...(admin.preferences?.toObject?.() || admin.preferences || {}), theme };
    }
    await admin.save();
    res.json({ status: 'ok', data: profile(admin) });
};

exports.changePassword = async (req, res) => {
    const admin = res.locals.admin;
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') return res.status(400).json({ message: 'Current and new password are required' });
    if (!PASSWORD_REGEX.test(newPassword)) return res.status(400).json({ message: PASSWORD_RULE });
    if (!(await bcrypt.compare(currentPassword, admin.password))) {
        recordAudit({ req, res, action: 'admin.password.change', target: { type: 'admin', id: String(admin._id), label: admin.email }, result: 'failure', status: 400 });
        return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (await bcrypt.compare(newPassword, admin.password)) return res.status(400).json({ message: 'Choose a password you haven’t used for this account' });
    admin.password = await bcrypt.hash(newPassword, 12);
    admin.passwordChangedAt = new Date();
    admin.tokenVersion = (admin.tokenVersion || 0) + 1; // signs out other sessions
    await admin.save();
    startSession(res, admin);
    recordAudit({ req, res, action: 'admin.password.change', target: { type: 'admin', id: String(admin._id), label: admin.email } });
    res.json({ status: 'ok', message: 'Password changed. Other sessions were signed out.' });
};

// Invited admins set their first password with the one-time token from their setup link.
exports.completeSetup = async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'This setup link is invalid.' });
    if (typeof password !== 'string' || !PASSWORD_REGEX.test(password)) return res.status(400).json({ message: PASSWORD_RULE });
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const admin = await Admin.findOne({ setupTokenHash: hash, setupTokenExpires: { $gt: new Date() } }).select('+setupTokenHash +setupTokenExpires');
    if (!admin || admin.status === 'suspended') return res.status(400).json({ message: 'This setup link is invalid or has expired. Ask a super admin for a new one.' });
    admin.password = await bcrypt.hash(password, 12);
    admin.passwordChangedAt = new Date();
    admin.setupTokenHash = undefined;
    admin.setupTokenExpires = undefined;
    admin.status = 'active';
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    admin.lastLoginAt = new Date();
    await admin.save();
    startSession(res, admin);
    recordAudit({ req, actor: { type: 'admin', id: admin._id, name: admin.name, role: admin.role }, action: 'admin.setup.complete', target: { type: 'admin', id: String(admin._id), label: admin.email } });
    res.json({ status: 'ok', data: profile(admin) });
};
