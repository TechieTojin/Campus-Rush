const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Staff = require('../model/staff.model')
const MenuItem = require('../model/menuItem.model')
const Order = require('../model/order.model');
const Activity = require('../model/activity.model');
const Setting = require('../model/setting.model');
const { ALLOWED_TRANSITIONS, STATUSES, transitionOrder } = require('../lib/orders');
const realtime = require('../lib/realtime');
const { issueCsrf } = require('../middleware/auth');
const secretKey = process.env.JWT_SECRET;
const SESSION_MS = 24 * 60 * 60 * 1000;
const STAFF_CSRF = 'staff_csrf';
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
};

const EMAIL_REGEX = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const safeStaff = async (staff) => {
    await staff.populate({ path: 'ownedCanteens', select: 'name location openStatus logo category status statusReason' });
    const data = staff.toObject();
    delete data.password;
    delete data.tokenVersion;
    delete data.setupTokenHash;
    delete data.setupTokenExpires;
    data.role = data.role || 'manager';
    return data;
};

// Session token carries the account's token version so it can be revoked server-side.
const startSession = (res, staff) => {
    const token = jwt.sign({ _id: staff._id, typ: 'staff', tv: staff.tokenVersion || 0 }, secretKey, { expiresIn: '24h' });
    res.cookie("token", token, cookieOptions);
    issueCsrf(res, STAFF_CSRF, SESSION_MS);
};

