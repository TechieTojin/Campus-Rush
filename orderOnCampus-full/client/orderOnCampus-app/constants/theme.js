import { Platform } from 'react-native';

// Campus Rush design tokens. Warm cream canvas, deep "campus" teal for actions and brand,
// saffron as the single accent. Every screen pulls from here so the app reads as one product.
export const colors = {
  brand: '#0B5E57',
  brandDeep: '#073F3A',
  brandSoft: '#DCEEEA',
  brandTint: '#F0F7F5',
  accent: '#F4A23A',
  accentDeep: '#B9681A',
  accentSoft: '#FFF0DA',
  heart: '#E0475A',
  heartSoft: '#FCE8EB',

  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EFE8',
  surfaceMuted: '#F3EFE8',
  border: '#E9E3D8',
  divider: '#F0EBE2',

  ink: '#111C1A',
  text: '#2C3533',
  muted: '#68716F',
  faint: '#9CA3A1',
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255,255,255,0.78)',

  success: '#16834F',
  successSoft: '#E2F3EA',
  danger: '#C8372F',
  dangerSoft: '#FCE9E7',
  warning: '#A8620B',
  warningSoft: '#FFF2DB',
  info: '#3559C7',
  infoSoft: '#E8EEFC',
  overlay: 'rgba(17, 28, 26, 0.48)',
  scrim: 'rgba(17, 28, 26, 0.32)',
};

export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 };

// Minimum comfortable touch target (Android guidance is 48dp).
export const touch = 48;

export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.ink, letterSpacing: -0.7 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  h3: { fontSize: 16.5, lineHeight: 22, fontWeight: '700', color: colors.ink, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: colors.text },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: colors.muted },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.text },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.muted, letterSpacing: 0.1 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: colors.muted, letterSpacing: 1.3, textTransform: 'uppercase' },
  price: { fontSize: 16, lineHeight: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  mono: { fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: 1.5, fontFamily: Platform.select({ android: 'monospace', default: 'Menlo' }) },
};

export const shadow = {
  card: Platform.select({
    android: { elevation: 1.5, shadowColor: '#2B1E0A' },
    default: { shadowColor: '#2B1E0A', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  }),
  raised: Platform.select({
    android: { elevation: 8, shadowColor: '#2B1E0A' },
    default: { shadowColor: '#2B1E0A', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  }),
};

export const motion = { fast: 160, base: 240, slow: 380, spring: { speed: 22, bounciness: 6 } };

// Dietary types the canteen portal can set on a menu item (server enum). Empty means "not specified" —
// the app never guesses dietary information.
export const DIETARY = {
  veg: { label: 'Veg', color: '#178A3A', shape: 'dot' },
  vegan: { label: 'Vegan', color: '#178A3A', shape: 'leaf' },
  egg: { label: 'Contains egg', color: '#C99312', shape: 'dot' },
  'non-veg': { label: 'Non-veg', color: '#B8322B', shape: 'triangle' },
};

export const ORDER_STATUS = {
  Placed: { label: 'Placed', title: 'Order received', hint: 'Waiting for the canteen to accept it', color: '#4062D0', soft: '#E9EEFC', icon: 'inbox' },
  Processing: { label: 'Preparing', title: 'Being prepared', hint: 'The kitchen is making your food', color: '#B9681A', soft: '#FFF0DA', icon: 'clock' },
  Ready: { label: 'Ready', title: 'Ready for pickup', hint: 'Head to the counter and show your order code', color: '#13824F', soft: '#E2F3EA', icon: 'package' },
  Completed: { label: 'Collected', title: 'Collected', hint: 'Enjoy your meal', color: '#4F5B59', soft: '#EEF0EF', icon: 'check-circle' },
  Cancelled: { label: 'Cancelled', title: 'Cancelled', hint: 'This order was cancelled by the canteen', color: '#C8372F', soft: '#FCE9E7', icon: 'x-circle' },
};

export const ACTIVE_STATUSES = ['Placed', 'Processing', 'Ready'];
export const PROGRESS_STEPS = ['Placed', 'Processing', 'Ready', 'Completed'];
