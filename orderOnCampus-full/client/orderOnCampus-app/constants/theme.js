import { Platform } from 'react-native';

// Campus Rush V3 design language — "Evergreen & Marigold".
// Warm paper canvas, deep evergreen for brand and primary actions, marigold as the single accent,
// clay for warmth in illustration. Everything below is shared by every screen.
export const colors = {
  brand: '#0F4C42',
  brandDeep: '#0A3530',
  brandMid: '#1E6B5D',
  brandSoft: '#DDEBE6',
  brandTint: '#EFF5F2',
  accent: '#F5A524',
  accentDeep: '#B26B0B',
  accentSoft: '#FDEFD6',
  clay: '#B5532F',
  claySoft: '#F7E4DA',
  heart: '#D9424F',
  heartSoft: '#FBE6E8',

  bg: '#F8F5EF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1ECE3',
  surfaceMuted: '#F1ECE3',
  border: '#E6DFD3',
  divider: '#EFE9DF',

  ink: '#10201C',
  text: '#2B3532',
  muted: '#66706D',
  faint: '#9AA19E',
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255,255,255,0.76)',

  success: '#147D4E',
  successSoft: '#E1F2E9',
  danger: '#C2362E',
  dangerSoft: '#FBE8E6',
  warning: '#A35F08',
  warningSoft: '#FFF1D9',
  info: '#0F4C42',
  infoSoft: '#E4EFEB',
  overlay: 'rgba(10, 24, 21, 0.5)',
  scrim: 'rgba(10, 24, 21, 0.32)',
};

export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 30, pill: 999 };

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 };

// Minimum comfortable touch target (Android guidance is 48dp).
export const touch = 48;

// fontWeight is mapped to the matching Plus Jakarta Sans face by components/ui/text.js.
export const type = {
  display: { fontSize: 31, lineHeight: 37, fontWeight: '800', color: colors.ink, letterSpacing: -0.9 },
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink, letterSpacing: -0.7 },
  h2: { fontSize: 19.5, lineHeight: 25, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  h3: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  body: { fontSize: 14.5, lineHeight: 21, fontWeight: '400', color: colors.text },
  bodyStrong: { fontSize: 14.5, lineHeight: 21, fontWeight: '600', color: colors.ink },
  small: { fontSize: 12.5, lineHeight: 18, fontWeight: '500', color: colors.muted },
  smallStrong: { fontSize: 12.5, lineHeight: 18, fontWeight: '700', color: colors.text },
  caption: { fontSize: 11.5, lineHeight: 15, fontWeight: '600', color: colors.muted },
  overline: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', color: colors.muted, letterSpacing: 1.4, textTransform: 'uppercase' },
  price: { fontSize: 16, lineHeight: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  code: { fontSize: 38, fontWeight: '800', color: colors.ink, letterSpacing: 7 },
};

export const shadow = {
  card: Platform.select({
    android: { elevation: 1.5, shadowColor: '#3A2A10' },
    default: { shadowColor: '#3A2A10', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  }),
  raised: Platform.select({
    android: { elevation: 8, shadowColor: '#3A2A10' },
    default: { shadowColor: '#3A2A10', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  }),
};

export const motion = { fast: 160, base: 240, slow: 380 };

// Dietary types the canteen portal can set on a menu item (server enum). Empty = not specified;
// the app never guesses dietary information.
export const DIETARY = {
  veg: { label: 'Veg', color: '#178A3A', shape: 'dot' },
  vegan: { label: 'Vegan', color: '#178A3A', shape: 'leaf' },
  egg: { label: 'Contains egg', color: '#C99312', shape: 'dot' },
  'non-veg': { label: 'Non-veg', color: '#B8322B', shape: 'triangle' },
};

// Status palette stays inside the brand family; red is reserved for cancellation.
export const ORDER_STATUS = {
  Placed: { label: 'Received', title: 'Order received', hint: 'Waiting for the canteen to accept it', color: '#1E6B5D', soft: '#E4EFEB', icon: 'inbox' },
  Processing: { label: 'Preparing', title: 'Being prepared', hint: 'The kitchen is making your food', color: '#B26B0B', soft: '#FDEFD6', icon: 'clock' },
  Ready: { label: 'Ready', title: 'Ready for pickup', hint: 'Head to the counter with your pickup code', color: '#147D4E', soft: '#E1F2E9', icon: 'package' },
  Completed: { label: 'Collected', title: 'Collected', hint: 'Enjoy your meal', color: '#4E5956', soft: '#EEF0EE', icon: 'check-circle' },
  Cancelled: { label: 'Cancelled', title: 'Cancelled', hint: 'This order was cancelled by the canteen', color: '#C2362E', soft: '#FBE8E6', icon: 'x-circle' },
};

export const ACTIVE_STATUSES = ['Placed', 'Processing', 'Ready'];
export const PROGRESS_STEPS = ['Placed', 'Processing', 'Ready', 'Completed'];