const emailQuery = (email) => ({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

// Staff sign-up creates an account that owns nothing; it can only gain a canteen by creating a new one.
// Admins can turn self sign-up off (platform settings). STAFF_SIGNUP_CODE additionally requires an
// invite code. Without either, sign-up is open in development and disabled in production.
const signupGate = async (code) => {
    const settings = await Setting.get();
    if (!settings.onboarding?.staffSignupEnabled) return 'New canteen sign-ups are closed. Ask a Campus Rush administrator for an account.';
    const required = process.env.STAFF_SIGNUP_CODE;
    if (required) {
        const a = Buffer.from(String(code || ''));
        const b = Buffer.from(required);
        return a.length === b.length && crypto.timingSafeEqual(a, b) ? null : 'A valid staff invite code is required';
    }
    return isProduction ? 'Staff sign-up is disabled. Ask an administrator for an account.' : null;
};

// Register staff
exports.registerStaff = async (req, res) => {
    try {
        const name = str(req.body.name, 60);
        const email = str(req.body.email, 120).toLowerCase();
        const { password, signupCode } = req.body;

        const gate = await signupGate(signupCode);
        if (gate) return res.status(403).json({ message: gate });
        if (name.length < 2) return res.status(400).json({ message: 'Enter your name (at least 2 characters)' });
        if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
        if (typeof password !== 'string' || !PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters with a letter and a number' });
        }

        const existingStaff = await Staff.findOne(emailQuery(email));
        if (existingStaff) {
            return res.status(409).json({ message: 'An account with this email already exists. Sign in instead.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const staff = await Staff.create({ username: name, email, password: hashedPassword, role: 'manager', status: 'active' });
        startSession(res, staff);
        realtime.emit('staff.updated', { staffId: String(staff._id) }, { admin: true });
        res.status(201).json({ message: 'Staff member created successfully' });
    } catch (error) {
        console.error('Staff registration failed:', error);
        res.status(500).json({ message: 'Could not create the account' });
    }

};

// Login staff
// The same message is used for unknown email and wrong password so the endpoint can't be used to discover accounts.
exports.loginStaff = async (req, res) => {
    const email = str(req.body.email, 120);
    const { password } = req.body;
    if (!email || typeof password !== 'string' || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const user = await Staff.findOne(emailQuery(email));
        const ok = user && user.password ? await bcrypt.compare(password, user.password) : false;
        if (!ok) {
            return res.status(401).json({ message: 'Incorrect email or password' });
        }
        // Only reported after the password matched, so it doesn't reveal which accounts exist.
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'This staff account has been suspended. Contact your Campus Rush administrator.', code: 'SUSPENDED' });
        }
        user.lastLoginAt = new Date();
        if (user.status === 'invited') user.status = 'active';
        await user.save();
        startSession(res, user);
        res.json({ status: 'ok', message: 'Success' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred' });
    }
};

//authentication
exports.authStaff = async (req, res) => {
    // Sessions created before CSRF tokens existed get one here.
    if (!req.cookies[STAFF_CSRF]) issueCsrf(res, STAFF_CSRF, SESSION_MS);
    res.send({ status: "ok", data: await safeStaff(res.locals.user) });
}

exports.logout = async (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
    res.clearCookie(STAFF_CSRF, { secure: isProduction, sameSite: 'strict', path: '/' });
    res.json({ status: 'ok', message: 'Signed out' });
}

// Completes an admin-created account: the one-time token from the setup link sets the first password.
exports.setupPassword = async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'This setup link is invalid.' });
    if (typeof password !== 'string' || !PASSWORD_REGEX.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters with a letter and a number' });
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const staff = await Staff.findOne({ setupTokenHash: hash, setupTokenExpires: { $gt: new Date() } }).select('+setupTokenHash +setupTokenExpires');
    if (!staff) return res.status(400).json({ message: 'This setup link is invalid or has expired. Ask your administrator for a new one.' });
    if (staff.status === 'suspended') return res.status(403).json({ message: 'This staff account has been suspended.' });
    staff.password = await bcrypt.hash(password, 10);
    staff.setupTokenHash = undefined;
    staff.setupTokenExpires = undefined;
    staff.status = 'active';
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    staff.lastLoginAt = new Date();
    await staff.save();
    startSession(res, staff);
    realtime.emit('staff.updated', { staffId: String(staff._id) }, { admin: true });
    res.json({ status: 'ok', message: 'Password set' });
};

exports.updateAccount = async (req, res) => {
    const staff = res.locals.user;
    const username = str(req.body.username, 61);
    if (username.length < 2 || username.length > 60) return res.status(400).json({ message: 'Name must be 2–60 characters' });
    staff.username = username;
    await staff.save();
    res.json({ status: 'ok', data: await safeStaff(staff) });
};

exports.updatePreferences = async (req, res) => {
    const staff = res.locals.user;
    const { soundOnNewOrder, liveRefreshSeconds } = req.body || {};
    if (soundOnNewOrder !== undefined) {
        if (typeof soundOnNewOrder !== 'boolean') return res.status(400).json({ message: 'soundOnNewOrder must be true or false' });
        staff.preferences.soundOnNewOrder = soundOnNewOrder;
    }
    if (liveRefreshSeconds !== undefined) {
        if (![5, 10, 15, 30, 60].includes(liveRefreshSeconds)) return res.status(400).json({ message: 'Refresh interval must be 5, 10, 15, 30 or 60 seconds' });
        staff.preferences.liveRefreshSeconds = liveRefreshSeconds;
    }
    await staff.save();
    res.json({ status: 'ok', data: await safeStaff(staff) });
};

exports.changePassword = async (req, res) => {
    const staff = res.locals.user;
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({ message: 'New password must be at least 8 characters with a letter and a number' });
    }
    if (!(await bcrypt.compare(currentPassword, staff.password))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (await bcrypt.compare(newPassword, staff.password)) {
        return res.status(400).json({ message: 'New password must be different from the current one' });
    }
    staff.password = await bcrypt.hash(newPassword, 10);
    // Sign out every other session; this browser gets a fresh one.
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();
    realtime.disconnect(`staff:${staff._id}`);
    startSession(res, staff);
    res.json({ status: 'ok', message: 'Password updated' });
};

exports.getCanteenOrders = async (req, res) => {
    const { canteenId } = req.params;
    const staff = res.locals.user;

    try {
        const staffCanteens = staff.ownedCanteens.map(c => c.toString());
        if (!staffCanteens.includes(canteenId)) {
            return res.status(403).json({ message: "Not authorized to access this canteen's orders" });
        }

        const orders = await Order.find({ canteen: canteenId });
        res.send({ status: "ok", data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const newStatus = req.body.status;
        const staff = res.locals.user;

        if (!newStatus || !STATUSES.includes(newStatus)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${STATUSES.join(', ')}` });
        }
        if (!/^[0-9a-fA-F]{24}$/.test(orderId)) {
            return res.status(404).json({ message: "Order not found" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const staffCanteens = staff.ownedCanteens.map(c => c.toString());
        if (!staffCanteens.includes(order.canteen.toString())) {
            return res.status(403).json({ message: "Not authorized to update this order" });
        }

        const result = await transitionOrder(order, newStatus, { actor: 'staff' });
        if (!result.order) return res.status(result.status).json({ message: result.message });
        res.json(result.order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

//get oreder by id

exports.getOrderByOrderId = async (req, res) => {
    const { orderId } = req.params;
    const staff = res.locals.user;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const staffCanteens = staff.ownedCanteens.map(c => c.toString());
        if (!staffCanteens.includes(order.canteen.toString())) {
            return res.status(403).json({ message: "Not authorized to access this order" });
        }

        res.send({ status: 'Ok', data: order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}

  //most ordered item
  exports.mostOrderedItems = async (req, res) => {
    try {
      const canteenId = req.params.canteenId;
      const orders = await Order.find({ canteen: canteenId });
      const itemCounts = new Map();

      orders.forEach((order) => {
        order.items.forEach((item) => {
          const itemId = item.toString();
          itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
        });
      });

      // Sort the items by count in descending order
      const sortedItems = [...itemCounts.entries()].sort((a, b) => b[1] - a[1]);

      // Get the top 5 most ordered items
      const topItems = sortedItems.slice(0, 5);

      // Map the item IDs to their names and create the response data
      const response = await Promise.all(topItems.map(async ([itemId, count]) => {
        const menuItem = await MenuItem.findById(itemId);
        const itemName = menuItem ? menuItem.name : "Unknown Item";
        return { name: itemName, quantity: count };
      }));

      res.status(200).json({ status: 'ok', data: response });
    } catch (error) {
      console.error("Error finding most ordered items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
