// Canteen management API used by the staff website.
// Every handler runs after verifyToken + requireCanteenOwner, so res.locals.canteen is the
// staff member's own canteen and all queries below are scoped to it.
const mongoose = require('mongoose');
const MenuItem = require('../model/menuItem.model');
const Canteen = require('../model/canteen.model');
const Order = require('../model/order.model');
const User = require('../model/user.model');
const Activity = require('../model/activity.model');
const { isValidImagePath } = require('./uploadController');

const TZ = 'Asia/Kolkata';
const TZ_OFFSET = '+05:30';
const ACTIVE = ['Placed', 'Processing', 'Ready'];
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;

const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const startOfDay = (key) => new Date(`${key}T00:00:00.000${TZ_OFFSET}`);
const endOfDay = (key) => new Date(`${key}T23:59:59.999${TZ_OFFSET}`);
const addDays = (key, n) => dayKey(new Date(startOfDay(key).getTime() + n * 86400000 + 3600000));
const round2 = (n) => Math.round(n * 100) / 100;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fail = (res, status, message) => res.status(status).json({ message });
// Activity entries show whether a change came from the canteen's staff or a Campus Rush admin.
const actorOf = (res) => (res.locals.admin ? 'admin' : 'staff');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const menuIds = (canteen) => canteen.menu.map(id => id.toString());
const ownsItem = (canteen, itemId) => OBJECT_ID.test(itemId || '') && menuIds(canteen).includes(itemId);

// ---------------------------------------------------------------- orders: shared shaping

// Older orders have no lineItems; rebuild them from the populated item refs and flag them,
// because those prices are today's menu prices, not what was charged.
const orderLines = (order) => {
    if (order.lineItems && order.lineItems.length) {
        return { lines: order.lineItems.map(l => ({ item: l.item, name: l.name, price: l.price, quantity: l.quantity, category: l.category || '' })), legacy: false };
    }
    const map = new Map();
    (order.items || []).forEach((it) => {
        const id = String(it && it._id ? it._id : it);
        const entry = map.get(id);
        if (entry) entry.quantity += 1;
        else map.set(id, { item: id, name: it && it.name ? it.name : 'Removed item', price: it && typeof it.price === 'number' ? it.price : null, quantity: 1, category: (it && it.category) || '' });
    });
    return { lines: [...map.values()], legacy: true };
};

const shapeOrder = (o) => {
    const { lines, legacy } = orderLines(o);
    return {
        _id: o._id,
        ref: `#${String(o._id).slice(-6).toUpperCase()}`,
        status: o.status,
        totalPrice: o.totalPrice,
        timestamp: o.timestamp,
        // Staff see only the display name needed to call out the order — never email or other profile data.
        customer: o.user && typeof o.user === 'object' ? { _id: o.user._id, name: o.user.name || 'Student' } : { _id: o.user, name: 'Student' },
        lines,
        itemCount: lines.reduce((s, l) => s + l.quantity, 0),
        legacyPricing: legacy,
        statusHistory: o.statusHistory || [],
        paymentMethod: o.paymentMethod || 'counter',
        paymentStatus: o.paymentStatus || 'unpaid',
        paidAt: o.paidAt || null,
    };
};

const populateOrder = (q) => q.populate('user', 'name').populate('items', 'name price category');

// ---------------------------------------------------------------- canteen profile

const PROFILE_FIELDS = ['name', 'location', 'canteenDescription', 'category', 'phone', 'contactEmail', 'openingTime', 'closingTime', 'pickupInstructions', 'logo', 'coverImage', 'openStatus'];

const shapeCanteen = (c) => {
    const o = c.toObject();
    delete o.orders;
    o.menuCount = c.menu.length;
    delete o.menu;
    o.menuCategories = o.menuCategories || [];
    return o;
};

exports.getCanteen = async (req, res) => res.json({ status: 'ok', data: shapeCanteen(res.locals.canteen) });

