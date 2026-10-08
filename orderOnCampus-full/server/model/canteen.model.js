const mongoose = require('mongoose');

const canteenSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    canteenDescription: String,
    category: { type: String, required: true },
    // Whether the canteen is accepting orders right now; enforced when an order is placed.
    openStatus: {type:Boolean,default:true},
    menu: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' , required: false}],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false }],
    // Ordered list of menu section names shown to students.
    menuCategories: [{ type: String }],
    logo: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    phone: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    // Informational "HH:MM" opening times; ordering is controlled by openStatus.
    openingTime: { type: String, default: '' },
    closingTime: { type: String, default: '' },
    pickupInstructions: { type: String, default: '' },
    // staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true } // Reference to staff member who manages the canteen
});

const Canteen = mongoose.model('Canteen', canteenSchema);
module.exports = Canteen;
