const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favoriteCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    // Suspended students can still sign in and see their order history, but cannot place orders
    // or change favorites. Orders already placed continue to be fulfilled by the canteen.
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    statusReason: { type: String, default: '' },
    lastLoginAt: Date,
    // paymentDetails: { type: Object }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
