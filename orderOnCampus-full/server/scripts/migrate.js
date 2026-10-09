#!/usr/bin/env node
// Idempotent data migration for the admin platform. Only fills in fields that are missing —
// it never deletes documents or overwrites existing values, so it is safe to run repeatedly.
//
//   npm run migrate            apply
//   npm run migrate -- --dry   report what would change
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Canteen, Staff, User, MenuItem, Setting } = require('../lib/models');

const dry = process.argv.includes('--dry');

(async () => {
    if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is not set'); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    const report = [];
    const run = async (label, model, filter, update) => {
        const n = await model.countDocuments(filter);
        if (n && !dry) await model.updateMany(filter, update);
        report.push(`${dry ? '[dry] ' : ''}${label}: ${n}`);
    };

    await run('canteens without status → active', Canteen, { status: { $exists: false } }, { $set: { status: 'active' } });
    await run('staff without status → active', Staff, { status: { $exists: false } }, { $set: { status: 'active' } });
    await run('staff without role → manager', Staff, { role: { $exists: false } }, { $set: { role: 'manager' } });
    await run('staff without tokenVersion → 0', Staff, { tokenVersion: { $exists: false } }, { $set: { tokenVersion: 0 } });
    await run('students without status → active', User, { status: { $exists: false } }, { $set: { status: 'active' } });

    // Menu items created before `canteen` was stored: take it from the canteen whose menu lists the item.
    const canteens = await Canteen.find({}, 'menu').lean();
    let backfilled = 0;
    for (const c of canteens) {
        const n = await MenuItem.countDocuments({ _id: { $in: c.menu }, canteen: { $exists: false } });
        if (n && !dry) await MenuItem.updateMany({ _id: { $in: c.menu }, canteen: { $exists: false } }, { $set: { canteen: c._id } });
        backfilled += n;
    }
    report.push(`${dry ? '[dry] ' : ''}menu items given their canteen: ${backfilled}`);

    if (!dry) await Setting.get(); // creates the settings document with defaults if missing
    report.push(`${dry ? '[dry] ' : ''}platform settings document: ${(await Setting.countDocuments()) ? 'present' : 'will be created'}`);

    console.log(report.join('\n'));
    await mongoose.disconnect();
})().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