exports.updateCanteen = async (req, res) => {
    const canteen = res.locals.canteen;
    const b = req.body || {};
    const update = {};
    const limits = { name: 60, location: 120, canteenDescription: 500, category: 40, phone: 20, contactEmail: 80, pickupInstructions: 300 };
    for (const [field, max] of Object.entries(limits)) {
        if (b[field] !== undefined) update[field] = str(b[field], max + 1);
        if (update[field] !== undefined && update[field].length > max) return fail(res, 400, `${field} is too long (max ${max} characters)`);
    }
    if (update.name !== undefined && update.name.length < 3) return fail(res, 400, 'Canteen name must be at least 3 characters');
    if (update.location !== undefined && update.location.length < 3) return fail(res, 400, 'Location must be at least 3 characters');
    if (update.category !== undefined && !update.category) return fail(res, 400, 'Canteen type is required');
    if (update.phone && !/^[+\d][\d\s-]{6,18}$/.test(update.phone)) return fail(res, 400, 'Enter a valid phone number');
    if (update.contactEmail && !EMAIL.test(update.contactEmail)) return fail(res, 400, 'Enter a valid contact email');
    for (const f of ['openingTime', 'closingTime']) {
        if (b[f] !== undefined) {
            const v = str(b[f], 5);
            if (v && !TIME.test(v)) return fail(res, 400, 'Opening hours must use HH:MM (24-hour) format');
            update[f] = v;
        }
    }
    if (!!update.openingTime !== !!update.closingTime && (b.openingTime !== undefined || b.closingTime !== undefined)) {
        return fail(res, 400, 'Set both opening and closing time, or clear both');
    }
    for (const f of ['logo', 'coverImage']) {
        if (b[f] !== undefined) {
            if (!isValidImagePath(b[f])) return fail(res, 400, `Invalid ${f === 'logo' ? 'logo' : 'cover'} image — upload it again`);
            update[f] = b[f];
        }
    }
    if (b.openStatus !== undefined) {
        if (typeof b.openStatus !== 'boolean') return fail(res, 400, 'openStatus must be true or false');
        update.openStatus = b.openStatus;
    }
    if (!Object.keys(update).length) return fail(res, 400, 'Nothing to update');
    if (update.openStatus === true && canteen.status && canteen.status !== 'active') {
        return fail(res, 403, canteen.status === 'pending'
            ? 'This canteen is waiting for Campus Rush approval and can’t take orders yet.'
            : 'This canteen has been suspended by Campus Rush and can’t take orders.');
    }

    try {
        const before = canteen.openStatus;
        Object.assign(canteen, update);
        await canteen.save();
        const changed = Object.keys(update).filter(k => PROFILE_FIELDS.includes(k));
        if (update.openStatus !== undefined && update.openStatus !== before) {
            Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'canteen_updated', message: update.openStatus ? 'Canteen opened for orders' : 'Canteen stopped taking orders' });
        }
        if (changed.some(k => k !== 'openStatus')) {
            Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'canteen_updated', message: 'Canteen profile updated' });
        }
        return res.json({ status: 'ok', data: shapeCanteen(canteen) });
    } catch (error) {
        console.error('Error updating canteen:', error);
        return fail(res, 500, 'Internal server error');
    }
};

// ---------------------------------------------------------------- menu items

