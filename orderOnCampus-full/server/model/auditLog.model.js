const mongoose = require('mongoose');

// Append-only record of sensitive actions. The application never updates or deletes entries:
// every update/delete query on this model throws.
const auditSchema = new mongoose.Schema({
    actor: {
        type: { type: String, enum: ['admin', 'staff', 'student', 'system'], required: true },
        id: { type: mongoose.Schema.Types.ObjectId },
        name: String,
        role: String,
    },
    action: { type: String, required: true, index: true },
    target: {
        type: { type: String },
        id: { type: String },
        label: String,
    },
    result: { type: String, enum: ['success', 'failure'], default: 'success' },
    status: Number,
    // Safe, non-secret context such as changed field values. Never passwords, tokens or cookies.
    details: { type: mongoose.Schema.Types.Mixed },
    ip: String,
    at: { type: Date, default: Date.now, index: true },
});

const block = function () { throw new Error('Audit log entries are append-only'); };
['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndReplace'].forEach((op) => {
    auditSchema.pre(op, block);
});
auditSchema.pre('save', function (next) {
    if (!this.isNew) return next(new Error('Audit log entries are append-only'));
    return next();
});

module.exports = mongoose.model('AuditLog', auditSchema);
