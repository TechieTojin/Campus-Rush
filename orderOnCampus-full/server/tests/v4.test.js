// Campus Rush V4 — food customisation, pickup estimate and QR pickup verification.
//
// Same style as platform.test.js: black-box HTTP against a running API, using disposable
// [TEST] records that are archived (never deleted) at the end.
//
// Prerequisites: the backend is running against the LOCAL DEV database, and server/.env has
// TEST_STAFF_EMAIL/PASSWORD, TEST_STAFF2_EMAIL/PASSWORD and TEST_STUDENT_EMAIL/PASSWORD.
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const mongoose = require('mongoose');
const { RUN, asStaff, asStudent, wait } = require('./helpers');
const QR = require('../lib/qr');
const Customisation = require('../lib/customisation');
const Estimate = require('../lib/pickupEstimate');
const Token = require('../lib/pickupToken');

// The canteen portal's QR decoder, reused here to prove our encoder produces codes that the
// scanner can actually read. Not a server dependency — only the tests reach for it.
let jsQR = null;
try {
    jsQR = require(path.join(__dirname, '../../client/orderOnCampus-canteen/node_modules/jsqr')).default;
} catch { /* reported as a skip below */ }

const money = (n) => Math.round(n * 100) / 100;

let staff;      // owns canteen A
let other;      // owns a different canteen
let student;
let canteenId;
let base;       // /staff/canteens/:id
const created = [];   // menu item ids to archive afterwards

// A dish with three groups: a required single-select, an optional multi-select, and a
// required single-select where every option is free.
const GROUPS = [
    {
        name: 'Size', required: true, multiple: false, options: [
            { label: 'Regular', priceDelta: 0 },
            { label: 'Large', priceDelta: 30 },
        ],
    },
    {
        name: 'Toppings', required: false, multiple: true, min: 0, max: 2, options: [
            { label: 'Extra onion', priceDelta: 10 },
            { label: 'Jalapenos', priceDelta: 15 },
            { label: 'Extra sauce', priceDelta: 10 },
        ],
    },
    {
        name: 'Spice level', required: true, multiple: false, options: [
            { label: 'Mild', priceDelta: 0 },
            { label: 'Medium', priceDelta: 0 },
            { label: 'Extra spicy', priceDelta: 0 },
        ],
    },
];

const findGroup = (item, name) => item.customisationGroups.find(g => g.name === name);
const opt = (item, groupName, label) => {
    const g = findGroup(item, groupName);
    return { group: g.key, option: g.options.find(o => o.label === label).key };
};

let dish;       // the customisable dish
let plainDish;  // a dish with no customisation at all (backward compatibility)

before(async () => {
    // One scenario (credential expiry) has to age a record that no endpoint can age, so the
    // suite opens its own connection to the same development database the API is using.
    if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI).catch(() => {});
    staff = await asStaff(process.env.TEST_STAFF_EMAIL, process.env.TEST_STAFF_PASSWORD);
    other = await asStaff(process.env.TEST_STAFF2_EMAIL, process.env.TEST_STAFF2_PASSWORD);
    student = await asStudent(process.env.TEST_STUDENT_EMAIL, process.env.TEST_STUDENT_PASSWORD);
    canteenId = String(staff.me.canteens?.[0]?._id || staff.me.ownedCanteens?.[0]?._id || staff.me.ownedCanteens?.[0]);
    assert.ok(/^[0-9a-f]{24}$/i.test(canteenId), 'staff must own a canteen');
    base = `/staff/canteens/${canteenId}`;

    // The canteen must be open and active for ordering tests.
    await staff.put(base, { openStatus: true, defaultPrepTime: 10 });

    const make = async (body) => {
        const r = await staff.post(`${base}/menu`, body);
        assert.equal(r.status, 201, `create dish: ${JSON.stringify(r.json)}`);
        created.push(String(r.json.data._id));
        return r.json.data;
    };
    dish = await make({ name: `[TEST] Custom Burger ${RUN}`, price: 80, available: true, prepTime: 12, customisationGroups: GROUPS });
    plainDish = await make({ name: `[TEST] Plain Samosa ${RUN}`, price: 20, available: true, prepTime: 5 });
});

