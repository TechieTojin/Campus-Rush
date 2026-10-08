const mongoose = require('mongoose');

const STATUSES = ['Placed', 'Processing', 'Completed', 'Cancelled', 'Ready'];

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' },
    // One entry per unit ordered (kept for older clients).
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
    // Name and price captured at order time so later menu edits don't rewrite history.
    // Orders placed before this field existed have no lineItems.
    lineItems: [{
        _id: false,
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        price: Number,
        quantity: Number,
        category: String,
    }],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: STATUSES, default: 'Placed' },
    statusHistory: [{ _id: false, status: { type: String, enum: STATUSES }, at: { type: Date, default: Date.now } }],
    // Only pay-at-counter is supported. 'paid' is recorded by staff when the money is collected.
    paymentMethod: { type: String, enum: ['counter'], default: 'counter' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paidAt: Date,
    timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
Order.STATUSES = STATUSES;
module.exports = Order;
