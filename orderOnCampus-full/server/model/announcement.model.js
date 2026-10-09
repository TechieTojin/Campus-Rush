const mongoose = require('mongoose');

// In-app announcements. Delivered through the student app and canteen website while they are open;
// there is no push/email delivery.
const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    // students: student app · canteens: canteen website (all, or one canteen) · all: both
    audience: { type: String, enum: ['students', 'canteens', 'all'], required: true },
    canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' }, // optional single-canteen target for audience 'canteens'
    tone: { type: String, enum: ['info', 'success', 'warning', 'critical'], default: 'info' },
    active: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    // Staff who have read it (canteen website read state). Students track read state on the device.
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

announcementSchema.statics.liveFilter = (now = new Date()) => ({
    active: true,
    $and: [
        { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gt: now } }] },
    ],
});

module.exports = mongoose.model('Announcement', announcementSchema);
