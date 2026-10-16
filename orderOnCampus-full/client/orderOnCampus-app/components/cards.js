import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { colors, ORDER_STATUS, PROGRESS_STEPS, radius, shadow, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import useCart from '../hooks/useCart';
import { isOpen } from '../hooks/useCatalog';
import { useFavorite } from '../hooks/useSession';
import { selectCartCanteen, selectCartCount, selectCartItems, selectCartTotal, selectItemQuantity } from '../slices/CartSlice';
import { formatDate, formatPrice, openingHours, orderLines, orderRef, summarizeOrder } from '../utils/format';
import { hasCustomisation, hasRequiredChoices } from '../utils/customisation';
import { EstimateLine } from './ui/pickup';
import { CanteenCover, DietMark, FoodArt, PrepTime, QuantityStepper } from './ui/food';
import { IconButton, PressableScale, StatusBadge, Tag } from './ui/primitives';
import { Text } from './ui/text';

// Height the floating cart bar occupies; scroll views add this so it never covers content.
export const CART_BAR_SPACE = 104;

function useItemCart(item, canteen) {
  const navigation = useNavigation();
  const lines = useSelector(selectCartItems);
  const quantity = useSelector(selectItemQuantity(item._id));
  const { add, update, maxQty } = useCart();
  // A dish with required choices can't be added from a card — there is nothing to add until the
  // student has picked a size (or whatever the canteen asks for), so the card opens the dish.
  const needsChoice = hasRequiredChoices(item);
  const myLines = lines.filter(l => l._id === item._id);
  const openDetail = () => navigation.navigate('FoodDetail', { itemId: item._id, canteenId: canteen._id, item, canteen });

  return {
    quantity,
    needsChoice,
    // More than one configuration of the same dish: the stepper would be ambiguous, so the card
    // shows the total and sends the student to the dish to change anything.
    multiple: myLines.length > 1,
    maxReached: quantity >= maxQty,
    increase: () => {
      if (needsChoice || myLines.length > 1) return openDetail();
      if (quantity) return update(myLines[0].lineKey, quantity + 1);
      return add(item, canteen);
    },
    decrease: () => {
      if (myLines.length !== 1) return openDetail();
      update(myLines[0].lineKey, quantity - 1);
    },
  };
}

// Menu row: details left, image right with the add control overlapping its bottom edge.
export function DishRow({ item, canteen, closed, last }) {
  const navigation = useNavigation();
  const cart = useItemCart(item, canteen);
  const unavailable = !item.available || closed;
  return (
    <PressableScale
      onPress={() => navigation.navigate('FoodDetail', { itemId: item._id, canteenId: canteen._id, item, canteen })}
      scaleTo={0.985}
      accessibilityLabel={`${item.name}, ${formatPrice(item.price)}${!item.available ? ', unavailable' : ''}`}
      accessibilityHint="Opens item details"
      style={[styles.dishRow, !last && styles.dishDivider]}
    >
      <View style={{ flex: 1, paddingRight: space.md }}>
        {item.dietary || item.prepTime ? (
          <View style={styles.dishMeta}>
            <DietMark dietary={item.dietary} />
            {item.prepTime ? <View style={{ marginLeft: item.dietary ? 6 : 0 }}><PrepTime minutes={item.prepTime} /></View> : null}
          </View>
        ) : null}
        <Text style={[type.h3, !item.available && { color: colors.muted }]} numberOfLines={2}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
          {/* "from" signals that choices can add to the price, so the figure is never misleading. */}
          {hasCustomisation(item) ? <Text style={[type.small, { marginRight: 4 }]}>from</Text> : null}
          <Text style={type.price}>{formatPrice(item.price)}</Text>
        </View>
        {item.description ? <Text style={[type.small, { marginTop: 5 }]} numberOfLines={2}>{item.description}</Text> : null}
        {!item.available ? (
          <View style={styles.soldOut}><Text style={[type.caption, { color: colors.danger }]}>Sold out for now</Text></View>
        ) : null}
      </View>
      <View style={styles.dishMedia}>
        <FoodArt name={item.name} image={item.image} size={108} height={100} rounded={radius.md} dimmed={!item.available} />
        <View style={styles.dishAdd}>
          <QuantityStepper compact name={item.name} quantity={cart.quantity} disabled={unavailable} maxReached={cart.maxReached} onIncrease={cart.increase} onDecrease={cart.decrease} />
        </View>
      </View>
    </PressableScale>
  );
}

// Rail card for popular / recent / "more from" dishes.
export function DishTile({ item, canteen, ordered, width = 168, caption }) {
  const navigation = useNavigation();
  const cart = useItemCart(item, canteen);
  const unavailable = !item.available || !isOpen(canteen);
  return (
    <PressableScale
      onPress={() => navigation.navigate('FoodDetail', { itemId: item._id, canteenId: canteen._id, item, canteen })}
      scaleTo={0.97}
      accessibilityLabel={`${item.name} from ${canteen.name}, ${formatPrice(item.price)}${unavailable ? ', unavailable' : ''}`}
      style={[styles.tile, { width }]}
    >
      <View>
        <FoodArt name={item.name} image={item.image} size={width - 12} height={(width - 12) * 0.78} rounded={radius.md} dimmed={!item.available} />
        <View style={styles.tileBadges}>
          {item.dietary ? <View style={styles.markChip}><DietMark dietary={item.dietary} size={12} /></View> : null}
          {ordered ? <Tag label={`${ordered} ordered`} tone="dark" icon="trending-up" style={{ marginLeft: item.dietary ? 4 : 0 }} /> : null}
        </View>
      </View>
      <View style={{ paddingHorizontal: 6, paddingTop: space.xs }}>
        <Text style={type.bodyStrong} numberOfLines={1}>{item.name}</Text>
        <Text style={type.small} numberOfLines={1}>{caption || canteen.name}</Text>
        <View style={styles.tileFooter}>
          <Text style={type.price}>{formatPrice(item.price)}</Text>
          <QuantityStepper compact name={item.name} quantity={cart.quantity} disabled={unavailable} maxReached={cart.maxReached} onIncrease={cart.increase} onDecrease={cart.decrease} />
        </View>
      </View>
    </PressableScale>
  );
}

// Wide dish feature used when a rail would hold a single item (sparse menus look intentional).
export function DishFeature({ item, canteen, ordered, eyebrow }) {
  const navigation = useNavigation();
  const cart = useItemCart(item, canteen);
  const unavailable = !item.available || !isOpen(canteen);
  return (
    <PressableScale onPress={() => navigation.navigate('FoodDetail', { itemId: item._id, canteenId: canteen._id, item, canteen })} scaleTo={0.985}
      accessibilityLabel={`${item.name} from ${canteen.name}, ${formatPrice(item.price)}`} style={styles.feature}>
      <FoodArt name={item.name} image={item.image} size={118} height={118} rounded={radius.md} dimmed={!item.available} />
      <View style={{ flex: 1, marginLeft: space.md }}>
        {eyebrow || ordered ? <Text style={[type.overline, { color: colors.accentDeep }]}>{eyebrow || `${ordered} ordered`}</Text> : null}
        <Text style={[type.h3, { marginTop: 3 }]} numberOfLines={2}>{item.name}</Text>
        <Text style={type.small} numberOfLines={1}>{canteen.name}</Text>
        <View style={styles.tileFooter}>
          <Text style={type.price}>{formatPrice(item.price)}</Text>
          <QuantityStepper compact name={item.name} quantity={cart.quantity} disabled={unavailable} maxReached={cart.maxReached} onIncrease={cart.increase} onDecrease={cart.decrease} />
        </View>
      </View>
    </PressableScale>
  );
}

export function CanteenCard({ canteen, compact }) {
  const navigation = useNavigation();
  const { isFavorite, toggle, busy } = useFavorite(canteen._id);
  const config = useAppConfig();
  const favoritesOn = config.studentApp?.enableFavorites !== false;
  const paused = !!config.maintenance?.enabled;
  const menu = (canteen.menu || []).filter(Boolean);
  const available = menu.filter(m => m.available).length;
  const open = isOpen(canteen);
  const hours = openingHours(canteen);
  const prep = prepSpan(menu);
  const status = !open ? (canteen.status === 'suspended' ? 'Unavailable' : 'Closed now') : paused ? 'Ordering paused' : 'Open now';
  return (
    <PressableScale
      onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id, canteen })}
      scaleTo={0.985}
      accessibilityLabel={`${canteen.name}, ${canteen.location}, ${status}`}
      style={[styles.canteen, compact && { width: 272, marginRight: space.sm, marginBottom: 0 }]}
    >
      <CanteenCover canteen={canteen} height={compact ? 112 : 128} rounded={0}>
        <View style={styles.coverTop}>
          <View style={[styles.statusPill, !open || paused ? { backgroundColor: 'rgba(16,32,28,0.78)' } : null]}>
            <View style={[styles.statusDot, { backgroundColor: open && !paused ? colors.success : colors.accent }]} />
            <Text style={[styles.statusText, (!open || paused) && { color: '#fff' }]}>{status}</Text>
          </View>
          {favoritesOn ? (
            <IconButton
              icon={<MaterialCommunityIcons name={isFavorite ? 'heart' : 'heart-outline'} size={19} color={isFavorite ? colors.heart : colors.ink} />}
              tone="glass"
              size={38}
              onPress={() => !busy && toggle(canteen.name)}
              accessibilityLabel={isFavorite ? `Remove ${canteen.name} from saved` : `Save ${canteen.name}`}
            />
          ) : <View />}
        </View>
      </CanteenCover>
      <View style={styles.canteenBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[type.h3, { flex: 1, fontSize: 17 }]} numberOfLines={1}>{canteen.name}</Text>
          {canteen.category ? <Tag label={canteen.category} tone="brand" style={{ marginLeft: space.xs }} /> : null}
        </View>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12.5} color={colors.muted} />
          <Text style={[type.small, { marginLeft: 5, flex: 1 }]} numberOfLines={1}>{canteen.location}</Text>
        </View>
        <View style={styles.metaStrip}>
          <Meta icon="book-open" label={menu.length ? `${available} of ${menu.length} available` : 'Menu coming soon'} />
          {prep ? <Meta icon="clock" label={prep} /> : hours && !compact ? <Meta icon="sun" label={hours} /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

function Meta({ icon, label }) {
  return (
    <View style={styles.meta}>
      <Feather name={icon} size={12} color={colors.brand} />
      <Text style={[type.caption, { marginLeft: 5, color: colors.text }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// "8–15 min" from the canteen's own prep-time entries (only when they set them).
export function prepSpan(menu = []) {
  const times = menu.filter(m => m && m.available && m.prepTime).map(m => m.prepTime);
  if (!times.length) return '';
  const lo = Math.min(...times);
  const hi = Math.max(...times);
  return lo === hi ? `~${lo} min prep` : `${lo}–${hi} min prep`;
}

export function CartBar({ style, bottomOffset }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const count = useSelector(selectCartCount);
  const total = useSelector(selectCartTotal);
  const canteen = useSelector(selectCartCanteen);
  const anim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const prev = useRef(count);
  const visible = count > 0;

  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    if (visible && prev.current && count > prev.current) {
      pulse.setValue(0.94);
      Animated.spring(pulse, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 12 }).start();
    }
    prev.current = count;
  }, [visible, count, anim, pulse]);

  if (!visible) return null;
  return (
    <Animated.View
      style={[styles.cartWrap, { bottom: bottomOffset ?? Math.max(insets.bottom, space.md) }, style, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }, { scale: pulse }] }]}
    >
      <PressableScale onPress={() => navigation.navigate('Cart')} scaleTo={0.98} accessibilityLabel={`View cart, ${count} items, ${formatPrice(total)}`} style={styles.cartBar}>
        <View style={styles.cartCount}>
          <Feather name="shopping-bag" size={16} color={colors.ink} />
          <Text style={styles.cartCountText}>{count}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <Text style={styles.cartTitle}>View cart</Text>
          <Text style={styles.cartSub} numberOfLines={1}>{canteen?.name}</Text>
        </View>
        <Text style={styles.cartTotal}>{formatPrice(total)}</Text>
        <View style={styles.cartArrow}><Feather name="arrow-right" size={17} color={colors.brandDeep} /></View>
      </PressableScale>
    </Animated.View>
  );
}

