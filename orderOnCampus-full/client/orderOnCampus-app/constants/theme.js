import { Platform } from 'react-native';

export const colors = {
  brand: '#0E6B6B',
  brandDark: '#094F4F',
  brandSoft: '#E1F0EE',
  brandTint: '#F0F8F7',
  accent: '#F29E38',
  accentDark: '#C9761A',
  accentSoft: '#FFF1DE',
  heart: '#E8505B',
  heartSoft: '#FDE9EA',

  bg: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EDE6',
  border: '#E7E2D8',
  divider: '#EFEBE3',

  ink: '#13201F',
  text: '#2B3634',
  muted: '#66716F',
  faint: '#9AA3A1',
  onBrand: '#FFFFFF',

  success: '#1F8A5B',
  successSoft: '#E3F4EC',
  danger: '#D33A3A',
  dangerSoft: '#FDE8E8',
  warning: '#B86E00',
  warningSoft: '#FFF3DC',
  overlay: 'rgba(19, 32, 31, 0.45)',
};

export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 };

export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: colors.text },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: colors.muted },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.text },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.muted, letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  price: { fontSize: 16, lineHeight: 20, fontWeight: '800', color: colors.ink },
};

export const shadow = {
  card: Platform.select({
    android: { elevation: 2 },
    default: { shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  }),
  raised: Platform.select({
    android: { elevation: 6 },
    default: { shadowColor: colors.ink, shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  }),
};

export const ORDER_STATUS = {
  Placed: { label: 'Placed', title: 'Order placed', hint: 'Waiting for the canteen to confirm', color: '#2F6FED', soft: '#E7EEFE', icon: 'inbox' },
  Processing: { label: 'Processing', title: 'Being prepared', hint: 'The kitchen is preparing your food', color: '#B86E00', soft: '#FFF3DC', icon: 'clock' },
  Ready: { label: 'Ready', title: 'Ready for pickup', hint: 'Collect your order at the counter', color: '#7A4CE0', soft: '#F0EAFE', icon: 'package' },
  Completed: { label: 'Completed', title: 'Collected', hint: 'Enjoy your meal!', color: '#1F8A5B', soft: '#E3F4EC', icon: 'check-circle' },
  Cancelled: { label: 'Cancelled', title: 'Cancelled', hint: 'This order was cancelled by the canteen', color: '#D33A3A', soft: '#FDE8E8', icon: 'x-circle' },
};

export const ACTIVE_STATUSES = ['Placed', 'Processing', 'Ready'];
export const PROGRESS_STEPS = ['Placed', 'Processing', 'Ready', 'Completed'];
