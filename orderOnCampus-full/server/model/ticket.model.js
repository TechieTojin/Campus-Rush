const mongoose = require('mongoose');

// Support requests from students (app) and canteen staff (website), handled in the admin portal.
const ticketSchema = new mongoose.Schema({
    source: { type: String, enum: ['student', 'canteen'], required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    canteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    category: { type: String, enum: ['order', 'payment', 'account', 'menu', 'app', 'other'], default: 'other' },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    // 'reply' notes are shown to the requester; 'internal' notes only to admins.
    notes: [{
        _id: false,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
        byName: String,
        visibility: { type: String, enum: ['reply', 'internal'], default: 'internal' },
        text: String,
        at: { type: Date, default: Date.now },
    }],
    history: [{ _id: false, status: String, by: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