export function OrderProgressBar({ status, light }) {
  const idx = PROGRESS_STEPS.indexOf(status);
  return (
    <View style={styles.progress} accessibilityLabel={`Step ${idx + 1} of ${PROGRESS_STEPS.length}`}>
      {PROGRESS_STEPS.map((s, i) => (
        <View key={s} style={[styles.progressSeg, { backgroundColor: i <= idx ? (light ? colors.accent : ORDER_STATUS[status].color) : light ? 'rgba(255,255,255,0.22)' : colors.border }, i < PROGRESS_STEPS.length - 1 && { marginRight: 4 }]} />
      ))}
    </View>
  );
}

// Hero card for an order still in progress (Home and Orders).
export function ActiveOrderCard({ order, onPress, style }) {
  const navigation = useNavigation();
  const meta = ORDER_STATUS[order.status];
  const ready = order.status === 'Ready';
  // "Collect" should do exactly that: a ready order opens the pickup code straight away.
  const go = () => (ready ? navigation.navigate('Pickup', { orderId: order._id, order }) : onPress?.());
  const glow = useRef(new Animated.Value(0)).current;
  const { lines } = orderLines(order);
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  useEffect(() => {
    if (!ready) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [ready, glow]);
  return (
    <PressableScale onPress={go} scaleTo={0.985} accessibilityLabel={`${meta.title}. Order ${orderRef(order._id)} from ${order.canteen?.name || 'canteen'}. ${ready ? 'Tap to show your pickup code.' : 'Tap to track.'}`}
      style={[styles.active, ready && { backgroundColor: colors.success }, style]}>
      <View style={styles.activeArc} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.activeIcon}>
          {ready ? <Animated.View style={[styles.readyGlow, { opacity: glow }]} /> : null}
          <Feather name={meta.icon} size={20} color={ready ? colors.success : colors.brand} />
        </View>
        <View style={{ flex: 1, marginHorizontal: space.sm }}>
          <Text style={styles.activeEyebrow}>{ready ? 'READY NOW' : 'LIVE ORDER'} · {orderRef(order._id)}</Text>
          <Text style={styles.activeTitle} numberOfLines={1}>{meta.title}</Text>
        </View>
        <View style={styles.activeCta}>
          <Text style={styles.activeCtaText}>{ready ? 'Show code' : 'Track'}</Text>
          <Feather name="chevron-right" size={16} color={colors.ink} />
        </View>
      </View>
      <View style={{ marginTop: space.md }}><OrderProgressBar status={order.status} light /></View>
      <Text style={styles.activeHint} numberOfLines={1}>{order.canteen?.name || 'Your canteen'} · {count} item{count === 1 ? '' : 's'} · {meta.hint}</Text>
      <EstimateLine order={order} tone="onDark" style={{ marginTop: 4 }} />
    </PressableScale>
  );
}

