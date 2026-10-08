const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    // canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
module.exports = MenuItem;