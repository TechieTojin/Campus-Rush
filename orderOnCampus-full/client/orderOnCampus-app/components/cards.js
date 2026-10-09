import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { colors, radius, shadow, space, type } from '../constants/theme';
import useCart from '../hooks/useCart';
import { useFavorite } from '../hooks/useSession';
import { useAppConfig } from '../hooks/useAppConfig';
import { selectCartCanteen, selectCartCount, selectCartTotal, selectItemQuantity } from '../slices/CartSlice';
import { formatDate, formatPrice, orderRef, summarizeOrder } from '../utils/format';
import { CanteenCover, FoodArt, QuantityStepper } from './ui/food';
import { IconButton, PressableScale, StatusBadge, Tag } from './ui/primitives';

export function DishCard({ item, canteen, closed }) {
  const navigation = useNavigation();
  const quantity = useSelector(selectItemQuantity(item._id));
  const { add, update } = useCart();
  const unavailable = !item.available || closed;
  return (
    <PressableScale
      onPress={() => navigation.navigate('FoodDetail', { item, canteen, closed })}
      scaleTo={0.985}
      accessibilityLabel={`${item.name}, ${formatPrice(item.price)}${unavailable ? ', unavailable' : ''}`}
      style={styles.dish}
    >
      <FoodArt name={item.name} image={item.image} size={84} dimmed={unavailable} />
      <View style={styles.dishBody}>
        <Text style={type.h3} numberOfLines={2}>{item.name}</Text>
        {item.description ? <Text style={[type.small, { marginTop: 2 }]} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.dishFooter}>
          <View style={{ flexShrink: 1, marginRight: space.xs }}>
            <Text style={type.price}>{formatPrice(item.price)}</Text>
            {!item.available ? <Text style={[type.caption, { color: colors.danger }]}>Unavailable</Text> : null}
          </View>
          <QuantityStepper
            compact
            name={item.name}
            quantity={quantity}
            disabled={unavailable}
            onIncrease={() => (quantity ? update(item._id, quantity + 1) : add(item, canteen))}
            onDecrease={() => update(item._id, quantity - 1)}
          />
        </View>
      </View>
    </PressableScale>
  );
}

export function CanteenCard({ canteen, compact }) {
  const navigation = useNavigation();
  const { isFavorite, toggle, busy } = useFavorite(canteen._id);
  const itemCount = canteen.menu?.length || 0;
  const available = canteen.menu?.filter(m => m?.available).length || 0;
  const open = canteen.openStatus !== false && canteen.status !== 'suspended';
  const favoritesOn = useAppConfig().studentApp?.enableFavorites !== false;
  return (
    <PressableScale
      onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id, canteen })}
      scaleTo={0.985}
      accessibilityLabel={`${canteen.name}, ${canteen.location}, ${open ? 'open' : 'closed'}`}
      style={[styles.canteen, compact && { width: 260, marginRight: space.sm }]}
    >
      <CanteenCover canteen={canteen} height={compact ? 110 : 132} rounded={radius.lg}>
        <View style={styles.coverTop}>
          <Tag label={open ? 'Open now' : 'Closed'} tone={open ? 'success' : 'danger'} icon={open ? 'clock' : 'x-circle'} />
          {favoritesOn ? <IconButton
            icon={<Feather name="heart" size={18} color={isFavorite ? colors.heart : colors.ink} />}
            tone="glass"
            size={36}
            onPress={() => !busy && toggle(canteen.name)}
            accessibilityLabel={isFavorite ? `Remove ${canteen.name} from favorites` : `Save ${canteen.name} to favorites`}
          /> : <View />}
        </View>
      </CanteenCover>
      <View style={{ padding: space.md }}>
        <Text style={type.h3} numberOfLines={1}>{canteen.name}</Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={13} color={colors.muted} />
          <Text style={[type.small, { marginLeft: 4, flex: 1 }]} numberOfLines={1}>{canteen.location}</Text>
        </View>
        <View style={[styles.metaRow, { marginTop: space.xs }]}>
          {canteen.category ? <Tag label={canteen.category} tone="brand" /> : null}
          <Text style={[type.caption, { marginLeft: space.xs }]}>
            {itemCount ? `${available} of ${itemCount} items available` : 'Menu coming soon'}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