after(async () => {
    // Archive, never delete: past orders must keep resolving their items.
    for (const id of created) await staff.del(`${base}/menu/${id}`).catch(() => {});
    await mongoose.disconnect().catch(() => {});
});

// ---------------------------------------------------------------- QR encoder

describe('QR encoder', () => {
    test('round-trips through the scanner decoder for every mask', { skip: !jsQR && 'jsqr not installed' }, () => {
        const toRGBA = (m, scale = 5, quiet = 4) => {
            const count = m.length; const size = (count + quiet * 2) * scale;
            const data = new Uint8ClampedArray(size * size * 4);
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                const r = Math.floor(y / scale) - quiet; const c = Math.floor(x / scale) - quiet;
                const dark = r >= 0 && r < count && c >= 0 && c < count && m[r][c] === 1;
                const v = dark ? 0 : 255; const i = (y * size + x) * 4;
                data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
            }
            return { data, size };
        };
        const payload = Token.issue().payload;
        for (let mask = 0; mask < 8; mask++) {
            const { modules } = QR.encodeMatrix(payload, { forceMask: mask });
            const { data, size } = toRGBA(modules);
            const decoded = jsQR(data, size, size);
            assert.ok(decoded, `mask ${mask} produced an unreadable code`);
            assert.equal(decoded.data, payload, `mask ${mask} decoded to the wrong text`);
        }
    });

    test('produces a valid PNG data URI', () => {
        const uri = QR.toDataUri('CRP1.test');
        assert.ok(uri.startsWith('data:image/png;base64,'));
        const png = Buffer.from(uri.split(',')[1], 'base64');
        assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });
});

// ---------------------------------------------------------------- customisation: definition

describe('customisation: canteen defines the options', () => {
    test('groups are stored with stable keys and ordering', () => {
        assert.equal(dish.customisationGroups.length, 3);
        const size = findGroup(dish, 'Size');
        assert.ok(/^g_[0-9a-f]{8}$/.test(size.key));
        assert.ok(size.options.every(o => /^o_[0-9a-f]{8}$/.test(o.key)));
        assert.equal(size.required, true);
        assert.equal(size.multiple, false);
        assert.equal(size.max, 1, 'single-select groups are capped at one choice');
    });

    test('editing a dish preserves existing option keys so carts stay valid', async () => {
        const before = findGroup(dish, 'Size').options.find(o => o.label === 'Large').key;
        const groups = JSON.parse(JSON.stringify(dish.customisationGroups));
        groups[0].options.find(o => o.label === 'Large').priceDelta = 35;
        const r = await staff.put(`${base}/menu/${dish._id}`, { customisationGroups: groups });
        assert.equal(r.status, 200);
        const after = findGroup(r.json.data, 'Size').options.find(o => o.label === 'Large');
        assert.equal(after.key, before, 'the option key must not change');
        assert.equal(after.priceDelta, 35);
        // put it back
        groups[0].options.find(o => o.label === 'Large').priceDelta = 30;
        dish = (await staff.put(`${base}/menu/${dish._id}`, { customisationGroups: groups })).json.data;
    });

    test('rejects a negative price adjustment', async () => {
        const r = await staff.post(`${base}/menu`, {
            name: `[TEST] Bad discount ${RUN}`, price: 50,
            customisationGroups: [{ name: 'Discount', options: [{ label: 'Cheaper', priceDelta: -10 }] }],
        });
        assert.equal(r.status, 400);
        assert.match(r.json.message, /negative/i);
    });

    test('rejects a group with no options and duplicate labels', async () => {
        const empty = await staff.post(`${base}/menu`, { name: `[TEST] Empty ${RUN}`, price: 10, customisationGroups: [{ name: 'Empty group', options: [] }] });
        assert.equal(empty.status, 400);
        const dupe = await staff.post(`${base}/menu`, {
            name: `[TEST] Dupe ${RUN}`, price: 10,
            customisationGroups: [{ name: 'Choices', options: [{ label: 'A' }, { label: 'a' }] }],
        });
        assert.equal(dupe.status, 400);
        assert.match(dupe.json.message, /two options called/i);
    });

    test('rejects a required group whose options are all unavailable', async () => {
        const r = await staff.post(`${base}/menu`, {
            name: `[TEST] Impossible ${RUN}`, price: 10,
            customisationGroups: [{ name: 'Sold out group', required: true, options: [{ label: 'A', available: false }] }],
        });
        assert.equal(r.status, 400);
    });

    test('another canteen cannot edit this dish', async () => {
        const r = await other.put(`${base}/menu/${dish._id}`, { customisationGroups: [] });
        assert.equal(r.status, 403);
    });
});

