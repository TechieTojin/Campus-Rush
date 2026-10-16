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
        // Unit price actually charged (base + add-ons). Kept under the original field name so
        // code written before customisation existed still reads the right number.
        price: Number,
        quantity: Number,
        category: String,
        // ---- customisation snapshot (added in V4; absent on older orders) ----
        // Identity of this configured line, so the same dish ordered two ways stays two lines.
        lineKey: String,
        // Dish price before add-ons, kept separately so the breakdown can be shown later.
        basePrice: Number,
        // Immutable record of what the student chose. Labels are copied in, so renaming or
        // deleting an option on the menu never rewrites a past order.
        selections: [{
            _id: false,
            group: String,
            groupName: String,
            option: String,
            label: String,
            priceDelta: Number,
        }],
        addonsTotal: Number,   // per unit
        lineTotal: Number,     // price * quantity
        instructions: String,  // plain text note for the kitchen; never affects pricing
    }],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: STATUSES, default: 'Placed' },
    statusHistory: [{ _id: false, status: { type: String, enum: STATUSES }, at: { type: Date, default: Date.now } }],
    // Only pay-at-counter is supported. 'paid' is recorded by staff when the money is collected.
    paymentMethod: { type: String, enum: ['counter'], default: 'counter' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paidAt: Date,

    // ---- pickup estimate (V4) ----
    // What we told the student. Never overwrites the actual timestamps below.
    estimatedReadyAt: Date,
    estimateMinutes: Number,
    // 'auto'  = calculated by lib/pickupEstimate.js when the order was placed
    // 'staff' = a canteen manager set the time or added a delay by hand
    estimateSource: { type: String, enum: ['auto', 'staff'], default: 'auto' },
    estimateUpdatedAt: Date,
    // Minutes of delay staff announced on top of the original estimate (cumulative, display only).
    prepDelayMinutes: { type: Number, default: 0, min: 0 },

    // ---- what actually happened (never estimates) ----
    readyAt: Date,
    collectedAt: Date,

    // ---- QR pickup credential (V4) ----
    // Only the hash is stored, and it is excluded from queries by default so it cannot leak
    // through a controller that forgets to project its fields. See lib/pickupToken.js.
    pickup: {
        tokenId: { type: String, index: true, sparse: true },
        tokenHash: { type: String, select: false },
        issuedAt: Date,
        expiresAt: Date,
        consumedAt: Date,
        // Staff member who completed the scan, for the collection record.
        collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
        // 'qr' when a code was scanned, 'manual' for the documented counter fallback.
        method: { type: String, enum: ['qr', 'manual'] },
    },

    timestamp: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);
Order.STATUSES = STATUSES;
module.exports = Order;