const parseItem = (b, canteen, partial) => {
    const data = {};
    if (!partial || b.name !== undefined) {
        const name = str(b.name, 81);
        if (name.length < 2) return { error: 'Item name must be at least 2 characters' };
        if (name.length > 80) return { error: 'Item name must be 80 characters or fewer' };
        data.name = name;
    }
    if (!partial || b.price !== undefined) {
        const price = typeof b.price === 'string' && b.price.trim() !== '' ? Number(b.price) : b.price;
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return { error: 'Price must be a positive amount' };
        if (price > 100000) return { error: 'Price looks too high (max ₹1,00,000)' };
        if (Math.abs(Math.round(price * 100) - price * 100) > 1e-6) return { error: 'Price can have at most 2 decimal places' };
        data.price = price;
    }
    if (b.description !== undefined) {
        const d = str(b.description, 501);
        if (d.length > 500) return { error: 'Description must be 500 characters or fewer' };
        data.description = d;
    }
    if (b.category !== undefined) {
        const c = str(b.category, 41);
        if (c && !(canteen.menuCategories || []).includes(c)) return { error: `Category "${c}" doesn't exist. Create it on the Categories page first.` };
        data.category = c;
    }
    if (b.available !== undefined) {
        if (typeof b.available !== 'boolean') return { error: 'available must be true or false' };
        data.available = b.available;
    }
    if (b.image !== undefined) {
        if (!isValidImagePath(b.image)) return { error: 'Image was not uploaded correctly — please upload it again' };
        data.image = b.image;
    }
    if (b.prepTime !== undefined && b.prepTime !== null && b.prepTime !== '') {
        const p = Number(b.prepTime);
        if (!Number.isInteger(p) || p < 1 || p > 240) return { error: 'Preparation time must be between 1 and 240 minutes' };
        data.prepTime = p;
    } else if (b.prepTime === null || b.prepTime === '') {
        data.prepTime = undefined;
    }
    if (b.dietary !== undefined) {
        if (!MenuItem.DIETARY.includes(b.dietary)) return { error: 'Unknown dietary option' };
        data.dietary = b.dietary;
    }
    return { data };
};

exports.listMenu = async (req, res) => {
    const canteen = res.locals.canteen;
    try {
        const items = await MenuItem.find({ _id: { $in: canteen.menu } }).lean();
        const order = menuIds(canteen);
        items.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));
        return res.json({ status: 'ok', data: items, categories: canteen.menuCategories || [] });
    } catch (error) {
        console.error(error);
        return fail(res, 500, 'Internal server error');
    }
};

exports.getMenuItem = async (req, res) => {
    const canteen = res.locals.canteen;
    if (!ownsItem(canteen, req.params.itemId)) return fail(res, 404, 'Menu item not found in your canteen');
    const item = await MenuItem.findById(req.params.itemId).lean();
    if (!item) return fail(res, 404, 'Menu item not found');
    return res.json({ status: 'ok', data: item });
};

exports.createMenuItem = async (req, res) => {
    const canteen = res.locals.canteen;
    const { data, error } = parseItem(req.body || {}, canteen, false);
    if (error) return fail(res, 400, error);
    try {
        const duplicate = await MenuItem.findOne({ _id: { $in: canteen.menu }, name: new RegExp(`^${escapeRegex(data.name)}$`, 'i') });
        if (duplicate) return fail(res, 409, `"${duplicate.name}" is already on your menu`);
        const item = await MenuItem.create({ available: true, ...data, canteen: canteen._id });
        await Canteen.updateOne({ _id: canteen._id }, { $push: { menu: item._id } });
        Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'item_created', item: item._id, message: `Added "${item.name}" to the menu at ₹${item.price}` });
        return res.status(201).json({ status: 'ok', data: item });
    } catch (err) {
        console.error('Error creating menu item:', err);
        return fail(res, 500, 'Internal server error');
    }
};

exports.updateMenuItem = async (req, res) => {
    const canteen = res.locals.canteen;
    const { itemId } = req.params;
    if (!ownsItem(canteen, itemId)) return fail(res, 404, 'Menu item not found in your canteen');
    const { data, error } = parseItem(req.body || {}, canteen, true);
    if (error) return fail(res, 400, error);
    if (!Object.keys(data).length) return fail(res, 400, 'Nothing to update');
    try {
        if (data.name) {
            const duplicate = await MenuItem.findOne({ _id: { $in: canteen.menu, $ne: itemId }, name: new RegExp(`^${escapeRegex(data.name)}$`, 'i') });
            if (duplicate) return fail(res, 409, `"${duplicate.name}" is already on your menu`);
        }
        const before = await MenuItem.findById(itemId);
        if (!before) return fail(res, 404, 'Menu item not found');
        const unset = {};
        if ('prepTime' in data && data.prepTime === undefined) { delete data.prepTime; unset.prepTime = 1; }
        const item = await MenuItem.findByIdAndUpdate(itemId, { $set: { ...data, canteen: canteen._id }, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true, runValidators: true });
        const changes = [];
        if (data.price !== undefined && data.price !== before.price) changes.push(`price ₹${before.price} → ₹${data.price}`);
        if (data.available !== undefined && data.available !== before.available) changes.push(data.available ? 'marked available' : 'marked unavailable');
        if (data.name && data.name !== before.name) changes.push(`renamed from "${before.name}"`);
        Activity.record({ actor: actorOf(res),
            canteen: canteen._id,
            type: changes.length === 1 && data.available !== undefined && data.available !== before.available ? 'availability' : 'item_updated',
            item: item._id,
            message: `"${item.name}" updated${changes.length ? `: ${changes.join(', ')}` : ''}`,
        });
        return res.json({ status: 'ok', data: item });
    } catch (err) {
        console.error('Error updating menu item:', err);
        return fail(res, 500, 'Internal server error');
    }
};

