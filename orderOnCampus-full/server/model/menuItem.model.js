const mongoose = require('mongoose');

const DIETARY = ['', 'veg', 'non-veg', 'egg', 'vegan'];

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    category: { type: String, default: '' },
    // Path served by this API, e.g. /uploads/<hex>.jpg
    image: { type: String, default: '' },
    prepTime: { type: Number, min: 0, max: 240 },
    dietary: { type: String, enum: DIETARY, default: '' },
    canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' },
    // Archived items are removed from the canteen menu but kept so past orders still resolve.
    archived: { type: Boolean, default: false },
}, { timestamps: true });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
MenuItem.DIETARY = DIETARY;
module.exports = MenuItem;