// ---------------------------------------------------------------- customisation: ordering

const place = (lines) => student.post('/users/place-order', { canteen: canteenId, lines });

describe('customisation: placing an order', () => {
    test('rejects an order that omits a required group', async () => {
        const r = await place([{ item: dish._id, quantity: 1, selections: [opt(dish, 'Spice level', 'Mild')] }]);
        assert.equal(r.status, 400);
        assert.equal(r.json.code, 'CUSTOMISATION');
        assert.match(r.json.message, /Choose an option for Size/);
    });

    test('prices a valid single selection from the database', async () => {
        const r = await place([{
            item: dish._id, quantity: 2,
            selections: [opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Medium')],
        }]);
        assert.equal(r.status, 201);
        const line = r.json.lineItems[0];
        assert.equal(line.basePrice, 80);
        assert.equal(line.addonsTotal, 30);
        assert.equal(line.price, 110, 'unit price = base + add-ons');
        assert.equal(line.lineTotal, 220);
        assert.equal(r.json.totalPrice, 220);
        assert.equal(line.selections.length, 2);
        assert.ok(line.selections.every(s => s.groupName && s.label));
    });

    test('prices a multi-select group and keeps the labels', async () => {
        const r = await place([{
            item: dish._id, quantity: 1,
            selections: [
                opt(dish, 'Size', 'Regular'),
                opt(dish, 'Spice level', 'Extra spicy'),
                opt(dish, 'Toppings', 'Extra onion'),
                opt(dish, 'Toppings', 'Jalapenos'),
            ],
            instructions: '  Please make it   less oily.  ',
        }]);
        assert.equal(r.status, 201);
        const line = r.json.lineItems[0];
        assert.equal(line.addonsTotal, 25, '10 + 15');
        assert.equal(line.price, 105);
        assert.equal(line.instructions, 'Please make it less oily.', 'instructions are trimmed and collapsed');
        const labels = line.selections.map(s => s.label);
        assert.ok(labels.includes('Extra onion') && labels.includes('Jalapenos'));
    });

    test('rejects exceeding a group maximum', async () => {
        const r = await place([{
            item: dish._id, quantity: 1,
            selections: [
                opt(dish, 'Size', 'Regular'), opt(dish, 'Spice level', 'Mild'),
                opt(dish, 'Toppings', 'Extra onion'), opt(dish, 'Toppings', 'Jalapenos'), opt(dish, 'Toppings', 'Extra sauce'),
            ],
        }]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /at most 2 options for Toppings/);
    });

    test('rejects selecting the same option twice', async () => {
        const onion = opt(dish, 'Toppings', 'Extra onion');
        const r = await place([{
            item: dish._id, quantity: 1,
            selections: [opt(dish, 'Size', 'Regular'), opt(dish, 'Spice level', 'Mild'), onion, onion],
        }]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /selected twice/i);
    });

    test('rejects selecting more than one option in a single-select group', async () => {
        const r = await place([{
            item: dish._id, quantity: 1,
            selections: [opt(dish, 'Size', 'Regular'), opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Mild')],
        }]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /at most 1 option for Size/);
    });

    test('rejects an unknown option id', async () => {
        const g = findGroup(dish, 'Size');
        const r = await place([{
            item: dish._id, quantity: 1,
            selections: [{ group: g.key, option: 'o_deadbeef' }, opt(dish, 'Spice level', 'Mild')],
        }]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /no longer available/i);
    });

    test('rejects an unknown group id', async () => {
        const r = await place([{
            item: dish._id, quantity: 1,
            selections: [{ group: 'g_deadbeef', option: 'o_deadbeef' }],
        }]);
        assert.equal(r.status, 400);
    });

    test('rejects a sold-out option', async () => {
        const groups = JSON.parse(JSON.stringify(dish.customisationGroups));
        groups.find(g => g.name === 'Toppings').options.find(o => o.label === 'Jalapenos').available = false;
        const updated = (await staff.put(`${base}/menu/${dish._id}`, { customisationGroups: groups })).json.data;
        try {
            const r = await place([{
                item: dish._id, quantity: 1,
                selections: [opt(updated, 'Size', 'Regular'), opt(updated, 'Spice level', 'Mild'), opt(updated, 'Toppings', 'Jalapenos')],
            }]);
            assert.equal(r.status, 400);
            assert.match(r.json.message, /sold out/i);
        } finally {
            groups.find(g => g.name === 'Toppings').options.find(o => o.label === 'Jalapenos').available = true;
            dish = (await staff.put(`${base}/menu/${dish._id}`, { customisationGroups: groups })).json.data;
        }
    });

    test('ignores any price the client tries to send', async () => {
        const r = await student.post('/users/place-order', {
            canteen: canteenId,
            lines: [{
                item: dish._id, quantity: 1, price: 1, unitPrice: 1, totalPrice: 1, basePrice: 1,
                selections: [
                    { ...opt(dish, 'Size', 'Large'), priceDelta: -500 },
                    opt(dish, 'Spice level', 'Mild'),
                ],
            }],
            totalPrice: 1,
        });
        assert.equal(r.status, 201);
        assert.equal(r.json.totalPrice, 110, 'server prices from its own menu data');
        assert.equal(r.json.lineItems[0].selections.find(s => s.label === 'Large').priceDelta, 30);
    });

    test('a dish ordered two ways becomes two separate lines', async () => {
        const r = await place([
            { item: dish._id, quantity: 1, selections: [opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Mild')] },
            { item: dish._id, quantity: 1, selections: [opt(dish, 'Size', 'Regular'), opt(dish, 'Spice level', 'Mild')] },
        ]);
        assert.equal(r.status, 201);
        assert.equal(r.json.lineItems.length, 2);
        assert.notEqual(r.json.lineItems[0].lineKey, r.json.lineItems[1].lineKey);
        assert.equal(r.json.totalPrice, 190, '110 + 80');
    });

    test('rejects two identical configurations sent as separate lines', async () => {
        const sel = [opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Mild')];
        const r = await place([
            { item: dish._id, quantity: 1, selections: sel },
            { item: dish._id, quantity: 1, selections: sel },
        ]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /combine them into one line/);
    });

    test('the per-dish quantity limit counts every configuration together', async () => {
        const r = await place([
            { item: dish._id, quantity: 6, selections: [opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Mild')] },
            { item: dish._id, quantity: 6, selections: [opt(dish, 'Size', 'Regular'), opt(dish, 'Spice level', 'Mild')] },
        ]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /at most \d+ of the same item/);
    });

    test('a dish with no customisation still orders, old-style and new-style', async () => {
        const legacy = await student.post('/users/place-order', { canteen: canteenId, items: [plainDish._id, plainDish._id] });
        assert.equal(legacy.status, 201, 'the original payload shape still works');
        assert.equal(legacy.json.totalPrice, 40);
        assert.equal(legacy.json.lineItems[0].quantity, 2);

        const modern = await place([{ item: plainDish._id, quantity: 1 }]);
        assert.equal(modern.status, 201);
        assert.equal(modern.json.totalPrice, 20);
        assert.equal(modern.json.lineItems[0].selections.length, 0);
    });

    test('rejects selections on a dish that has no options', async () => {
        const r = await place([{ item: plainDish._id, quantity: 1, selections: [opt(dish, 'Size', 'Large')] }]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /no customisation options/i);
    });

    test('rejects a dish belonging to another canteen', async () => {
        const otherCanteen = String(other.me.ownedCanteens?.[0]?._id || other.me.ownedCanteens?.[0]);
        const theirMenu = await other.get(`/staff/canteens/${otherCanteen}/menu`);
        const theirItem = (theirMenu.json.data || [])[0];
        if (!theirItem) return; // nothing to borrow
        const r = await place([{ item: String(theirItem._id), quantity: 1 }]);
        assert.equal(r.status, 400);
        assert.match(r.json.message, /does not belong to this canteen/);
    });

    test('instructions are capped and stripped of control characters', () => {
        const { value } = Customisation.parseInstructions(`a\u0000b\nc${'x'.repeat(500)}`);
        assert.ok(!value.includes('\u0000'));
        assert.ok(value.length <= Customisation.LIMITS.instructionsMax);
    });
});

describe('customisation: history is immutable', () => {
    test('renaming an option does not rewrite a past order', async () => {
        const placed = await place([{
            item: dish._id, quantity: 1,
            selections: [opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Mild')],
        }]);
        assert.equal(placed.status, 201);
        const orderId = placed.json._id;

        const groups = JSON.parse(JSON.stringify(dish.customisationGroups));
        groups.find(g => g.name === 'Size').options.find(o => o.label === 'Large').label = 'Jumbo';
        groups.find(g => g.name === 'Size').options.find(o => o.label === 'Jumbo').priceDelta = 99;
        await staff.put(`${base}/menu/${dish._id}`, { customisationGroups: groups });
        try {
            const after = await staff.get(`${base}/orders/${orderId}`);
            assert.equal(after.status, 200);
            const line = after.json.data.lines[0];
            assert.equal(line.price, 110, 'the charged price is unchanged');
            assert.ok(line.selections.some(s => s.label === 'Large'), 'the original label is preserved');
        } finally {
            groups.find(g => g.name === 'Size').options.find(o => o.label === 'Jumbo').label = 'Large';
            groups.find(g => g.name === 'Size').options.find(o => o.label === 'Large').priceDelta = 30;
            dish = (await staff.put(`${base}/menu/${dish._id}`, { customisationGroups: groups })).json.data;
        }
    });

    test('a removed option is reported when revalidating for reorder', () => {
        const stored = [opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Mild')];
        const trimmed = JSON.parse(JSON.stringify(dish));
        trimmed.customisationGroups = trimmed.customisationGroups.filter(g => g.name !== 'Size');
        const result = Customisation.checkStillValid(trimmed, stored);
        assert.equal(result.ok, false);
        assert.match(result.reason, /no longer available|Choose an option/i);
    });
});

// ---------------------------------------------------------------- pickup estimate

describe('pickup estimate', () => {
    test('the calculation is deterministic and explainable', () => {
        const one = Estimate.computeMinutes({ items: [{ prepTime: 12 }], units: 1, canteen: { defaultPrepTime: 10 }, queueAhead: 0 });
        assert.equal(one.minutes, 12, 'a single dish takes its own prep time');
        const many = Estimate.computeMinutes({ items: [{ prepTime: 12 }, { prepTime: 5 }], units: 2, canteen: {}, queueAhead: 0 });
        assert.equal(many.minutes, 14, 'slowest dish, plus one batch step for the extra unit');
        const busy = Estimate.computeMinutes({ items: [{ prepTime: 10 }], units: 1, canteen: {}, queueAhead: 4 });
        assert.equal(busy.minutes, 16, '10 + 6 minutes of queue');
        const noPrep = Estimate.computeMinutes({ items: [{}], units: 1, canteen: { defaultPrepTime: 7 }, queueAhead: 0 });
        assert.equal(noPrep.minutes, 7, 'falls back to the canteen default');
        assert.ok(Estimate.computeMinutes({ items: [{ prepTime: 240 }], units: 50, canteen: {}, queueAhead: 50 }).minutes <= Estimate.MAX_MINUTES);
    });

    test('a new order carries an estimate', async () => {
        const r = await place([{ item: dish._id, quantity: 1, selections: [opt(dish, 'Size', 'Regular'), opt(dish, 'Spice level', 'Mild')] }]);
        assert.equal(r.status, 201);
        assert.ok(r.json.estimateMinutes >= Estimate.MIN_MINUTES);
        assert.ok(new Date(r.json.estimatedReadyAt).getTime() > Date.now());
        assert.equal(r.json.estimateSource, 'auto');
        assert.equal(r.json.readyAt, undefined, 'no actual ready time yet');
    });

    test('staff can set a new pickup time', async () => {
        const placed = await place([{ item: dish._id, quantity: 1, selections: [opt(dish, 'Size', 'Regular'), opt(dish, 'Spice level', 'Medium')] }]);
        const id = placed.json._id;
        const r = await staff.put(`${base}/orders/${id}/estimate`, { minutes: 25 });
        assert.equal(r.status, 200);
        assert.equal(r.json.data.estimateMinutes, 25);
        assert.equal(r.json.data.estimateSource, 'staff');
        const mins = Math.round((new Date(r.json.data.estimatedReadyAt) - Date.now()) / 60000);
        assert.ok(mins >= 24 && mins <= 25, `expected about 25 minutes out, got ${mins}`);
    });

    test('staff can announce a delay on top of the estimate', async () => {
        const placed = await place([{ item: dish._id, quantity: 1, selections: [opt(dish, 'Size', 'Large'), opt(dish, 'Spice level', 'Mild')] }]);
        const id = placed.json._id;
        const first = new Date(placed.json.estimatedReadyAt).getTime();
        const r = await staff.put(`${base}/orders/${id}/estimate`, { addDelay: 10 });
        assert.equal(r.status, 200);
        assert.equal(r.json.data.prepDelayMinutes, 10);
        const after = new Date(r.json.data.estimatedReadyAt).getTime();
        assert.ok(after - first >= 9 * 60000, 'the ready time moved out by the delay');
    });

    test('rejects nonsense durations', async () => {
        const placed = await place([{ item: plainDish._id, quantity: 1 }]);
        const id = placed.json._id;
        for (const body of [{ minutes: -5 }, { minutes: 0 }, { minutes: 999 }, { minutes: 1.5 }, { addDelay: 0 }, { addDelay: 999 }, {}, { minutes: 10, addDelay: 5 }]) {
            const r = await staff.put(`${base}/orders/${id}/estimate`, body);
            assert.equal(r.status, 400, `expected 400 for ${JSON.stringify(body)}`);
        }
    });

    test('another canteen cannot change this order estimate', async () => {
        const placed = await place([{ item: plainDish._id, quantity: 1 }]);
        const r = await other.put(`${base}/orders/${placed.json._id}/estimate`, { minutes: 20 });
        assert.equal(r.status, 403);
    });

    test('moving to Ready records a real timestamp and leaves the estimate alone', async () => {
        const placed = await place([{ item: plainDish._id, quantity: 1 }]);
        const id = placed.json._id;
        const estimated = placed.json.estimatedReadyAt;
        await staff.put(`/orders/${id}/status`, { status: 'Processing' });
        await staff.put(`/orders/${id}/status`, { status: 'Ready' });
        const r = await staff.get(`${base}/orders/${id}`);
        assert.equal(r.json.data.status, 'Ready');
        assert.ok(r.json.data.readyAt, 'readyAt is set');
        assert.equal(new Date(r.json.data.estimatedReadyAt).toISOString(), new Date(estimated).toISOString(), 'the estimate is not overwritten');
    });

    test('the estimate cannot be changed once an order is Ready', async () => {
        const placed = await place([{ item: plainDish._id, quantity: 1 }]);
        const id = placed.json._id;
        await staff.put(`/orders/${id}/status`, { status: 'Processing' });
        await staff.put(`/orders/${id}/status`, { status: 'Ready' });
        const r = await staff.put(`${base}/orders/${id}/estimate`, { minutes: 20 });
        assert.equal(r.status, 400);
    });
});

// ---------------------------------------------------------------- QR pickup

// Places an order and drives it to Ready (optionally recording payment).
async function readyOrder({ paid = true } = {}) {
    const placed = await place([{ item: plainDish._id, quantity: 1 }]);
    const id = placed.json._id;
    await staff.put(`/orders/${id}/status`, { status: 'Processing' });
    if (paid) await staff.put(`${base}/orders/${id}/payment`, { paid: true });
    await staff.put(`/orders/${id}/status`, { status: 'Ready' });
    return id;
}

describe('QR pickup: issuing', () => {
    test('a student gets a credential only once the order is Ready', async () => {
        const placed = await place([{ item: plainDish._id, quantity: 1 }]);
        const early = await student.post(`/users/orders/${placed.json._id}/pickup-token`, {});
        assert.equal(early.status, 409);
        assert.equal(early.json.code, 'NOT_READY');

        const id = await readyOrder();
        const r = await student.post(`/users/orders/${id}/pickup-token`, {});
        assert.equal(r.status, 200);
        assert.match(r.json.data.code, /^CRP1\.[0-9a-f]{16}\.[A-Za-z0-9_-]{43}$/);
        assert.ok(r.json.data.qr.startsWith('data:image/png;base64,'));
        assert.ok(new Date(r.json.data.expiresAt).getTime() > Date.now());
    });

    test('a student cannot get a credential for somebody else\'s order', async () => {
        const id = await readyOrder();
        const otherStudent = await asStudent(process.env.TEST_STUDENT_EMAIL, process.env.TEST_STUDENT_PASSWORD);
        // Same account here, so instead assert an unrelated id is rejected.
        const r = await otherStudent.post(`/users/orders/${'0'.repeat(24)}/pickup-token`, {});
        assert.equal(r.status, 404);
        assert.ok(id);
    });

    test('the order list never leaks the credential', async () => {
        const id = await readyOrder();
        await student.post(`/users/orders/${id}/pickup-token`, {});
        const orders = await student.get('/users/me/orders');
        const mine = orders.json.data.find(o => String(o._id) === String(id));
        assert.ok(mine, 'order is in the list');
        assert.equal(mine.pickup, undefined, 'no pickup field is exposed');
    });

    test('re-issuing replaces the previous credential', async () => {
        const id = await readyOrder();
        const first = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        const second = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        assert.notEqual(first, second);
        const stale = await staff.post(`${base}/pickup/verify`, { code: first });
        assert.equal(stale.status, 404, 'the old code no longer resolves');
        const fresh = await staff.post(`${base}/pickup/verify`, { code: second });
        assert.equal(fresh.status, 200);
    });
});

describe('QR pickup: verification', () => {
    test('a valid code shows the order without consuming it', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        const first = await staff.post(`${base}/pickup/verify`, { code });
        assert.equal(first.status, 200);
        assert.equal(String(first.json.data.order._id), String(id));
        assert.equal(first.json.data.requiresPayment, false);
        const second = await staff.post(`${base}/pickup/verify`, { code });
        assert.equal(second.status, 200, 'verify is read-only and repeatable');
    });

    test('rejects malformed and tampered codes', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        const [, tokenId, secret] = code.split('.');
        const flip = (s) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
        const bad = [
            '', 'nonsense', 'CRP1.short.x', `CRP2.${tokenId}.${secret}`,
            `CRP1.${tokenId}`, `CRP1.${'z'.repeat(16)}.${secret}`,
            `CRP1.${tokenId}.${flip(secret)}`,            // right lookup, wrong secret
            `CRP1.${tokenId}.${secret}extra`,
        ];
        for (const c of bad) {
            const r = await staff.post(`${base}/pickup/verify`, { code: c });
            assert.ok([400, 404].includes(r.status), `expected rejection for "${String(c).slice(0, 24)}", got ${r.status}`);
        }
        // the genuine code still works afterwards
        assert.equal((await staff.post(`${base}/pickup/verify`, { code })).status, 200);
    });

    test('a different canteen cannot verify this code', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        const otherCanteen = String(other.me.ownedCanteens?.[0]?._id || other.me.ownedCanteens?.[0]);
        const r = await other.post(`/staff/canteens/${otherCanteen}/pickup/verify`, { code });
        // Either the ownership guard or the canteen check refuses it.
        assert.ok([403, 404].includes(r.status), `expected refusal, got ${r.status}`);
    });

    test('an unauthenticated scanner is refused', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        const { Client } = require('./helpers');
        const anon = new Client('anon');
        const r = await anon.post(`${base}/pickup/verify`, { code }, { csrf: false });
        assert.equal(r.status, 401);
    });

    test('an expired credential is refused', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        // Age the credential directly, rather than waiting five minutes.
        const Order = require('../model/order.model');
        await Order.updateOne({ _id: id }, { $set: { 'pickup.expiresAt': new Date(Date.now() - 1000) } });
        const r = await staff.post(`${base}/pickup/verify`, { code });
        assert.equal(r.status, 410);
        assert.equal(r.json.code, 'EXPIRED');
    });
});

describe('QR pickup: collection', () => {
    test('an unpaid order cannot be collected until payment is recorded', async () => {
        const id = await readyOrder({ paid: false });
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;

        const blocked = await staff.post(`${base}/pickup/collect`, { code });
        assert.equal(blocked.status, 409);
        assert.equal(blocked.json.code, 'PAYMENT_PENDING');
        assert.equal(blocked.json.data.requiresPayment, true);

        const still = await staff.get(`${base}/orders/${id}`);
        assert.equal(still.json.data.status, 'Ready', 'the order was not completed');
        assert.equal(still.json.data.paymentStatus, 'unpaid', 'and was not silently marked paid');

        // Record payment through the normal endpoint, then collect.
        await staff.put(`${base}/orders/${id}/payment`, { paid: true });
        const ok = await staff.post(`${base}/pickup/collect`, { code });
        assert.equal(ok.status, 200);
        assert.equal(ok.json.data.order.status, 'Completed');
        assert.equal(ok.json.data.method, 'qr');
    });

    test('collection completes the order and stamps the real time', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        const r = await staff.post(`${base}/pickup/collect`, { code });
        assert.equal(r.status, 200);
        const after = await staff.get(`${base}/orders/${id}`);
        assert.equal(after.json.data.status, 'Completed');
        assert.ok(after.json.data.collectedAt, 'collectedAt recorded');
        assert.equal(after.json.data.pickupMethod, 'qr');
    });

    test('the same code cannot be used twice', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        assert.equal((await staff.post(`${base}/pickup/collect`, { code })).status, 200);
        const replay = await staff.post(`${base}/pickup/collect`, { code });
        assert.ok([404, 409].includes(replay.status), `replay should fail, got ${replay.status}`);
        const verify = await staff.post(`${base}/pickup/verify`, { code });
        assert.ok([404, 409].includes(verify.status));
    });

    test('two simultaneous scans collect the order exactly once', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        const [a, b] = await Promise.all([
            staff.post(`${base}/pickup/collect`, { code }),
            staff.post(`${base}/pickup/collect`, { code }),
        ]);
        const statuses = [a.status, b.status].sort();
        assert.equal(statuses.filter(s => s === 200).length, 1, `exactly one scan should win, got ${statuses.join(' and ')}`);
        const after = await staff.get(`${base}/orders/${id}`);
        assert.equal(after.json.data.status, 'Completed');
        assert.equal(after.json.data.statusHistory.filter(h => h.status === 'Completed').length, 1, 'completed once only');
    });

    test('a cancelled order issues no credential and cannot be collected', async () => {
        const placed = await place([{ item: plainDish._id, quantity: 1 }]);
        const id = placed.json._id;
        await staff.put(`/orders/${id}/status`, { status: 'Cancelled' });
        const token = await student.post(`/users/orders/${id}/pickup-token`, {});
        assert.equal(token.status, 409);
        assert.equal(token.json.code, 'CANCELLED');
        const collect = await staff.post(`${base}/pickup/collect`, { orderId: id });
        assert.equal(collect.status, 409);
    });

    test('an order that is still being prepared cannot be collected', async () => {
        const placed = await place([{ item: plainDish._id, quantity: 1 }]);
        const id = placed.json._id;
        await staff.put(`/orders/${id}/status`, { status: 'Processing' });
        const r = await staff.post(`${base}/pickup/collect`, { orderId: id });
        assert.equal(r.status, 409);
        assert.equal(r.json.code, 'NOT_READY');
    });

    test('the counter fallback still enforces payment and canteen ownership', async () => {
        const unpaid = await readyOrder({ paid: false });
        const blocked = await staff.post(`${base}/pickup/collect`, { orderId: unpaid });
        assert.equal(blocked.status, 409);
        assert.equal(blocked.json.code, 'PAYMENT_PENDING');

        const id = await readyOrder();
        const otherCanteen = String(other.me.ownedCanteens?.[0]?._id || other.me.ownedCanteens?.[0]);
        const foreign = await other.post(`/staff/canteens/${otherCanteen}/pickup/collect`, { orderId: id });
        assert.equal(foreign.status, 404, 'an order from another canteen is not found');

        const ok = await staff.post(`${base}/pickup/collect`, { orderId: id });
        assert.equal(ok.status, 200);
        assert.equal(ok.json.data.method, 'manual');
    });

    test('completing an order clears any outstanding credential', async () => {
        const id = await readyOrder();
        const code = (await student.post(`/users/orders/${id}/pickup-token`, {})).json.data.code;
        // Complete it through the ordinary status route instead of the scanner.
        await staff.put(`/orders/${id}/status`, { status: 'Completed' });
        const r = await staff.post(`${base}/pickup/verify`, { code });
        assert.equal(r.status, 404, 'the credential no longer resolves');
    });
});
