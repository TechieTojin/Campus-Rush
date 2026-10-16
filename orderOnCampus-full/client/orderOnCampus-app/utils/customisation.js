// Client-side mirror of the server's customisation rules (server/lib/customisation.js).
//
// This exists for the interface only — to disable "Add to cart" until the required choices are
// made, to show a running total, and to give each cart line a stable identity. The server
// re-validates and re-prices everything from its own menu data when the order is placed, so
// nothing here is trusted with money.

export const INSTRUCTIONS_MAX = 200;

// Groups the canteen has switched on. Inactive groups are ignored everywhere.
export const activeGroups = (item) => (item?.customisationGroups || []).filter(g => g.active !== false);

export const hasCustomisation = (item) => activeGroups(item).length > 0;

// True when the student must choose something before this dish can be added, which is why a
// quick "+" on a card has to open the detail screen instead of adding straight away.
export const hasRequiredChoices = (item) => activeGroups(item).some(g => g.required && (g.min ?? 1) > 0);

export const maxFor = (group) => (group.multiple ? (group.max ?? group.options.length) : 1);
export const minFor = (group) => (group.required ? Math.max(1, group.min ?? 1) : (group.min ?? 0));

// selections: [{ group, groupName, option, label, priceDelta }]
export const isChosen = (selections, groupKey, optionKey) =>
  selections.some(s => s.group === groupKey && s.option === optionKey);

export const chosenIn = (selections, groupKey) => selections.filter(s => s.group === groupKey);

// Applies a tap on an option, honouring single- vs multi-select and the group's maximum.
// Returns the new selections array, or the old one when the tap isn't allowed.
export function toggleOption(selections, group, option) {
  const already = isChosen(selections, group.key, option.key);
  const others = selections.filter(s => s.group !== group.key);
  const mine = chosenIn(selections, group.key);

  if (!group.multiple) {
    // Single-select: tapping the chosen option again clears it only when the group is optional.
    if (already) return group.required ? selections : others;
    return [...others, entryFor(group, option)];
  }
  if (already) return selections.filter(s => !(s.group === group.key && s.option === option.key));
  if (mine.length >= maxFor(group)) return selections; // at the limit — caller shows a hint
  return [...selections, entryFor(group, option)];
}

const entryFor = (group, option) => ({
  group: group.key,
  groupName: group.name,
  option: option.key,
  label: option.label,
  priceDelta: option.priceDelta || 0,
});

// The first unmet requirement, or null when the selection is complete.
export function firstProblem(item, selections) {
  for (const group of activeGroups(item)) {
    const picked = chosenIn(selections, group.key);
    const min = minFor(group);
    if (picked.length < min) {
      return min === 1 ? `Choose an option for ${group.name}` : `Choose at least ${min} options for ${group.name}`;
    }
    if (picked.length > maxFor(group)) {
      return `Choose at most ${maxFor(group)} for ${group.name}`;
    }
  }
  return null;
}

export const addonsTotal = (selections) => selections.reduce((sum, s) => sum + (s.priceDelta || 0), 0);
export const unitPriceOf = (item, selections) => (item?.price || 0) + addonsTotal(selections);

// A new line starts with nothing chosen.
//
// Pre-selecting the first option would be friendlier for a free choice like spice level, but the
// same groups routinely change the price — picking "Regular" on the student's behalf and letting
// them pay without noticing the size question is worse than asking. So required groups stay
// empty, the Add button stays disabled, and the footer says exactly what is missing.
export const defaultSelections = () => [];

// Stable identity for a configured cart line. The server computes its own (hashed) key the same
// way; this one only has to be consistent within the app, so it stays a readable string.
export function lineKeyFor(itemId, selections = [], instructions = '') {
  const options = selections.map(s => `${s.group}:${s.option}`).sort().join(',');
  return `${String(itemId)}|${options}|${(instructions || '').trim()}`;
}

// "Large · Extra onion, Jalapenos" — a one-line summary for cart rows and order history.
export const summarise = (selections = []) => selections.map(s => s.label).join(' · ');

// Re-checks a saved line against the live menu item. Returns null when it is still fine, or a
// sentence explaining what the student needs to change.
export function revalidate(item, selections = []) {
  if (!item) return 'This dish is no longer on the menu';
  if (item.available === false) return `${item.name} is sold out`;
  const groups = activeGroups(item);
  for (const sel of selections) {
    const group = groups.find(g => g.key === sel.group);
    if (!group) return `"${sel.label}" is no longer offered`;
    const option = (group.options || []).find(o => o.key === sel.option);
    if (!option) return `"${sel.label}" is no longer offered`;
    if (option.available === false) return `"${option.label}" is sold out`;
  }
  return firstProblem(item, selections);
}

// Refreshes labels and prices on a saved line from the live menu, so a cart shows what the
// canteen charges now rather than what it charged when the line was added.
export function syncSelections(item, selections = []) {
  const groups = activeGroups(item);
  return selections.map((sel) => {
    const group = groups.find(g => g.key === sel.group);
    const option = group && (group.options || []).find(o => o.key === sel.option);
    if (!group || !option) return sel;
    return { group: group.key, groupName: group.name, option: option.key, label: option.label, priceDelta: option.priceDelta || 0 };
  });
}
