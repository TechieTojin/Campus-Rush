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
      lines: order.lineItems.map(l => ({ _id: String(l.item), name: l.name, price: l.price, quantity: l.quantity, image: images.get(String(l.item)) })),
      snapshot: true,
    };
  }
  return { lines: groupOrderItems(order.items), snapshot: false };
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
  { re: /biryani|pulao|rice|meals|thali|khichdi/i, icon: 'rice', tint: '#FFF1DE', color: '#C9761A' },
  { re: /cold coffee|frappe|shake|smoothie|juice|lime|soda|cola|mojito|lassi/i, icon: 'bottle-soda', tint: '#E6F2FB', color: '#2B6CA3' },
  { re: /coffee|latte|cappuccino|espresso|mocha/i, icon: 'coffee', tint: '#F3E9E1', color: '#7A4A2A' },
  { re: /tea|chai/i, icon: 'tea', tint: '#EEF5E4', color: '#5A7A2A' },
  { re: /dosa|idli|vada|uttapam|upma|pongal|appam/i, icon: 'pot-steam', tint: '#FDF0D9', color: '#B8741A' },
  { re: /paratha|roti|chapati|naan|kulcha|puri/i, icon: 'bread-slice', tint: '#FBEBDD', color: '#A85F2A' },
  { re: /pizza/i, icon: 'pizza', tint: '#FDE8E3', color: '#C2452D' },
  { re: /burger|sandwich|wrap|roll|frankie/i, icon: 'hamburger', tint: '#FDEEDC', color: '#B4651E' },
  { re: /noodle|pasta|maggi|chowmein/i, icon: 'noodles', tint: '#FFF4D6', color: '#A98410' },
  { re: /egg|omelette/i, icon: 'egg-fried', tint: '#FFF7D9', color: '#B08A12' },
  { re: /chicken|mutton|fish|kebab|tikka/i, icon: 'food-drumstick', tint: '#FBE7DF', color: '#B04A2A' },
  { re: /cake|pastry|brownie|muffin|cookie|donut/i, icon: 'cupcake', tint: '#FCE8F0', color: '#B23F73' },
  { re: /ice ?cream|sundae|kulfi/i, icon: 'ice-cream', tint: '#F1EAFB', color: '#7047B8' },
  { re: /puff|croissant|bun|bread|samosa|pakora|bajji/i, icon: 'food-croissant', tint: '#FBEBDD', color: '#A85F2A' },
  { re: /salad|fruit|bowl/i, icon: 'bowl-mix', tint: '#E8F5E9', color: '#2F7A3A' },
];

export const foodVisual = (name = '') =>
  FOOD_RULES.find(r => r.re.test(name)) || { icon: 'silverware-fork-knife', tint: '#E1F0EE', color: '#0E6B6B' };

const CANTEEN_PALETTES = [
  { bg: '#0E6B6B', fg: '#BFE3DF' },
  { bg: '#B4561F', fg: '#F6CFAE' },
  { bg: '#3D4F8C', fg: '#C4CDF0' },
  { bg: '#6B4E9B', fg: '#D9CCF0' },
  { bg: '#2F6B3A', fg: '#BFE2C5' },
];

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
