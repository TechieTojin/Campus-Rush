const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ownedCanteens: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' }]
});

const Staff = mongoose.model('Staff', staffSchema);
module.exports = Staff;
