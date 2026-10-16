import { createSlice } from '@reduxjs/toolkit';
import { addonsTotal, lineKeyFor, syncSelections } from '../utils/customisation';

// A cart line is one *configuration* of a dish, not just a dish: a burger with extra cheese and
// the same burger without are two lines. `lineKey` carries that identity (see
// utils/customisation.js). Lines saved before customisation existed simply have no selections,
// and `normalise` gives them a key so old carts keep working.
//
// items: [{ _id, name, price, ..., quantity, lineKey, selections: [], instructions: '' }]
const initialState = {
  canteen: null,
  items: [],
};

const pickItem = ({ _id, name, price, description, available, image, dietary, prepTime, category, customisationGroups }) =>
  ({ _id, name, price, description, available, image, dietary, prepTime, category, customisationGroups });
const pickCanteen = ({ _id, name, location, pickupInstructions }) => ({ _id, name, location, pickupInstructions });

// `price` stays the plain dish price; the add-ons are kept separately so the breakdown can be
// shown, and `unitPrice` is what a single unit of this configuration actually costs.
const withLine = (item, selections = [], instructions = '', quantity = 1) => {
  const base = pickItem(item);
  const extras = addonsTotal(selections);
  return {
    ...base,
    selections,
    instructions: instructions || '',
    addonsTotal: extras,
    unitPrice: (base.price || 0) + extras,
    lineKey: lineKeyFor(base._id, selections, instructions),
    quantity,
  };
};

// Brings a line from storage (or an older app version) up to the current shape.
const normalise = (line) => {
  const selections = line.selections || [];
  const extras = addonsTotal(selections);
  return {
    ...line,
    selections,
    instructions: line.instructions || '',
    addonsTotal: extras,
    unitPrice: (line.price || 0) + extras,
    lineKey: line.lineKey || lineKeyFor(line._id, selections, line.instructions),
  };
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Caller must confirm before adding an item from a different canteen; this replaces the cart.
    addToCart: (state, action) => {
      const { item, canteen, quantity = 1, selections = [], instructions = '' } = action.payload;
      if (state.canteen && state.canteen._id !== canteen._id) {
        state.items = [];
      }
      state.canteen = pickCanteen(canteen);
      const line = withLine(item, selections, instructions, quantity);
      // Identical configurations merge; anything else becomes its own line.
      const existing = state.items.find(i => i.lineKey === line.lineKey);
      if (existing) existing.quantity += quantity;
      else state.items.push(line);
    },
    // Replace the whole cart (reorder, restore from device storage).
    setCart: (state, action) => {
      const { canteen, items } = action.payload || {};
      state.canteen = canteen && items?.length ? pickCanteen(canteen) : null;
      state.items = canteen && items?.length
        ? items.map(i => normalise({ ...pickItem(i), selections: i.selections, instructions: i.instructions, quantity: i.quantity }))
        : [];
    },
    // Undo for a removed line: puts it back where it was.
    restoreItem: (state, action) => {
      const { item, index, canteen } = action.payload;
      if (state.canteen && canteen && state.canteen._id !== canteen._id) return;
      if (!state.canteen && canteen) state.canteen = pickCanteen(canteen);
      const line = normalise(item);
      if (state.items.some(i => i.lineKey === line.lineKey)) return;
      state.items.splice(Math.min(index ?? state.items.length, state.items.length), 0, line);
    },
    setQuantity: (state, action) => {
      const { lineKey, quantity } = action.payload;
      const existing = state.items.find(i => i.lineKey === lineKey);
      if (!existing) return;
      if (quantity <= 0) state.items = state.items.filter(i => i.lineKey !== lineKey);
      else existing.quantity = quantity;
      if (!state.items.length) state.canteen = null;
    },
    // Replaces one line's choices in place (used when a student edits a line from the cart).
    updateLine: (state, action) => {
      const { lineKey, item, selections = [], instructions = '', quantity } = action.payload;
      const index = state.items.findIndex(i => i.lineKey === lineKey);
      if (index === -1) return;
      const source = item || state.items[index];
      const next = withLine(source, selections, instructions, quantity ?? state.items[index].quantity);
      const clash = state.items.findIndex((i, n) => n !== index && i.lineKey === next.lineKey);
      if (clash !== -1) {
        // Editing a line into an existing configuration merges the two.
        state.items[clash].quantity += next.quantity;
        state.items.splice(index, 1);
      } else {
        state.items[index] = next;
      }
    },
    // Keep cart prices, availability and option labels in step with the live menu (the server
    // charges current prices, so the cart must not show stale ones).
    syncWithMenu: (state, action) => {
      const { canteenId, menu } = action.payload;
      if (!state.canteen || state.canteen._id !== canteenId) return;
      state.items.forEach((i) => {
        const live = menu.find(m => m._id === i._id);
        if (!live) { i.available = false; return; }
        const selections = syncSelections(live, i.selections);
        const extras = addonsTotal(selections);
        Object.assign(i, {
          price: live.price,
          available: !!live.available,
          name: live.name,
          image: live.image,
          dietary: live.dietary,
          prepTime: live.prepTime,
          customisationGroups: live.customisationGroups,
          selections,
          addonsTotal: extras,
          unitPrice: (live.price || 0) + extras,
        });
      });
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(i => i.lineKey !== action.payload);
      if (!state.items.length) state.canteen = null;
    },
    emptyCart: (state) => {
      state.items = [];
      state.canteen = null;
    },
  },
});

export const { addToCart, setCart, restoreItem, setQuantity, updateLine, syncWithMenu, removeItem, emptyCart } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCanteen = (state) => state.cart.canteen;
export const selectCartCount = (state) => state.cart.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartTotal = (state) => state.cart.items.reduce((t, i) => t + (i.unitPrice ?? i.price) * i.quantity, 0);
// How many of this dish are in the cart in total, across every configuration of it.
export const selectItemQuantity = (itemId) => (state) =>
  state.cart.items.filter(i => i._id === itemId).reduce((n, i) => n + i.quantity, 0);
export const selectLine = (lineKey) => (state) => state.cart.items.find(i => i.lineKey === lineKey) || null;

export default cartSlice.reducer;
