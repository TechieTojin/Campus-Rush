const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ownedCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' }],
    // Activity newer than this is shown as unread in the website.
    activitySeenAt: { type: Date },
    preferences: {
        soundOnNewOrder: { type: Boolean, default: true },
        liveRefreshSeconds: { type: Number, default: 10, min: 5, max: 60 },
    },
});

const Staff = mongoose.model('Staff', staffSchema);
module.exports = Staff;
