const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/user.model');
const Order = require('../model/order.model')
const Canteen = require('../model/canteen.model');
const Activity = require('../model/activity.model');
const Setting = require('../model/setting.model');
const realtime = require('../lib/realtime');
const { emitOrder } = require('../lib/orders');
const Customisation = require('../lib/customisation');
const PickupEstimate = require('../lib/pickupEstimate');
const secretKey = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Register user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60) {
            return res.status(400).json({ message: 'Name must be between 2 and 60 characters' });
        }
        if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ message: 'Enter a valid email address' });
        }
        if (typeof password !== 'string' || !PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters with a letter and a number' });
        }
        const userExist = await User.findOne({ email: email.trim() });
        if (userExist) {
            return res.json("exists");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name: name.trim(), email: email.trim(), password: hashedPassword });
        realtime.emit('student.updated', { userId: String(user._id) }, { admin: true });
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Login user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body || {};
    // Strings only: an object such as {"$ne": null} must never reach the query.
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const data = await User.findOne({ email: email.trim() });
        if (data) {
            const result = await bcrypt.compare(password, data.password);
            if (result) {
                const token = jwt.sign({ _id: data._id, typ: 'student' }, secretKey, { expiresIn: JWT_EXPIRY });
                User.updateOne({ _id: data._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});
                res.send({ status: "ok", data: token });
            } else {
                res.json("Incorrect password");
            }
        } else {
            res.json("No user found");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred");
    }
};
//getUser
exports.getUser = async (req, res) => {
    const { token } = req.body;
    try {
        const user = jwt.verify(token, secretKey);
        const userData = await User.findOne({ _id: user._id })
            .select('-password')
            .populate('favoriteCanteens')
            .populate('orders')
            .populate({
                path: 'favoriteCanteens',
                populate: {
                    path: 'menu'
                }
            });
        if (!userData) {
            return res.status(404).json({ msg: 'User not found' });
        }
        // io.emit('userDataUpdated', userData);
        return res.send({ status: "ok", data: userData });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(401).json({ msg: 'Auth failed' });
    }
}
//add fav
exports.addFavorites = async (req, res) => {
    const userId = req.user._id;
    const { canteenId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.favoriteCanteens.includes(canteenId)) {
            return res.status(400).json({ message: 'Canteen already added to favorites' });
        }
        user.favoriteCanteens.push(canteenId);
        await user.save();
        const safeUser = user.toObject();
        delete safeUser.password;
        return res.status(200).json({ message: 'Canteen added to favorites successfully', user: safeUser });
    } catch (error) {
        console.error('Error adding favorite canteen:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
//delete fav
exports.deleteFavorite = async (req, res) => {
    const userId = req.user._id;
    const { canteenId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!user.favoriteCanteens.includes(canteenId)) {
            return res.status(400).json({ message: 'Canteen not found in favorites' });
        }
        await User.findByIdAndUpdate(userId, { $pull: { favoriteCanteens: canteenId } });
        return res.status(200).json({ message: 'Canteen removed from favorites successfully' });
    } catch (error) {
        console.error('Error removing favorite canteen:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// favorites
exports.getFavorites = async (req, res) => {
    const userId = req.user._id;
    try {
        const user = await User.findById(userId).select('-password').populate('favoriteCanteens');
        res.status(200).json(user.favoriteCanteens);
    } catch (error) {
        res.status(500).json({ error: 'Could not retrieve favorites' });
    }
};
// orders of the authenticated student only
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ timestamp: -1 })
            .populate('canteen', 'name location openStatus pickupInstructions')
            .populate('items', 'name price description image')
            .lean();
        // The pickup credential is never part of a list response — students fetch a fresh one
        // from POST /users/orders/:orderId/pickup-token when they open the QR ticket. Stripped
        // here rather than with a projection, because `pickup.tokenHash` is already excluded by
        // `select: false` and the two would collide.
        for (const order of orders) delete order.pickup;
        res.send({ status: "ok", data: orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Could not retrieve orders' });
    }
};

const EMAIL_REGEX = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

exports.updateProfile = async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (name.length < 2 || name.length > 60) {
        return res.status(400).json({ message: 'Name must be between 2 and 60 characters' });
    }
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address' });
    }
    try {
        const taken = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (taken) {
            return res.status(409).json({ message: 'That email is already used by another account' });
        }
        const user = await User.findByIdAndUpdate(req.user._id, { name, email }, { new: true }).select('-password');
        realtime.emit('student.updated', { userId: String(user._id) }, { admin: true });
        return res.status(200).json({ status: 'ok', data: user });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
        return res.status(400).json({ message: 'New password must be at least 8 characters with a letter and a number' });
    }
    try {
        const user = await User.findById(req.user._id);
        const matches = await bcrypt.compare(currentPassword, user.password);
        if (!matches) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return res.status(200).json({ status: 'ok', message: 'Password updated' });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
//place order
exports.placeOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        // Two payload shapes are accepted:
        //   legacy  { canteen, items: [itemId, itemId, ...] }   one entry per unit, no customisation
        //   V4      { canteen, lines: [{ item, quantity, selections[], instructions }] }
        // Older app builds keep working unchanged.
        const { canteen: canteenId, items, lines: rawLines } = req.body;

        const hasLines = Array.isArray(rawLines) && rawLines.length > 0;
        const hasItems = Array.isArray(items) && items.length > 0;
        if (!canteenId || (!hasLines && !hasItems)) {
            return res.status(400).json({ message: 'canteen and items are required' });
        }

        if (typeof canteenId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(canteenId)) {
            return res.status(400).json({ message: 'Invalid canteen' });
        }
        // Platform rules set by admins (settings are validated when saved).
        const settings = await Setting.get();
        if (settings.maintenance?.enabled) {
            return res.status(503).json({ message: settings.maintenance.message || 'Campus Rush is under maintenance. Ordering will be back shortly.', code: 'MAINTENANCE' });
        }
        const maxItems = settings.ordering?.maxItemsPerOrder || 20;
        const maxQty = settings.ordering?.maxQuantityPerItem || 10;
        const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

        // Normalise either payload into one list of { itemId, quantity, selections, instructions }.
        const requested = [];
        if (hasLines) {
            if (rawLines.length > maxItems) {
                return res.status(400).json({ message: `An order can have at most ${maxItems} items` });
            }
            for (const line of rawLines) {
                if (!line || typeof line !== 'object') {
                    return res.status(400).json({ message: 'Your cart contains an invalid item' });
                }
                const itemId = typeof line.item === 'string' ? line.item : '';
                if (!OBJECT_ID.test(itemId)) {
                    return res.status(400).json({ message: `Invalid item ID: ${itemId}` });
                }
                const quantity = typeof line.quantity === 'number' ? line.quantity : Number(line.quantity);
                if (!Number.isInteger(quantity) || quantity < 1) {
                    return res.status(400).json({ message: 'Every item needs a whole quantity of at least 1' });
                }
                requested.push({ itemId, quantity, selections: line.selections, instructions: line.instructions });
            }
        } else {
            const counts = {};
            for (const itemId of items) {
                if (typeof itemId !== 'string' || !OBJECT_ID.test(itemId)) {
                    return res.status(400).json({ message: `Invalid item ID: ${itemId}` });
                }
                counts[itemId] = (counts[itemId] || 0) + 1;
            }
            for (const [itemId, quantity] of Object.entries(counts)) {
                requested.push({ itemId, quantity, selections: [], instructions: '' });
            }
        }

        const totalUnits = requested.reduce((sum, line) => sum + line.quantity, 0);
        if (totalUnits > maxItems) {
            return res.status(400).json({ message: `An order can have at most ${maxItems} items` });
        }
        // Per-dish limit is checked across the whole order, so the same dish configured two ways
        // can't be used to order more of it than the platform allows.
        const unitsPerItem = {};
        for (const line of requested) {
            unitsPerItem[line.itemId] = (unitsPerItem[line.itemId] || 0) + line.quantity;
            if (unitsPerItem[line.itemId] > maxQty) {
                return res.status(400).json({ message: `You can order at most ${maxQty} of the same item` });
            }
        }
        const canteen = await Canteen.findById(canteenId).populate('menu');
        if (!canteen || canteen.status === 'pending' || canteen.status === 'rejected') {
            return res.status(404).json({ message: 'Canteen not found' });
        }
        if (canteen.status === 'suspended') {
            return res.status(400).json({ message: `${canteen.name} is temporarily unavailable on Campus Rush`, code: 'CANTEEN_SUSPENDED' });
        }
        if (canteen.openStatus === false) {
            return res.status(400).json({ message: `${canteen.name} isn't taking orders right now` });
        }

        const menuById = new Map(canteen.menu.map(m => [m._id.toString(), m]));
        let totalPaise = 0;
        const validatedItems = [];
        const lineItems = [];
        const seenLineKeys = new Set();

        for (const requestedLine of requested) {
            const menuItem = menuById.get(requestedLine.itemId);
            if (!menuItem) {
                return res.status(400).json({ message: `Item ${requestedLine.itemId} does not belong to this canteen` });
            }
            if (!menuItem.available) {
                return res.status(400).json({ message: `Item ${menuItem.name} is not available` });
            }
            // Every add-on price comes from the stored menu item here — the client only ever
            // sends which option keys it chose.
            const priced = Customisation.priceSelections(menuItem, requestedLine.selections, requestedLine.instructions);
            if (priced.error) {
                return res.status(400).json({ message: priced.error, code: 'CUSTOMISATION' });
            }
            const { selections, addonsPaise, unitPricePaise, instructions } = priced.snapshot;

            const lineKey = Customisation.lineKeyFor(menuItem._id, selections, instructions);
            if (seenLineKeys.has(lineKey)) {
                return res.status(400).json({ message: `"${menuItem.name}" appears twice with the same choices — combine them into one line` });
            }
            seenLineKeys.add(lineKey);

            totalPaise += unitPricePaise * requestedLine.quantity;
            for (let i = 0; i < requestedLine.quantity; i++) {
                validatedItems.push(menuItem._id);
            }
            lineItems.push({
                item: menuItem._id,
                name: menuItem.name,
                price: Customisation.toRupees(unitPricePaise),
                quantity: requestedLine.quantity,
                category: menuItem.category || '',
                lineKey,
                basePrice: menuItem.price,
                selections,
                addonsTotal: Customisation.toRupees(addonsPaise),
                lineTotal: Customisation.toRupees(unitPricePaise * requestedLine.quantity),
                instructions,
            });
        }

        // Pickup estimate. Counting the orders already in the kitchen is a cheap, honest signal;
        // the calculation itself is in lib/pickupEstimate.js.
        const queueAhead = await Order.countDocuments({ canteen: canteenId, status: { $in: ['Placed', 'Processing'] } });
        const estimate = PickupEstimate.computeMinutes({
            items: requested.map(r => menuById.get(r.itemId)),
            units: totalUnits,
            canteen,
            queueAhead,
        });
        const placedAt = new Date();

        const newOrder = new Order({
            user: userId,
            canteen: canteenId,
            items: validatedItems,
            lineItems,
            totalPrice: Customisation.toRupees(totalPaise),
            status: 'Placed',
            statusHistory: [{ status: 'Placed', at: placedAt }],
            paymentMethod: 'counter',
            paymentStatus: 'unpaid',
            estimateMinutes: estimate.minutes,
            estimatedReadyAt: PickupEstimate.readyAtFrom(placedAt, estimate.minutes),
            estimateSource: 'auto',
            estimateUpdatedAt: placedAt,
            timestamp: placedAt,
        });
        const savedOrder = await newOrder.save();
        await User.findByIdAndUpdate(userId, { $push: { orders: savedOrder._id } });
        await Canteen.findByIdAndUpdate(canteenId, { $push: { orders: savedOrder._id } });
        Activity.record({
            canteen: canteen._id,
            type: 'order_placed',
            order: savedOrder._id,
            actor: 'student',
            message: `New order #${String(savedOrder._id).slice(-6).toUpperCase()} — ${lineItems.map(l => `${l.quantity}× ${l.name}`).join(', ')} (₹${savedOrder.totalPrice})`
        });
        emitOrder('order.created', savedOrder);
        res.status(201).json(savedOrder);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


// paymentDetails
// exports.updatePaymentDetails = async (req, res) => {
//     try {
//         const userId = req.user.userId; // Assuming user ID is available in the request object after authentication
//         const { paymentDetails } = req.body;
//         await User.findByIdAndUpdate(userId, { paymentDetails }, { new: true });
//         res.status(200).json({ message: 'Payment details updated successfully' });
//     } catch (error) {
//         res.status(500).json({ error: 'Could not update payment details' });
//     }
// };