exports.bulkAvailability = async (req, res) => {
    const canteen = res.locals.canteen;
    const { itemIds, available } = req.body || {};
    if (!Array.isArray(itemIds) || !itemIds.length || itemIds.length > 200) return fail(res, 400, 'Select between 1 and 200 items');
    if (typeof available !== 'boolean') return fail(res, 400, 'available must be true or false');
    const foreign = itemIds.filter(id => !ownsItem(canteen, id));
    if (foreign.length) return fail(res, 403, 'Some selected items are not on your menu');
    try {
        const result = await MenuItem.updateMany({ _id: { $in: itemIds } }, { $set: { available } });
        Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'availability', message: `${itemIds.length} item${itemIds.length === 1 ? '' : 's'} marked ${available ? 'available' : 'unavailable'}` });
        return res.json({ status: 'ok', updated: result.modifiedCount });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Internal server error');
    }
};

// Archive instead of delete: the item leaves the menu (students can no longer see or order it)
// but the document stays so historical orders keep their item reference.
exports.archiveMenuItem = async (req, res) => {
    const canteen = res.locals.canteen;
    const { itemId } = req.params;
    if (!ownsItem(canteen, itemId)) return fail(res, 404, 'Menu item not found in your canteen');
    try {
        const item = await MenuItem.findByIdAndUpdate(itemId, { $set: { archived: true, available: false, canteen: canteen._id } }, { new: true });
        await Canteen.updateOne({ _id: canteen._id }, { $pull: { menu: item._id } });
        Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'item_archived', item: item._id, message: `Removed "${item.name}" from the menu` });
        return res.json({ status: 'ok' });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Internal server error');
    }
};

// ---------------------------------------------------------------- categories

const categoryCounts = async (canteen) => {
    const items = await MenuItem.find({ _id: { $in: canteen.menu } }, 'category').lean();
    const counts = {};
    items.forEach(i => { counts[i.category || ''] = (counts[i.category || ''] || 0) + 1; });
    return counts;
};

const categoryPayload = async (canteen) => {
    const counts = await categoryCounts(canteen);
    return {
        categories: (canteen.menuCategories || []).map(name => ({ name, itemCount: counts[name] || 0 })),
        uncategorised: counts[''] || 0,
    };
};

const parseCategoryName = (v) => {
    const name = str(v, 41);
    if (name.length < 2 || name.length > 40) return { error: 'Category name must be 2–40 characters' };
    return { name };
};

exports.listCategories = async (req, res) => res.json({ status: 'ok', data: await categoryPayload(res.locals.canteen) });

exports.createCategory = async (req, res) => {
    const canteen = res.locals.canteen;
    const { name, error } = parseCategoryName((req.body || {}).name);
    if (error) return fail(res, 400, error);
    if ((canteen.menuCategories || []).some(c => c.toLowerCase() === name.toLowerCase())) return fail(res, 409, `"${name}" already exists`);
    if ((canteen.menuCategories || []).length >= 30) return fail(res, 400, 'A canteen can have at most 30 categories');
    canteen.menuCategories.push(name);
    await canteen.save();
    Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'category', message: `Category "${name}" created` });
    return res.status(201).json({ status: 'ok', data: await categoryPayload(canteen) });
};

