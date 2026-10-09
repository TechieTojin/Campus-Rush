const mongoose = require('mongoose');

// Platform administrators. Separate from canteen staff and students; there is no public sign-up.
// super_admin: everything, including administrators and platform settings.
// operations:  canteens, staff, students, menus, orders, content and support — not admins or platform settings.
const ROLES = ['super_admin', 'operations'];

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // bcrypt hash; empty until an invited admin completes setup
    password: { type: String, default: '' },
    role: { type: String, enum: ROLES, default: 'operations' },
    status: { type: String, enum: ['active', 'suspended', 'invited'], default: 'active' },
    // Bumped to revoke every existing session (password change, suspension, "sign out everywhere").
    tokenVersion: { type: Number, default: 0 },
    // One-time setup link for invited admins (sha256 of the token; the token itself is never stored).
    setupTokenHash: { type: String, select: false },
    setupTokenExpires: { type: Date, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    preferences: {
        theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    },
}, { timestamps: true });

adminSchema.set('toJSON', {
    transform: (doc, ret) => { delete ret.password; delete ret.setupTokenHash; delete ret.setupTokenExpires; delete ret.tokenVersion; return ret; },
});

const Admin = mongoose.model('Admin', adminSchema);
Admin.ROLES = ROLES;
module.exports = Admin;