export function OrderCard({ order, onPress, onReorder }) {
  const canteenName = order.canteen?.name || 'Canteen';
  const { lines } = orderLines(order);
  const first = lines[0];
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={`Order ${orderRef(order._id)} from ${canteenName}, ${ORDER_STATUS[order.status]?.label || order.status}, ${formatPrice(order.totalPrice)}`} style={styles.order}>
      <View style={styles.orderTop}>
        <FoodArt name={first?.name || ''} image={first?.image} size={54} rounded={radius.sm} />
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[type.h3, { flex: 1 }]} numberOfLines={1}>{canteenName}</Text>
            <Text style={[type.price, { marginLeft: space.xs }]}>{formatPrice(order.totalPrice)}</Text>
          </View>
          <Text style={type.small} numberOfLines={1}>{formatDate(order.timestamp)} · {orderRef(order._id)}</Text>
          <View style={{ marginTop: 6 }}><StatusBadge status={order.status} size="sm" /></View>
        </View>
      </View>
      <Text style={[type.body, { marginTop: space.sm, color: colors.text }]} numberOfLines={2}>{summarizeOrder(order) || 'Items unavailable'}</Text>
      <View style={styles.orderFooter}>
        <Text style={type.caption}>{count} item{count === 1 ? '' : 's'} · {order.status === 'Cancelled' ? 'Not charged' : order.paymentStatus === 'paid' ? 'Paid at counter' : 'Pay at counter'}</Text>
        {onReorder ? (
          <PressableScale onPress={onReorder} scaleTo={0.94} hitSlop={8} accessibilityLabel={`Order again from ${canteenName}`} style={styles.reorder}>
            <Feather name="repeat" size={14} color={colors.brand} />
            <Text style={[type.smallStrong, { color: colors.brand, marginLeft: 6 }]}>Order again</Text>
          </PressableScale>
        ) : (
          <View style={styles.metaRow}>
            <Text style={[type.smallStrong, { color: colors.brand }]}>Details</Text>
            <Feather name="chevron-right" size={16} color={colors.brand} />
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  dishRow: { flexDirection: 'row', paddingVertical: space.md },
  dishDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dishMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dishMedia: { alignItems: 'center', width: 108, paddingBottom: 14 },
  dishAdd: { position: 'absolute', bottom: 0, alignSelf: 'center', ...shadow.card, borderRadius: radius.pill, backgroundColor: colors.surface },
  soldOut: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.dangerSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tile: { marginRight: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 6, paddingBottom: space.sm, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  tileBadges: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center' },
  markChip: { backgroundColor: '#fff', borderRadius: 6, padding: 3 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
  feature: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.sm, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  canteen: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: space.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  canteenBody: { padding: space.md, paddingTop: space.sm + 2 },
  coverTop: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11.5, fontWeight: '800', color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaStrip: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  meta: { flexDirection: 'row', alignItems: 'center', marginRight: space.lg, flexShrink: 1 },
  cartWrap: { position: 'absolute', left: space.lg, right: space.lg },
  cartBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandDeep, borderRadius: radius.lg, paddingVertical: 11, paddingLeft: 10, paddingRight: 10, ...shadow.raised },
  cartCount: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  cartCountText: { marginLeft: 6, fontWeight: '800', color: colors.ink, fontSize: 15 },
  cartTitle: { color: colors.onBrand, fontWeight: '800', fontSize: 15.5 },
  cartSub: { color: colors.onBrandMuted, fontSize: 12 },
  cartTotal: { color: colors.onBrand, fontWeight: '800', fontSize: 17, marginRight: space.sm },
  cartArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row' },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  active: { backgroundColor: colors.brand, borderRadius: radius.lg, padding: space.md, overflow: 'hidden', ...shadow.raised },
  activeArc: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: colors.brandDeep, right: -80, top: -120, opacity: 0.7 },
  activeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  readyGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 14, backgroundColor: colors.successSoft },
  activeEyebrow: { color: colors.accent, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  activeTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 1 },
  activeCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.pill, paddingLeft: 12, paddingRight: 8, paddingVertical: 7 },
  activeCtaText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  activeHint: { color: colors.onBrandMuted, fontSize: 12.5, marginTop: space.sm },
  order: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  orderTop: { flexDirection: 'row', alignItems: 'flex-start' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  reorder: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandTint, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
});