exports.renameCategory = async (req, res) => {
    const canteen = res.locals.canteen;
    const from = str((req.body || {}).from, 41);
    const { name: to, error } = parseCategoryName((req.body || {}).to);
    if (error) return fail(res, 400, error);
    const list = canteen.menuCategories || [];
    const index = list.indexOf(from);
    if (index === -1) return fail(res, 404, 'Category not found');
    if (list.some((c, i) => i !== index && c.toLowerCase() === to.toLowerCase())) return fail(res, 409, `"${to}" already exists`);
    canteen.menuCategories.set(index, to);
    await canteen.save();
    await MenuItem.updateMany({ _id: { $in: canteen.menu }, category: from }, { $set: { category: to } });
    Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'category', message: `Category "${from}" renamed to "${to}"` });
    return res.json({ status: 'ok', data: await categoryPayload(canteen) });
};

// Items in a removed category are moved to `moveTo` (another category) or left uncategorised.
exports.deleteCategory = async (req, res) => {
    const canteen = res.locals.canteen;
    const name = str((req.body || {}).name, 41);
    const moveTo = str((req.body || {}).moveTo, 41);
    const list = canteen.menuCategories || [];
    if (!list.includes(name)) return fail(res, 404, 'Category not found');
    if (moveTo && (moveTo === name || !list.includes(moveTo))) return fail(res, 400, 'Choose a different existing category to move items to');
    canteen.menuCategories = list.filter(c => c !== name);
    await canteen.save();
    const moved = await MenuItem.updateMany({ _id: { $in: canteen.menu }, category: name }, { $set: { category: moveTo } });
    Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'category', message: `Category "${name}" removed${moved.modifiedCount ? ` — ${moved.modifiedCount} item(s) moved to ${moveTo ? `"${moveTo}"` : 'Uncategorised'}` : ''}` });
    return res.json({ status: 'ok', data: await categoryPayload(canteen) });
};

exports.reorderCategories = async (req, res) => {
    const canteen = res.locals.canteen;
    const order = (req.body || {}).order;
    const current = [...(canteen.menuCategories || [])];
    if (!Array.isArray(order) || order.length !== current.length || [...order].sort().join('\n') !== [...current].sort().join('\n')) {
        return fail(res, 400, 'Order must list every existing category exactly once');
    }
    canteen.menuCategories = order;
    await canteen.save();
    return res.json({ status: 'ok', data: await categoryPayload(canteen) });
};

// ---------------------------------------------------------------- orders

