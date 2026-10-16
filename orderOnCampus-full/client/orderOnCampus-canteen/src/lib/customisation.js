// Shape, validation and conversion for a dish's customisation groups.
//
// These mirror server/lib/customisation.js, which re-validates everything on save and is the
// authority. Keeping them here (rather than in the editor component) also keeps the component
// file exporting components only, which is what the lint rules expect.
export const LIMITS = { groups: 10, options: 20, name: 40, label: 40, description: 120, price: 10000 };

const randomKey = (prefix) => {
  const bytes = new Uint8Array(4);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
};

export const emptyOption = () => ({ key: randomKey('o'), label: '', priceDelta: '', available: true });

export const emptyGroup = () => ({
  key: randomKey('g'),
  name: '',
  description: '',
  required: false,
  multiple: false,
  min: 0,
  max: 1,
  active: true,
  options: [emptyOption(), emptyOption()],
});

// Mirrors the server's checks so staff see problems before they hit Save.
export function validateGroups(groups) {
  const errors = {};
  const names = new Set();
  groups.forEach((g, gi) => {
    const name = (g.name || '').trim();
    if (name.length < 2) errors[`g${gi}`] = 'Give this group a name (at least 2 characters)';
    else if (name.length > LIMITS.name) errors[`g${gi}`] = `Keep the name under ${LIMITS.name} characters`;
    else if (names.has(name.toLowerCase())) errors[`g${gi}`] = 'Another group already has this name';
    names.add(name.toLowerCase());

    if (!g.options.length) errors[`g${gi}`] = 'Add at least one option';
    const labels = new Set();
    g.options.forEach((o, oi) => {
      const label = (o.label || '').trim();
      if (!label) errors[`g${gi}o${oi}`] = 'Add a label';
      else if (label.length > LIMITS.label) errors[`g${gi}o${oi}`] = `Under ${LIMITS.label} characters`;
      else if (labels.has(label.toLowerCase())) errors[`g${gi}o${oi}`] = 'Duplicate option';
      labels.add(label.toLowerCase());
      if (o.priceDelta !== '' && o.priceDelta !== null && o.priceDelta !== undefined) {
        const n = Number(o.priceDelta);
        if (!Number.isFinite(n)) errors[`g${gi}o${oi}`] = 'Enter a number';
        else if (n < 0) errors[`g${gi}o${oi}`] = 'Extra charges cannot be negative';
        else if (n > LIMITS.price) errors[`g${gi}o${oi}`] = 'That is too high';
        else if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) errors[`g${gi}o${oi}`] = 'At most 2 decimal places';
      }
    });
    // A required group nobody can satisfy would block every order of this dish.
    if (g.required && g.active !== false && !g.options.some((o) => o.available !== false)) {
      errors[`g${gi}`] = 'A required group needs at least one available option';
    }
    if (g.multiple && Number(g.max) < Number(g.min || 0)) errors[`g${gi}`] = 'Maximum cannot be less than the minimum';
  });
  return errors;
}

// Converts the form state into exactly what the API expects.
export const groupsToBody = (groups) => groups.map((g, i) => ({
  key: g.key,
  name: (g.name || '').trim(),
  description: (g.description || '').trim(),
  required: !!g.required,
  multiple: !!g.multiple,
  min: g.multiple ? Number(g.min || 0) : (g.required ? 1 : 0),
  max: g.multiple ? Number(g.max || 1) : 1,
  order: i,
  active: g.active !== false,
  options: g.options.map((o, j) => ({
    key: o.key,
    label: (o.label || '').trim(),
    priceDelta: o.priceDelta === '' || o.priceDelta === null || o.priceDelta === undefined ? 0 : Number(o.priceDelta),
    available: o.available !== false,
    order: j,
  })),
}));

// And back again, for editing a saved dish.
export const groupsFromItem = (item) => (item?.customisationGroups || []).map((g) => ({
  ...g,
  description: g.description || '',
  min: g.min ?? 0,
  max: g.max ?? 1,
  options: (g.options || []).map((o) => ({ ...o, priceDelta: o.priceDelta ? String(o.priceDelta) : '' })),
}));

// Price range a student could end up paying, used for the editor preview.
export function priceRange(groups, basePrice) {
  const live = groups.filter((g) => g.active !== false && (g.name || '').trim());
  const cheapest = live.reduce((sum, g) => {
    if (!g.required) return sum;
    const available = g.options.filter((o) => o.available !== false);
    if (!available.length) return sum;
    return sum + Math.min(...available.map((o) => Number(o.priceDelta) || 0));
  }, 0);
  const dearest = live.reduce((sum, g) => {
    const available = g.options.filter((o) => o.available !== false).map((o) => Number(o.priceDelta) || 0);
    if (!available.length) return sum;
    const picks = g.multiple ? [...available].sort((a, b) => b - a).slice(0, Number(g.max) || 1) : [Math.max(...available)];
    return sum + picks.reduce((a, b) => a + b, 0);
  }, 0);
  return { from: basePrice + cheapest, to: basePrice + dearest, varies: dearest > cheapest };
}
