const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favoriteCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    // paymentDetails: { type: Object }
});

const User = mongoose.model('User', userSchema);
module.exports = User;