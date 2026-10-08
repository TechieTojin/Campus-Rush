const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ['Placed', 'Processing', 'Completed', 'Cancelled', 'Ready'], default: 'Placed' },
    timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

