// Food customisation: canteen-defined option groups on a menu item, and the student's selections.
//
// Two separate jobs live here, and they must not be confused:
//   1. parseGroups()      — validates what CANTEEN STAFF send when editing a dish.
//   2. priceSelections()  — validates what a STUDENT sends at checkout and prices it from the
//                           stored menu item. The student never sends a price; every amount is
//                           looked up here. This is the trust boundary for customisation money.
//
// Money is handled in integer paise internally so repeated additions can't drift (0.1 + 0.2).
const crypto = require('crypto');

const LIMITS = {
    groups: 10,          // groups per dish
    options: 20,         // options per group
    nameMax: 40,
    descMax: 120,
    labelMax: 40,
    priceDeltaMax: 10000,
    instructionsMax: 200,
};

const KEY = /^[a-z]_[0-9a-f]{8}$/;
const newKey = (prefix) => `${prefix}_${crypto.randomBytes(4).toString('hex')}`;

const toPaise = (rupees) => Math.round(rupees * 100);
const toRupees = (paise) => Math.round(paise) / 100;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// A price adjustment must be a non-negative amount with at most 2 decimals. Discounts are not
// supported: a negative add-on would let a student lower the price of a dish by choosing options.
const parsePriceDelta = (raw) => {
    const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if (raw === undefined || raw === null || raw === '') return { value: 0 };
    if (typeof n !== 'number' || !Number.isFinite(n)) return { error: 'Extra charge must be a number' };
    if (n < 0) return { error: 'Extra charge cannot be negative' };
    if (n > LIMITS.priceDeltaMax) return { error: `Extra charge cannot be more than ${LIMITS.priceDeltaMax}` };
    if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return { error: 'Extra charge can have at most 2 decimal places' };
    return { value: n };
};

// ---------------------------------------------------------------- 1. staff: define the groups

// Validates the customisationGroups array sent by canteen staff. Existing keys are preserved so
// that editing a dish doesn't orphan the selections already sitting in students' carts.
function parseGroups(raw) {
    if (raw === undefined) return { data: undefined };
    if (raw === null || (Array.isArray(raw) && raw.length === 0)) return { data: [] };
    if (!Array.isArray(raw)) return { error: 'Customisation groups must be a list' };
    if (raw.length > LIMITS.groups) return { error: `A dish can have at most ${LIMITS.groups} customisation groups` };

    const groups = [];
    const seenGroupKeys = new Set();
    const seenGroupNames = new Set();

    for (const [i, g] of raw.entries()) {
        if (!g || typeof g !== 'object') return { error: `Group ${i + 1} is not valid` };
        const name = str(g.name, LIMITS.nameMax + 1);
        if (name.length < 2) return { error: `Group ${i + 1}: name must be at least 2 characters` };
        if (name.length > LIMITS.nameMax) return { error: `Group "${name.slice(0, 20)}": name must be ${LIMITS.nameMax} characters or fewer` };
        const lowerName = name.toLowerCase();
        if (seenGroupNames.has(lowerName)) return { error: `Two groups are both called "${name}"` };
        seenGroupNames.add(lowerName);

        const key = typeof g.key === 'string' && KEY.test(g.key) ? g.key : newKey('g');
        if (seenGroupKeys.has(key)) return { error: 'Duplicate group identifier' };
        seenGroupKeys.add(key);

        const description = str(g.description, LIMITS.descMax + 1);
        if (description.length > LIMITS.descMax) return { error: `Group "${name}": description must be ${LIMITS.descMax} characters or fewer` };

        const multiple = g.multiple === true;
        const required = g.required === true;
        const active = g.active !== false;

        if (!Array.isArray(g.options) || g.options.length === 0) return { error: `Group "${name}" needs at least one option` };
        if (g.options.length > LIMITS.options) return { error: `Group "${name}" can have at most ${LIMITS.options} options` };

        const options = [];
        const seenOptionKeys = new Set();
        const seenLabels = new Set();
        for (const [j, o] of g.options.entries()) {
            if (!o || typeof o !== 'object') return { error: `Group "${name}": option ${j + 1} is not valid` };
            const label = str(o.label, LIMITS.labelMax + 1);
            if (label.length < 1) return { error: `Group "${name}": option ${j + 1} needs a label` };
            if (label.length > LIMITS.labelMax) return { error: `Group "${name}": option labels must be ${LIMITS.labelMax} characters or fewer` };
            const lowerLabel = label.toLowerCase();
            if (seenLabels.has(lowerLabel)) return { error: `Group "${name}" has two options called "${label}"` };
            seenLabels.add(lowerLabel);

            const oKey = typeof o.key === 'string' && KEY.test(o.key) ? o.key : newKey('o');
            if (seenOptionKeys.has(oKey)) return { error: `Group "${name}": duplicate option identifier` };
            seenOptionKeys.add(oKey);

            const { value: priceDelta, error } = parsePriceDelta(o.priceDelta);
            if (error) return { error: `Group "${name}", option "${label}": ${error}` };

            options.push({ key: oKey, label, priceDelta, available: o.available !== false, order: j });
        }

        // Selection limits. A single-select group is exactly "choose one" (or "up to one" when optional).
        const activeCount = options.filter(o => o.available).length;
        let min = Number.isInteger(g.min) ? g.min : (required ? 1 : 0);
        let max = Number.isInteger(g.max) ? g.max : (multiple ? options.length : 1);
        if (!multiple) { min = required ? 1 : 0; max = 1; }
        if (min < 0) return { error: `Group "${name}": minimum selections cannot be negative` };
        if (max < 1) return { error: `Group "${name}": maximum selections must be at least 1` };
        if (min > max) return { error: `Group "${name}": minimum selections cannot be more than the maximum` };
        if (max > options.length) return { error: `Group "${name}": maximum selections cannot be more than the number of options` };
        if (required && min < 1) min = 1;
        if (required && active && activeCount < min) {
            return { error: `Group "${name}" is required but only ${activeCount} option${activeCount === 1 ? ' is' : 's are'} available` };
        }

        groups.push({ key, name, description, required, multiple, min, max, order: i, active, options });
    }
    return { data: groups };
}