exports.listOrders = async (req, res) => {
    const canteen = res.locals.canteen;
    const { status, from, to, q, sort } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { canteen: canteen._id };

    if (status && status !== 'all') {
        const list = status === 'active' ? ACTIVE : String(status).split(',').filter(s => Order.STATUSES.includes(s));
        if (!list.length) return fail(res, 400, 'Unknown status filter');
        filter.status = { $in: list };
    }
    if (from || to) {
        if ((from && !DATE.test(from)) || (to && !DATE.test(to))) return fail(res, 400, 'Dates must be YYYY-MM-DD');
        filter.timestamp = {};
        if (from) filter.timestamp.$gte = startOfDay(from);
        if (to) filter.timestamp.$lte = endOfDay(to);
    }
    if (req.query.payment === 'paid' || req.query.payment === 'unpaid') {
        filter.paymentStatus = req.query.payment === 'paid' ? 'paid' : { $ne: 'paid' };
    }
    const search = str(q, 40).replace(/^#/, '');
    if (search) {
        // Customer search is limited to people who ordered from this canteen.
        const customerIds = await Order.distinct('user', { canteen: canteen._id });
        const matches = await User.find({ _id: { $in: customerIds }, name: new RegExp(escapeRegex(search), 'i') }, '_id').lean();
        const or = [{ user: { $in: matches.map(m => m._id) } }];
        if (/^[0-9a-fA-F]{1,24}$/.test(search)) {
            or.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${search}$`, options: 'i' } } });
        }
        filter.$or = or;
    }

    try {
        const [total, orders] = await Promise.all([
            Order.countDocuments(filter),
            populateOrder(Order.find(filter).sort({ timestamp: sort === 'oldest' ? 1 : -1 }).skip((page - 1) * limit).limit(limit)),
        ]);
        return res.json({ status: 'ok', data: orders.map(shapeOrder), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (err) {
        console.error('Error listing orders:', err);
        return fail(res, 500, 'Internal server error');
    }
};

exports.liveOrders = async (req, res) => {
    const canteen = res.locals.canteen;
    const today = dayKey(new Date());
    try {
        const orders = await populateOrder(Order.find({
            canteen: canteen._id,
            $or: [{ status: { $in: ACTIVE } }, { timestamp: { $gte: startOfDay(today) } }],
        }).sort({ timestamp: 1 }));
        return res.json({ status: 'ok', data: orders.map(shapeOrder), serverTime: new Date(), openStatus: canteen.openStatus });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Internal server error');
    }
};

exports.getOrder = async (req, res) => {
    const canteen = res.locals.canteen;
    if (!OBJECT_ID.test(req.params.orderId)) return fail(res, 404, 'Order not found');
    const order = await populateOrder(Order.findOne({ _id: req.params.orderId, canteen: canteen._id }));
    if (!order) return fail(res, 404, 'Order not found');
    return res.json({ status: 'ok', data: shapeOrder(order) });
};

// Payment is collected at the counter; staff record it here. Cancelled or not-yet-accepted orders can't be marked paid.
exports.setPayment = async (req, res) => {
    const canteen = res.locals.canteen;
    const { paid } = req.body || {};
    if (typeof paid !== 'boolean') return fail(res, 400, 'paid must be true or false');
    if (!OBJECT_ID.test(req.params.orderId)) return fail(res, 404, 'Order not found');
    const order = await Order.findOne({ _id: req.params.orderId, canteen: canteen._id });
    if (!order) return fail(res, 404, 'Order not found');
    if (paid && !['Processing', 'Ready', 'Completed'].includes(order.status)) {
        return fail(res, 400, `Payment can only be recorded once the order is accepted (current status: ${order.status})`);
    }
    order.paymentStatus = paid ? 'paid' : 'unpaid';
    order.paidAt = paid ? new Date() : undefined;
    await order.save();
    Activity.record({ actor: actorOf(res), canteen: canteen._id, type: 'payment_recorded', order: order._id, message: `${paid ? 'Payment recorded' : 'Payment record removed'} for order #${String(order._id).slice(-6).toUpperCase()} (₹${order.totalPrice})` });
    const populated = await populateOrder(Order.findById(order._id));
    return res.json({ status: 'ok', data: shapeOrder(populated) });
};

// ---------------------------------------------------------------- analytics

const summarise = (orders) => {
    const s = { orders: orders.length, placed: 0, processing: 0, ready: 0, completed: 0, cancelled: 0, grossValue: 0, completedValue: 0, collectedRevenue: 0, nonCancelled: 0 };
    orders.forEach((o) => {
        s[o.status.toLowerCase()] += 1;
        if (o.status !== 'Cancelled') { s.grossValue += o.totalPrice; s.nonCancelled += 1; }
        if (o.status === 'Completed') s.completedValue += o.totalPrice;
        if (o.status !== 'Cancelled' && o.paymentStatus === 'paid') s.collectedRevenue += o.totalPrice;
    });
    s.averageOrderValue = s.nonCancelled ? round2(s.grossValue / s.nonCancelled) : 0;
    s.grossValue = round2(s.grossValue);
    s.completedValue = round2(s.completedValue);
    s.collectedRevenue = round2(s.collectedRevenue);
    return s;
};

const itemSales = (orders, currentItems) => {
    const byId = new Map(currentItems.map(i => [String(i._id), i]));
    const items = new Map();
    let legacyOrders = 0;
    orders.filter(o => o.status !== 'Cancelled').forEach((o) => {
        const { lines, legacy } = orderLines(o);
        if (legacy) legacyOrders += 1;
        lines.forEach((l) => {
            const key = String(l.item);
            const current = byId.get(key);
            const entry = items.get(key) || { itemId: key, name: l.name, category: (current && current.category) || l.category || '', quantity: 0, revenue: 0, onMenu: !!current };
            entry.quantity += l.quantity;
            entry.revenue = round2(entry.revenue + (l.price || 0) * l.quantity);
            items.set(key, entry);
        });
    });
    const list = [...items.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    const categories = new Map();
    list.forEach((i) => {
        const key = i.category || 'Uncategorised';
        const c = categories.get(key) || { category: key, quantity: 0, revenue: 0 };
        c.quantity += i.quantity;
        c.revenue = round2(c.revenue + i.revenue);
        categories.set(key, c);
    });
    return { items: list, categories: [...categories.values()].sort((a, b) => b.revenue - a.revenue), legacyOrders };
};

const series = (orders, fromKey, toKey) => {
    const days = new Map();
    for (let k = fromKey, guard = 0; k <= toKey && guard < 400; k = addDays(k, 1), guard++) {
        days.set(k, { date: k, orders: 0, completed: 0, cancelled: 0, grossValue: 0, collectedRevenue: 0 });
    }
    orders.forEach((o) => {
        const d = days.get(dayKey(o.timestamp));
        if (!d) return;
        d.orders += 1;
        if (o.status === 'Completed') d.completed += 1;
        if (o.status === 'Cancelled') d.cancelled += 1;
        else {
            d.grossValue = round2(d.grossValue + o.totalPrice);
            if (o.paymentStatus === 'paid') d.collectedRevenue = round2(d.collectedRevenue + o.totalPrice);
        }
    });
    return [...days.values()];
};

const loadForAnalytics = (canteen, from, to) => Order.find({
    canteen: canteen._id,
    ...(from ? { timestamp: { $gte: startOfDay(from), $lte: endOfDay(to) } } : {}),
}).populate('items', 'name price category').lean();

exports.analytics = async (req, res) => {
    const canteen = res.locals.canteen;
    const today = dayKey(new Date());
    const to = DATE.test(req.query.to || '') ? req.query.to : today;
    const from = DATE.test(req.query.from || '') ? req.query.from : addDays(to, -29);
    if (from > to) return fail(res, 400, 'Start date must be before end date');
    if ((startOfDay(to) - startOfDay(from)) / 86400000 > 366) return fail(res, 400, 'Choose a range of at most one year');
    try {
        const [orders, items] = await Promise.all([loadForAnalytics(canteen, from, to), MenuItem.find({ _id: { $in: canteen.menu } }).lean()]);
        const sales = itemSales(orders, items);
        const customers = new Set(orders.map(o => String(o.user)));
        return res.json({
            status: 'ok',
            data: { from, to, timezone: TZ, summary: { ...summarise(orders), customers: customers.size }, daily: series(orders, from, to), ...sales },
        });
    } catch (err) {
        console.error('Analytics failed:', err);
        return fail(res, 500, 'Internal server error');
    }
};

exports.dashboard = async (req, res) => {
    const canteen = res.locals.canteen;
    const today = dayKey(new Date());
    const weekStart = addDays(today, -6);
    try {
        const [all, items, recent] = await Promise.all([
            loadForAnalytics(canteen),
            MenuItem.find({ _id: { $in: canteen.menu } }).lean(),
            populateOrder(Order.find({ canteen: canteen._id }).sort({ timestamp: -1 }).limit(8)),
        ]);
        const todays = all.filter(o => dayKey(o.timestamp) === today);
        const active = all.filter(o => ACTIVE.includes(o.status));
        const sales = itemSales(all, items);
        return res.json({
            status: 'ok',
            data: {
                today: summarise(todays),
                allTime: summarise(all),
                // Queue counts are live, regardless of the day the order was placed.
                queue: { placed: active.filter(o => o.status === 'Placed').length, processing: active.filter(o => o.status === 'Processing').length, ready: active.filter(o => o.status === 'Ready').length },
                week: series(all.filter(o => dayKey(o.timestamp) >= weekStart), weekStart, today),
                popular: sales.items.slice(0, 5),
                legacyOrders: sales.legacyOrders,
                recent: recent.map(shapeOrder),
                menu: { total: items.length, unavailable: items.filter(i => !i.available).map(i => ({ _id: i._id, name: i.name, price: i.price })) },
                canteen: { name: canteen.name, openStatus: canteen.openStatus },
            },
        });
    } catch (err) {
        console.error('Dashboard failed:', err);
        return fail(res, 500, 'Internal server error');
    }
};

// ---------------------------------------------------------------- customers

exports.customers = async (req, res) => {
    const canteen = res.locals.canteen;
    try {
        const grouped = await Order.aggregate([
            { $match: { canteen: new mongoose.Types.ObjectId(canteen._id) } },
            {
                $group: {
                    _id: '$user',
                    orders: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
                    totalValue: { $sum: { $cond: [{ $ne: ['$status', 'Cancelled'] }, '$totalPrice', 0] } },
                    firstOrder: { $min: '$timestamp' },
                    lastOrder: { $max: '$timestamp' },
                },
            },
            { $sort: { lastOrder: -1 } },
        ]);
        const users = await User.find({ _id: { $in: grouped.map(g => g._id) } }, 'name').lean();
        const names = new Map(users.map(u => [String(u._id), u.name]));
        return res.json({
            status: 'ok',
            data: grouped.map(g => ({ _id: g._id, name: names.get(String(g._id)) || 'Former student', orders: g.orders, completed: g.completed, cancelled: g.cancelled, totalValue: round2(g.totalValue), firstOrder: g.firstOrder, lastOrder: g.lastOrder })),
        });
    } catch (err) {
        console.error(err);
        return fail(res, 500, 'Internal server error');
    }
};

exports.customerOrders = async (req, res) => {
    const canteen = res.locals.canteen;
    if (!OBJECT_ID.test(req.params.userId)) return fail(res, 404, 'Customer not found');
    const orders = await populateOrder(Order.find({ canteen: canteen._id, user: req.params.userId }).sort({ timestamp: -1 }).limit(100));
    if (!orders.length) return fail(res, 404, 'This student has not ordered from your canteen');
    return res.json({ status: 'ok', data: orders.map(shapeOrder) });
};

// ---------------------------------------------------------------- activity

exports.activity = async (req, res) => {
    const canteen = res.locals.canteen;
    const staff = res.locals.user;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const filter = { canteen: canteen._id };
    if (req.query.type === 'placed') filter.type = 'order_placed';
    if (req.query.type === 'orders') filter.type = { $in: ['order_placed', 'order_status', 'payment_recorded'] };
    if (req.query.type === 'menu') filter.type = { $in: ['item_created', 'item_updated', 'item_archived', 'availability', 'category', 'canteen_updated'] };
    const seen = staff.activitySeenAt || new Date(0);
    const [items, unread, waiting] = await Promise.all([
        Activity.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
        Activity.countDocuments({ canteen: canteen._id, createdAt: { $gt: seen } }),
        Order.countDocuments({ canteen: canteen._id, status: 'Placed' }),
    ]);
    return res.json({ status: 'ok', data: items.map(a => ({ ...a, unread: a.createdAt > seen })), unread, waiting, seenAt: staff.activitySeenAt || null });
};

exports.markActivitySeen = async (req, res) => {
    const staff = res.locals.user;
    staff.activitySeenAt = new Date();
    await staff.save();
    return res.json({ status: 'ok', seenAt: staff.activitySeenAt });
};

exports._internals = { dayKey, startOfDay, endOfDay, addDays, summarise, orderLines, itemSales, series, shapeOrder, populateOrder, round2, escapeRegex, TZ, DATE, OBJECT_ID, ACTIVE };
