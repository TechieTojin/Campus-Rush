const mongoose = require('mongoose');

// Single platform-settings document (key 'platform'). Every field here is enforced or rendered
// somewhere; nothing is decorative. See controllers/contentController.js for validation.
const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'platform' },
    platformName: { type: String, default: 'Campus Rush' },
    support: {
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        hours: { type: String, default: '' },
    },
    // Blocks new orders platform-wide (server-enforced) and shows a notice in the student app.
    maintenance: {
        enabled: { type: Boolean, default: false },
        message: { type: String, default: '' },
    },
    ordering: {
        maxItemsPerOrder: { type: Number, default: 20, min: 1, max: 100 },
        maxQuantityPerItem: { type: Number, default: 10, min: 1, max: 50 },
    },
    onboarding: {
        staffSignupEnabled: { type: Boolean, default: true },
        requireCanteenApproval: { type: Boolean, default: true },
    },
    studentApp: {
        featuredCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' }],
        showPopularItems: { type: Boolean, default: true },
        enableFavorites: { type: Boolean, default: true },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

let cache = null;
let cacheAt = 0;
// Cached for a few seconds; writes call Setting.invalidate().
Setting.get = async () => {
    if (cache && Date.now() - cacheAt < 5000) return cache;
    cache = await Setting.findOneAndUpdate({ key: 'platform' }, { $setOnInsert: { key: 'platform' } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    cacheAt = Date.now();
    return cache;
};
Setting.invalidate = () => { cache = null; };

module.exports = Setting;