// ---------------------------------------------------------------- 2. student: price the selections

const activeGroups = (item) => (item.customisationGroups || []).filter(g => g.active !== false);

// True when a student must make at least one choice before this dish can be ordered.
const hasRequiredChoices = (item) => activeGroups(item).some(g => g.required && g.min > 0);

function parseInstructions(raw) {
    if (raw === undefined || raw === null) return { value: '' };
    if (typeof raw !== 'string') return { error: 'Special instructions must be text' };
    // Stored and displayed as plain text only — never interpreted, and it can never change the price.
    const value = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, LIMITS.instructionsMax);
    return { value };
}

// Validates a student's selections for ONE line against the stored menu item and returns the
// priced, immutable snapshot that will be written onto the order.
//
// selections: [{ group: <groupKey>, option: <optionKey> }]  (one entry per chosen option)
// Returns { error } or { snapshot: { selections, addonsPaise, unitPricePaise, instructions } }
function priceSelections(item, rawSelections, rawInstructions) {
    const groups = activeGroups(item);
    const basePaise = toPaise(item.price);

    const { value: instructions, error: insErr } = parseInstructions(rawInstructions);
    if (insErr) return { error: insErr };

    if (rawSelections !== undefined && rawSelections !== null && !Array.isArray(rawSelections)) {
        return { error: 'Customisation selections must be a list' };
    }
    const incoming = Array.isArray(rawSelections) ? rawSelections : [];
    if (incoming.length > LIMITS.groups * LIMITS.options) return { error: 'Too many customisation selections' };

    // A dish with no active groups must not carry selections.
    if (!groups.length && incoming.length) return { error: `"${item.name}" has no customisation options` };

    // Bucket the incoming choices by group, rejecting unknown ids and duplicates as we go.
    const chosen = new Map(); // groupKey -> [optionKey]
    for (const sel of incoming) {
        if (!sel || typeof sel !== 'object') return { error: 'Invalid customisation selection' };
        const groupKey = typeof sel.group === 'string' ? sel.group : '';
        const optionKey = typeof sel.option === 'string' ? sel.option : '';
        const group = groups.find(g => g.key === groupKey);
        if (!group) return { error: `"${item.name}": that customisation is no longer available` };
        const option = (group.options || []).find(o => o.key === optionKey);
        if (!option) return { error: `"${item.name}": one of your choices for ${group.name} is no longer available` };
        if (option.available === false) return { error: `"${option.label}" (${group.name}) is sold out` };
        const list = chosen.get(groupKey) || [];
        // Selecting the same option twice must never double its price.
        if (list.includes(optionKey)) return { error: `"${option.label}" was selected twice in ${group.name}` };
        list.push(optionKey);
        chosen.set(groupKey, list);
    }

    // Enforce each group's own rules, in the canteen's display order.
    const snapshot = [];
    let addonsPaise = 0;
    for (const group of groups) {
        const picked = chosen.get(group.key) || [];
        const max = group.multiple ? group.max : 1;
        if (picked.length > max) {
            return { error: `Choose at most ${max} option${max === 1 ? '' : 's'} for ${group.name}` };
        }
        if (picked.length < group.min) {
            return group.min === 1
                ? { error: `Choose an option for ${group.name}` }
                : { error: `Choose at least ${group.min} options for ${group.name}` };
        }
        for (const optionKey of picked) {
            const option = group.options.find(o => o.key === optionKey);
            addonsPaise += toPaise(option.priceDelta);
            snapshot.push({
                group: group.key,
                groupName: group.name,
                option: option.key,
                label: option.label,
                priceDelta: option.priceDelta,
            });
        }
    }

    return {
        snapshot: {
            selections: snapshot,
            addonsPaise,
            unitPricePaise: basePaise + addonsPaise,
            instructions,
        },
    };
}

// Cart-line identity. Two lines of the same dish merge only when the dish, the exact set of
// chosen options and the special instructions all match. Options are sorted so selection order
// can't produce two lines that look identical to a student.
function lineKeyFor(itemId, selections = [], instructions = '') {
    const options = selections
        .map(s => `${s.group}:${s.option}`)
        .sort()
        .join(',');
    const basis = `${String(itemId)}|${options}|${(instructions || '').trim()}`;
    return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 16);
}

// Re-checks a saved selection set against the live menu item without pricing it. Used for
// revalidating carts and reorders so a student is told exactly what changed.
function checkStillValid(item, selections = []) {
    if (!item) return { ok: false, reason: 'This dish is no longer on the menu' };
    if (item.available === false) return { ok: false, reason: `${item.name} is sold out` };
    const result = priceSelections(item, selections.map(s => ({ group: s.group, option: s.option })), '');
    if (result.error) return { ok: false, reason: result.error };
    return { ok: true };
}

module.exports = {
    LIMITS,
    parseGroups,
    parseInstructions,
    priceSelections,
    lineKeyFor,
    checkStillValid,
    hasRequiredChoices,
    activeGroups,
    toPaise,
    toRupees,
};
