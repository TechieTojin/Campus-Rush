export const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const orderRef = (id = '') => `#${String(id).slice(-6).toUpperCase()}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatTime = (value) => {
  const d = new Date(value);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
};

export const formatDate = (value) => {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return `Today, ${formatTime(d)}`;
  if (same(d, yesterday)) return `Yesterday, ${formatTime(d)}`;
  const year = d.getFullYear() !== today.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}, ${formatTime(d)}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || '';

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?';

// The order API stores one entry per unit, so repeated ids mean quantity.
export const groupOrderItems = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    if (!item) return;
    const id = item._id || item;
    const entry = map.get(String(id));
    if (entry) entry.quantity += 1;
    else map.set(String(id), { ...(typeof item === 'object' ? item : { _id: id, name: 'Item' }), quantity: 1 });
  });
  return [...map.values()];
};

export const summarizeItems = (items = []) =>
  groupOrderItems(items).map(i => `${i.quantity}× ${i.name}`).join(', ');

// Newer orders carry lineItems with the name/price charged at order time. Older ones only
// reference menu items, so their prices are today's menu prices (`snapshot: false`).
export const orderLines = (order = {}) => {
  if (order.lineItems?.length) {
    const images = new Map((order.items || []).filter(i => i && i._id).map(i => [String(i._id), i.image]));
    return {
      lines: order.lineItems.map(l => ({
        _id: String(l.item),
        name: l.name,
        price: l.price,
        quantity: l.quantity,
        image: images.get(String(l.item)),
        // Customisation snapshot (V4); empty on older orders.
        selections: l.selections || [],
        instructions: l.instructions || '',
        basePrice: typeof l.basePrice === 'number' ? l.basePrice : l.price,
        addonsTotal: typeof l.addonsTotal === 'number' ? l.addonsTotal : 0,
      })),
      snapshot: true,
    };
  }
  return { lines: groupOrderItems(order.items).map(l => ({ ...l, selections: [], instructions: '' })), snapshot: false };
};

export const summarizeOrder = (order) => orderLines(order).lines.map(i => `${i.quantity}× ${i.name}`).join(', ');

export const formatClock = (hhmm) => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const openingHours = (canteen = {}) =>
  canteen.openingTime && canteen.closingTime ? `${formatClock(canteen.openingTime)} – ${formatClock(canteen.closingTime)}` : '';

const FOOD_RULES = [
  { re: /biryani|pulao|rice|meals|thali|khichdi/i, label: 'Biryani & rice', icon: 'rice', tint: '#FFF1DE', color: '#C9761A' },
  { re: /cold coffee|frappe|shake|smoothie|juice|lime|soda|cola|mojito|lassi/i, label: 'Cold drinks', icon: 'bottle-soda', tint: '#E4EFEB', color: '#1E6B5D' },
  { re: /coffee|latte|cappuccino|espresso|mocha/i, label: 'Coffee', icon: 'coffee', tint: '#F4E7DD', color: '#8A4B27' },
  { re: /tea|chai/i, label: 'Tea', icon: 'tea', tint: '#E4EFEB', color: '#1E6B5D' },
  { re: /dosa|idli|vada|uttapam|upma|pongal|appam/i, label: 'Dosa & South Indian', icon: 'pot-steam', tint: '#FDF0D9', color: '#B8741A' },
  { re: /paratha|roti|chapati|naan|kulcha|puri/i, label: 'Breads', icon: 'bread-slice', tint: '#FBEBDD', color: '#A85F2A' },
  { re: /pizza/i, label: 'Pizza', icon: 'pizza', tint: '#F7E4DA', color: '#B5532F' },
  { re: /burger|sandwich|wrap|roll|frankie/i, label: 'Burgers & sandwiches', icon: 'hamburger', tint: '#FDEEDC', color: '#B4651E' },
  { re: /noodle|pasta|maggi|chowmein/i, label: 'Noodles & pasta', icon: 'noodles', tint: '#FFF4D6', color: '#A98410' },
  { re: /egg|omelette/i, label: 'Egg dishes', icon: 'egg-fried', tint: '#FFF7D9', color: '#B08A12' },
  { re: /chicken|mutton|fish|kebab|tikka/i, label: 'Chicken & meat', icon: 'food-drumstick', tint: '#F7E4DA', color: '#B5532F' },
  { re: /cake|pastry|brownie|muffin|cookie|donut/i, label: 'Desserts', icon: 'cupcake', tint: '#F7E4DA', color: '#B5532F' },
  { re: /ice ?cream|sundae|kulfi/i, label: 'Ice cream', icon: 'ice-cream', tint: '#F7E4DA', color: '#B5532F' },
  { re: /puff|croissant|bun|bread|samosa|pakora|bajji/i, label: 'Snacks & bakes', icon: 'food-croissant', tint: '#FBEBDD', color: '#A85F2A' },
  { re: /salad|fruit|bowl/i, label: 'Salads & bowls', icon: 'bowl-mix', tint: '#E4EFEB', color: '#1E6B5D' },
];

// Craving groups that actually have dishes on today's menus (derived from dish names, never invented).
export const cravings = (entries = []) => {
  const groups = new Map();
  entries.forEach((e) => {
    if (!e?.item?.available) return;
    const rule = FOOD_RULES.find(r => r.re.test(e.item.name));
    if (!rule) return;
    const g = groups.get(rule.label) || { ...rule, count: 0, sample: e.item.name, names: [] };
    g.count += 1;
    g.names.push(e.item.name);
    groups.set(rule.label, g);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count);
};

export const matchesCraving = (label, name = '') => !!FOOD_RULES.find(r => r.label === label)?.re.test(name);

export const foodVisual = (name = '') =>
  FOOD_RULES.find(r => r.re.test(name)) || { icon: 'silverware-fork-knife', tint: '#DDEBE6', color: '#0F4C42' };

// Brand-family cover palettes (evergreen, ink, clay, marigold) so placeholder covers never clash.
const CANTEEN_PALETTES = [
  { bg: '#0F4C42', fg: '#9FCFC2' },
  { bg: '#1D2A27', fg: '#F5A524' },
  { bg: '#9C4628', fg: '#F7D2BF' },
  { bg: '#C98411', fg: '#FFF0D2' },
]

export const canteenVisual = (canteen = {}) => {
  const key = `${canteen.name || ''}${canteen._id || ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const palette = CANTEEN_PALETTES[hash % CANTEEN_PALETTES.length];
  const cat = `${canteen.category || ''} ${canteen.name || ''}`;
  let icon = 'storefront-outline';
  if (/snack/i.test(cat)) icon = 'food-croissant';
  else if (/cafe|coffee/i.test(cat)) icon = 'coffee';
  else if (/bakery/i.test(cat)) icon = 'cupcake';
  else if (/multi|meal|lunch/i.test(cat)) icon = 'silverware-fork-knife';
  return { ...palette, icon };
};

export const isValidEmail = (v = '') => /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(v.trim());
export const isStrongPassword = (v = '') => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(v);
