const mongoose = require('mongoose');

// Student-app home banners. Targets are limited to in-app destinations (no arbitrary URLs).
const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    image: { type: String, default: '' }, // /uploads/<hex>.<ext>
    target: {
        type: { type: String, enum: ['none', 'canteen', 'search'], default: 'none' },
        canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' },
        query: { type: String, default: '' },
    },
    tone: { type: String, enum: ['brand', 'saffron', 'dark'], default: 'brand' },
    active: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