export function PopularDishCard({ item, canteen, ordered }) {
  const navigation = useNavigation();
  return (
    <PressableScale
      onPress={() => navigation.navigate('FoodDetail', { item, canteen, closed: canteen.openStatus === false || canteen.status === 'suspended' })}
      scaleTo={0.97}
      accessibilityLabel={`${item.name} from ${canteen.name}, ${formatPrice(item.price)}`}
      style={styles.popular}
    >
      <FoodArt name={item.name} image={item.image} size={128} rounded={radius.md} style={{ width: '100%' }} dimmed={!item.available} />
      <Text style={[type.bodyStrong, { marginTop: space.xs }]} numberOfLines={1}>{item.name}</Text>
      <Text style={type.small} numberOfLines={1}>{canteen.name}</Text>
      <View style={[styles.metaRow, { marginTop: 4, justifyContent: 'space-between' }]}>
        <Text style={type.price}>{formatPrice(item.price)}</Text>
        {ordered ? <Text style={[type.caption, { color: colors.accentDark }]}>{ordered} ordered</Text> : null}
      </View>
    </PressableScale>
  );
}

export function CartBar({ style }) {
  const navigation = useNavigation();
  const count = useSelector(selectCartCount);
  const total = useSelector(selectCartTotal);
  const canteen = useSelector(selectCartCanteen);
  const anim = useRef(new Animated.Value(0)).current;
  const visible = count > 0;

  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [visible, anim]);

  if (!visible) return null;
  return (
    <Animated.View
      style={[styles.cartWrap, style, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}
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
        <Feather name="chevron-right" size={20} color={colors.onBrand} style={{ marginLeft: 4 }} />
      </PressableScale>
    </Animated.View>
  );
}

export function OrderListCard({ order, onPress }) {
  const canteenName = order.canteen?.name || 'Canteen';
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={`Order ${orderRef(order._id)} from ${canteenName}, ${order.status}`} style={styles.order}>
      <View style={styles.orderTop}>
        <FoodArt name={order.lineItems?.[0]?.name || order.items?.[0]?.name || ''} image={order.items?.[0]?.image} size={52} rounded={radius.sm} />
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <Text style={type.h3} numberOfLines={1}>{canteenName}</Text>
          <Text style={type.small} numberOfLines={1}>{orderRef(order._id)} · {formatDate(order.timestamp)}</Text>
        </View>
        <StatusBadge status={order.status} size="sm" />
      </View>
      <Text style={[type.body, { marginTop: space.sm }]} numberOfLines={2}>{summarizeOrder(order) || 'Items unavailable'}</Text>
      <View style={styles.orderFooter}>
        <Text style={type.price}>{formatPrice(order.totalPrice)}</Text>
        <View style={styles.metaRow}>
          <Text style={[type.smallStrong, { color: colors.brand }]}>View details</Text>
          <Feather name="chevron-right" size={16} color={colors.brand} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  dish: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.sm,
    marginBottom: space.sm,
    ...shadow.card,
  },
  dishBody: { flex: 1, marginLeft: space.sm, justifyContent: 'space-between' },
  dishFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
  canteen: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: space.md, overflow: 'hidden', ...shadow.card },
  coverTop: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  popular: { width: 156, marginRight: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xs, paddingBottom: space.sm, ...shadow.card },
  cartWrap: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: space.sm,
    ...shadow.raised,
  },
  cartCount: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  cartCountText: { marginLeft: 6, fontWeight: '800', color: colors.ink, fontSize: 15 },
  cartTitle: { color: colors.onBrand, fontWeight: '800', fontSize: 16 },
  cartSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  cartTotal: { color: colors.onBrand, fontWeight: '800', fontSize: 17 },
  order: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm, ...shadow.card },
  orderTop: { flexDirection: 'row', alignItems: 'center' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.divider },
});
