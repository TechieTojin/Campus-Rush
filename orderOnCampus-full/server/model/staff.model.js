const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // bcrypt hash; empty while an admin-created account is waiting for its setup link to be used
    password: { type: String, default: '' },
    ownedCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' }],
    // manager: full control of the assigned canteen · staff: orders and availability only
    role: { type: String, enum: ['manager', 'staff'], default: 'manager' },
    // suspended accounts are rejected on every request; invited accounts haven't set a password yet
    status: { type: String, enum: ['active', 'suspended', 'invited'], default: 'active' },
    statusReason: { type: String, default: '' },
    // Included in session tokens; bumping it signs the account out everywhere.
    tokenVersion: { type: Number, default: 0 },
    setupTokenHash: { type: String, select: false },
    setupTokenExpires: { type: Date, select: false },
    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    lastLoginAt: Date,
    // Activity newer than this is shown as unread in the website.
    activitySeenAt: { type: Date },
    preferences: {
        soundOnNewOrder: { type: Boolean, default: true },
        liveRefreshSeconds: { type: Number, default: 10, min: 5, max: 60 },
    },
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);
module.exports = Staff;
