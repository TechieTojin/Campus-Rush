#!/usr/bin/env node
// Creates the FIRST platform administrator (super_admin) for local development.
//
//   npm run bootstrap:admin -- --write-env   generate credentials into server/.env (if absent), then create the admin
//   npm run bootstrap:admin                  create the admin from ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD
//
// Safety:
//   - Command line only; there is no HTTP endpoint for this.
//   - Refuses to run when NODE_ENV=production.
//   - Does nothing if any administrator already exists, so it never creates extra admins and
//     never resets an existing admin's password.
//   - --write-env only APPENDS the two ADMIN_BOOTSTRAP_* lines when they are missing; existing
//     values are left untouched. The password is never printed.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_PATH = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: ENV_PATH });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../model/admin.model');
const { PASSWORD_REGEX } = require('../controllers/admin/authController');

// 20 characters from a CSPRNG, guaranteed to include upper, lower and digits.
function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    for (;;) {
        const bytes = crypto.randomBytes(20);
        const p = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
        if (PASSWORD_REGEX.test(p)) return p;
    }
}

(async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to bootstrap an admin with NODE_ENV=production. Create production admins through a reviewed process.');
        process.exit(1);
    }

    if (process.argv.includes('--write-env') && !(process.env.ADMIN_BOOTSTRAP_EMAIL && process.env.ADMIN_BOOTSTRAP_PASSWORD)) {
        const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
        const lines = [];
        if (!process.env.ADMIN_BOOTSTRAP_EMAIL) lines.push('ADMIN_BOOTSTRAP_EMAIL=superadmin@campusrush.local');
        if (!process.env.ADMIN_BOOTSTRAP_PASSWORD) lines.push(`ADMIN_BOOTSTRAP_PASSWORD=${generatePassword()}`);
        const block = `${current.endsWith('\n') || !current ? '' : '\n'}\n# Local development Super Admin (created by scripts/bootstrap-admin.js). Never commit.\n${lines.join('\n')}\n`;
        fs.appendFileSync(ENV_PATH, block);
        require('dotenv').config({ path: ENV_PATH, override: false });
        // dotenv won't override existing process.env keys; read the freshly appended values directly.
        const parsed = require('dotenv').parse(fs.readFileSync(ENV_PATH));
        process.env.ADMIN_BOOTSTRAP_EMAIL = parsed.ADMIN_BOOTSTRAP_EMAIL;
        process.env.ADMIN_BOOTSTRAP_PASSWORD = parsed.ADMIN_BOOTSTRAP_PASSWORD;
        console.log(`Added ${lines.map((l) => l.split('=')[0]).join(' and ')} to server/.env (value not shown).`);
    }

    const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
    if (!email || !password) {
        console.error('Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in server/.env, or run with --write-env.');
        process.exit(1);
    }
    if (!/^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(email)) { console.error('ADMIN_BOOTSTRAP_EMAIL is not a valid email.'); process.exit(1); }
    if (!PASSWORD_REGEX.test(password)) { console.error('ADMIN_BOOTSTRAP_PASSWORD must be 12+ characters with upper- and lower-case letters and a number.'); process.exit(1); }

    await mongoose.connect(process.env.MONGODB_URI);
    const existing = await Admin.countDocuments();
    if (existing > 0) {
        console.log(`An administrator already exists (${existing} total). Nothing was created or changed.`);
        await mongoose.disconnect();
        return;
    }
    await Admin.create({ name: 'Super Admin', email, password: await bcrypt.hash(password, 12), role: 'super_admin', status: 'active', passwordChangedAt: new Date() });
    console.log(`Created super admin ${email}. Password: see ADMIN_BOOTSTRAP_PASSWORD in server/.env.`);
    await mongoose.disconnect();
})().catch((e) => { console.error('Bootstrap failed:', e.message); process.exit(1); });
