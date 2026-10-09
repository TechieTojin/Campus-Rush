const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/user.model');
const Order = require('../model/order.model')
const Canteen = require('../model/canteen.model');
const Activity = require('../model/activity.model');
const Setting = require('../model/setting.model');
const realtime = require('../lib/realtime');
const { emitOrder } = require('../lib/orders');
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
            .populate('items', 'name price description image');
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
        const { canteen: canteenId, items } = req.body;

        if (!canteenId || !items || !Array.isArray(items) || items.length === 0) {
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
        if (items.length > maxItems) {
            return res.status(400).json({ message: `An order can have at most ${maxItems} items` });
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

        const menuItemIds = canteen.menu.map(m => m._id.toString());
        let totalPrice = 0;
        const validatedItems = [];
        const lineItems = [];

        const itemCounts = {};
        for (const itemId of items) {
            if (typeof itemId !== 'string' || !itemId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ message: `Invalid item ID: ${itemId}` });
            }
            itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
            if (itemCounts[itemId] > maxQty) {
                return res.status(400).json({ message: `You can order at most ${maxQty} of the same item` });
            }
        }

        for (const [itemId, qty] of Object.entries(itemCounts)) {
            if (!menuItemIds.includes(itemId)) {
                return res.status(400).json({ message: `Item ${itemId} does not belong to this canteen` });
            }
            const menuItem = canteen.menu.find(m => m._id.toString() === itemId);
            if (!menuItem.available) {
                return res.status(400).json({ message: `Item ${menuItem.name} is not available` });
            }
            totalPrice += menuItem.price * qty;
            for (let i = 0; i < qty; i++) {
                validatedItems.push(menuItem._id);
            }
            lineItems.push({ item: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: qty, category: menuItem.category || '' });
        }

        const newOrder = new Order({
            user: userId,
            canteen: canteenId,
            items: validatedItems,
            lineItems,
            totalPrice: Math.round(totalPrice * 100) / 100,
            status: 'Placed',
            statusHistory: [{ status: 'Placed', at: new Date() }],
            paymentMethod: 'counter',
            paymentStatus: 'unpaid'
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