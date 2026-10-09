const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const Staff = require('../model/staff.model');
const User = require('../model/user.model');
const Canteen = require('../model/canteen.model');
const Admin = require('../model/admin.model');
const AuditLog = require('../model/auditLog.model');
const secretKey = process.env.JWT_SECRET;

const isProduction = process.env.NODE_ENV === 'production';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ---------------------------------------------------------------- CSRF (double-submit token)
// Cookie-authenticated mutations must echo a random, JS-readable cookie in the X-CSRF-Token header.
// Another site can make the browser send the session cookie, but it cannot read this cookie.
exports.issueCsrf = (res, name, maxAge) => {
    const value = crypto.randomBytes(24).toString('hex');
    res.cookie(name, value, { httpOnly: false, secure: isProduction, sameSite: 'strict', path: '/', maxAge });
    return value;
};

exports.csrf = (name) => (req, res, next) => {
    if (!MUTATING.has(req.method)) return next();
    const cookie = req.cookies[name];
    const header = req.get('X-CSRF-Token');
    if (!cookie || !header || cookie.length !== header.length || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
        return res.status(403).json({ message: 'Security check failed. Refresh the page and try again.', code: 'CSRF' });
    }
    return next();
};

// ---------------------------------------------------------------- canteen staff (HttpOnly cookie "token")
exports.verifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        if (decoded.typ && decoded.typ !== 'staff') {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const userData = await Staff.findById(decoded._id);
        if (!userData) {
            return res.status(401).json({ message: 'Staff not found' });
        }
        // Checked on every request, so suspension or "sign out everywhere" takes effect immediately.
        if (userData.status === 'suspended') {
            return res.status(401).json({ message: 'This staff account has been suspended. Contact your Campus Rush administrator.', code: 'SUSPENDED' });
        }
        if ((userData.tokenVersion || 0) !== (decoded.tv || 0)) {
            return res.status(401).json({ message: 'Your session has ended. Please sign in again.', code: 'REVOKED' });
        }
        res.locals.user = userData;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Run after verifyToken: the :canteenId route param must be a canteen the staff member owns.
exports.requireCanteenOwner = async (req, res, next) => {
    const { canteenId } = req.params;
    const staff = res.locals.user;
    if (!/^[0-9a-fA-F]{24}$/.test(canteenId || '') || !staff.ownedCanteens.some(c => c.toString() === canteenId)) {
        return res.status(403).json({ message: 'You do not manage this canteen' });
    }
    try {
        const canteen = await Canteen.findById(canteenId);
        if (!canteen) {
            return res.status(404).json({ message: 'Canteen not found' });
        }
        res.locals.canteen = canteen;
        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Managers have full control of their canteen; the 'staff' role handles orders and availability only.
// `allowAvailability` lets staff send menu updates whose only field is `available`.
exports.requireManager = ({ allowAvailability = false } = {}) => (req, res, next) => {
    const staff = res.locals.user;
    if (!staff || (staff.role || 'manager') === 'manager') return next();
    if (allowAvailability) {
        const keys = Object.keys(req.body || {});
        if (keys.length === 1 && keys[0] === 'available') return next();
    }
    return res.status(403).json({ message: 'Only canteen managers can do this. Ask your manager or a Campus Rush admin.', code: 'ROLE' });
};

// ---------------------------------------------------------------- students (Bearer token)
exports.verifyStudent = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, secretKey);
        if (decoded.typ && decoded.typ !== 'student') {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Suspended students keep read access (their own orders/profile) but can't take actions.
exports.requireActiveStudent = (req, res, next) => {
    if (req.user?.status === 'suspended') {
        return res.status(403).json({ message: 'Your account is suspended, so you can’t do this right now. Contact Campus Rush support.', code: 'SUSPENDED' });
    }
    return next();
};

// ---------------------------------------------------------------- platform admins (HttpOnly cookie "admin_token")
exports.ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;

exports.requireAdmin = async (req, res, next) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ message: 'Please sign in.' });
    try {
        const decoded = jwt.verify(token, secretKey);
        if (decoded.typ !== 'admin') return res.status(401).json({ message: 'Please sign in.' });
        const admin = await Admin.findById(decoded._id);
        if (!admin) return res.status(401).json({ message: 'Please sign in.' });
        if (admin.status !== 'active') return res.status(401).json({ message: 'This administrator account is suspended.', code: 'SUSPENDED' });
        if ((admin.tokenVersion || 0) !== (decoded.tv || 0)) return res.status(401).json({ message: 'Your session has ended. Please sign in again.', code: 'REVOKED' });
        res.locals.admin = admin;
        return next();
    } catch {
        return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
};

// Permissions per admin role. The role always comes from the database, never from the request.
const PERMISSIONS = {
    super_admin: ['*'],
    operations: ['canteens', 'staff', 'students', 'orders', 'menu', 'content', 'support', 'analytics', 'audit.read', 'system.read'],
};
exports.can = (admin, permission) => {
    const list = PERMISSIONS[admin?.role] || [];
    return list.includes('*') || list.includes(permission);
};
exports.requirePermission = (permission) => (req, res, next) => (
    exports.can(res.locals.admin, permission)
        ? next()
        : res.status(403).json({ message: 'Your administrator role doesn’t allow this action.', code: 'ROLE' })
);

// ---------------------------------------------------------------- audit trail
const SENSITIVE = /pass(word)?|token|secret|cookie|hash|csrf/i;
const clean = (value, depth = 0) => {
    if (value == null || depth > 3) return value;
    if (Array.isArray(value)) return value.slice(0, 50).map((v) => clean(v, depth + 1));
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).filter(([k]) => !SENSITIVE.test(k)).map(([k, v]) => [k, clean(v, depth + 1)]));
    }
    return typeof value === 'string' ? value.slice(0, 500) : value;
};

exports.recordAudit = ({ req, res, actor, action, target, result = 'success', status, details }) => AuditLog.create({
    actor: actor || (res?.locals?.admin
        ? { type: 'admin', id: res.locals.admin._id, name: res.locals.admin.name, role: res.locals.admin.role }
        : { type: 'system' }),
    action,
    target,
    result,
    status,
    details: clean(details),
    ip: req?.ip,
}).catch((e) => console.error('Audit write failed:', e.message));

// Records an admin mutation once the response is sent, marking it success/failure by status code.
// `before(req, res)` may load a snapshot for before/after details.
exports.audit = (action, { target = () => ({}), before } = {}) => async (req, res, next) => {
    let snapshot;
    if (before) {
        try { snapshot = await before(req, res); } catch { snapshot = undefined; }
    }
    res.on('finish', () => {
        exports.recordAudit({
            req,
            res,
            action,
            target: target(req, res),
            result: res.statusCode < 400 ? 'success' : 'failure',
            status: res.statusCode,
            details: { params: req.params, query: Object.keys(req.query || {}).length ? req.query : undefined, changes: req.body, before: snapshot, outcome: res.locals.auditOutcome },
        });
    });
    next();
};
