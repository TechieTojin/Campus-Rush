const mongoose = require('mongoose');

const DIETARY = ['', 'veg', 'non-veg', 'egg', 'vegan'];

// A canteen-defined choice a student makes when ordering this dish (size, spice level, add-ons…).
// `key` is a stable identifier so editing a group doesn't orphan selections already in carts or
// on past orders. Validation and pricing live in lib/customisation.js — the schema only stores
// what that module has already approved.
const optionSchema = new mongoose.Schema({
    _id: false,
    key: { type: String, required: true },
    label: { type: String, required: true },
    // Added to the dish price when chosen. Never negative: an add-on cannot discount a dish.
    priceDelta: { type: Number, default: 0, min: 0 },
    available: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
});

const groupSchema = new mongoose.Schema({
    _id: false,
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    required: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    min: { type: Number, default: 0, min: 0 },
    max: { type: Number, default: 1, min: 1 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    options: { type: [optionSchema], default: [] },
});

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
    // Optional. Dishes created before customisation existed simply have an empty list.
    customisationGroups: { type: [groupSchema], default: [] },
}, { timestamps: true });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
MenuItem.DIETARY = DIETARY;
module.exports = MenuItem;
