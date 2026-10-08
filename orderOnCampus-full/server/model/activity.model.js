const mongoose = require('mongoose');

// Operational events per canteen, shown in the staff website's notifications page.
const activitySchema = new mongoose.Schema({
    canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true, index: true },
    type: {
        type: String,
        required: true,
        enum: ['order_placed', 'order_status', 'payment_recorded', 'item_created', 'item_updated', 'item_archived', 'availability', 'canteen_updated', 'category'],
    },
    message: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    actor: { type: String, enum: ['student', 'staff'], default: 'staff' },
    createdAt: { type: Date, default: Date.now, index: true },
});

const Activity = mongoose.model('Activity', activitySchema);

Activity.record = (data) => Activity.create(data).catch((err) => console.error('Activity log failed:', err.message));

module.exports = Activity;
