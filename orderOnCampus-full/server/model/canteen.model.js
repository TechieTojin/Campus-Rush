const mongoose = require('mongoose');

const canteenSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    canteenDescription: String,
    category: { type: String, required: true },
    openStatus: {type:Boolean,default:true},
    menu: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' , required: false}],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false }]
    // staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true } // Reference to staff member who manages the canteen
});

const Canteen = mongoose.model('Canteen', canteenSchema);
module.exports = Canteen;
