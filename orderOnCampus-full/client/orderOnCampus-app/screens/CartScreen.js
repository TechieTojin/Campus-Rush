import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Banner, EmptyState } from '../components/ui/feedback';
import { DietMark, FoodArt, QuantityStepper, ScreenHeader } from '../components/ui/food';
import { animateLayout, Button, Card, Divider, IconButton, PressableScale } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import useCart from '../hooks/useCart';
import { useRealtime } from '../hooks/useRealtime';
import { getCanteen } from '../services/api';
import { emptyCart, selectCartCanteen, selectCartCount, selectCartItems, selectCartTotal, syncWithMenu } from '../slices/CartSlice';
import { formatPrice } from '../utils/format';

export function BillSummary({ total, count, style, excluded }) {
  return (
    <Card style={style}>
      <Text style={[type.h3, { marginBottom: space.sm }]}>Bill details</Text>
      {excluded ? <Text style={[type.small, { color: colors.warning, marginBottom: 4 }]}>Sold-out items aren't included.</Text> : null}
      <Row label={`Item total · ${count} item${count === 1 ? '' : 's'}`} value={formatPrice(total)} />
      <Row label="Packaging & platform fee" value="Free" accent />
      <Divider style={{ marginVertical: space.sm }} />
      <Row label="To pay at the counter" value={formatPrice(total)} strong />
      <Text style={[type.small, { marginTop: space.xs }]}>Prices are confirmed by the canteen when your order is placed.</Text>
    </Card>
  );
}

function Row({ label, value, strong, accent }) {
  return (
    <View style={styles.row}>
      <Text style={[strong ? type.h3 : type.body, { flex: 1 }]}>{label}</Text>
      <Text style={[strong ? type.h2 : type.bodyStrong, accent && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

// Live view of the cart's canteen (status, prices, availability) shared by cart and checkout.
export function useLiveCartCanteen() {
  const dispatch = useDispatch();
  const canteen = useSelector(selectCartCanteen);
  const [live, setLive] = useState(null);
  const load = useCallback(() => {
    if (!canteen?._id) return;
    getCanteen(canteen._id)
      .then((c) => { setLive(c); dispatch(syncWithMenu({ canteenId: canteen._id, menu: (c?.menu || []).filter(Boolean) })); })
      .catch(() => {});
  }, [canteen?._id, dispatch]);
  useFocusEffect(load);
  useRealtime(['menu.updated', 'canteen.updated'], (e) => { if (e.type === 'resync' || e.canteenId === canteen?._id) load(); });
  return live;
}

export default function CartScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const canteen = useSelector(selectCartCanteen);
  const total = useSelector(selectCartTotal);
  const count = useSelector(selectCartCount);
  const config = useAppConfig();
  const { update, remove, maxQty, maxItems } = useCart();
  const live = useLiveCartCanteen();

  const clear = () =>
    Alert.alert('Clear your cart?', 'This removes every item from your cart.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear cart', style: 'destructive', onPress: () => { animateLayout(); dispatch(emptyCart()); } },
    ]);

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Your cart" />
        <EmptyState
          icon="shopping-bag"
          tone="accent"
          title="Your cart is empty"
          message="Find something good at a campus canteen — it'll be ready when you get to the counter."
          actionLabel="Browse dishes"
          onAction={() => navigation.navigate('Main', { screen: 'Discover' })}
          secondaryLabel="Back to home"
          onSecondary={() => navigation.navigate('Main', { screen: 'Home' })}
        />
      </View>
    );
  }

  const unavailable = items.filter(i => i.available === false);
  // The bill only counts what can actually be ordered right now.
  const orderable = items.filter(i => i.available !== false);
  const billTotal = orderable.reduce((t, i) => t + i.price * i.quantity, 0);
  const billCount = orderable.reduce((n, i) => n + i.quantity, 0);
  const closed = live ? live.openStatus === false || live.status === 'suspended' : false;
  const maintenance = !!config.maintenance?.enabled;
  const blocked = unavailable.length > 0 || closed || maintenance;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title="Your cart"
        subtitle={`${count} item${count === 1 ? '' : 's'} · ${canteen.name}`}
        right={<IconButton icon="trash-2" onPress={clear} accessibilityLabel="Clear cart" color={colors.danger} />}
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 150 }}>
        {maintenance ? <Banner tone="warning" title="Ordering paused" message={config.maintenance.message || 'Campus Rush is under maintenance.'} style={styles.notice} /> : null}
        {closed ? <Banner tone="warning" title={`${canteen.name} is closed`} message="You can keep your cart and order once they reopen." style={styles.notice} /> : null}
        {unavailable.length ? (
          <Banner tone="warning" title="Some items just sold out" message={`Remove ${unavailable.map(i => i.name).join(', ')} to continue.`} style={styles.notice} />
        ) : null}

        <PressableScale onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id })} scaleTo={0.985} style={styles.canteen} accessibilityLabel={`Ordering from ${canteen.name}. Add more items`}>
          <View style={styles.canteenIcon}><MaterialCommunityIcons name="storefront-outline" size={20} color={colors.brand} /></View>
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.caption}>PICKUP FROM</Text>
            <Text style={type.bodyStrong} numberOfLines={1}>{canteen.name}</Text>
          </View>
          <View style={styles.addMore}>
            <Feather name="plus" size={14} color={colors.brand} />
            <Text style={[type.smallStrong, { color: colors.brand, marginLeft: 4 }]}>Add more</Text>
          </View>
        </PressableScale>

        <Card style={{ paddingVertical: space.xs, marginBottom: space.md }}>
          {items.map((item, idx) => {
            const out = item.available === false;
            return (
              <View key={item._id} style={[styles.item, idx < items.length - 1 && styles.itemBorder]}>
                <FoodArt name={item.name} image={item.image} size={60} rounded={radius.sm} dimmed={out} />
                <View style={{ flex: 1, marginHorizontal: space.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <DietMark dietary={item.dietary} size={12} />
                    <Text style={[type.bodyStrong, { flex: 1, marginLeft: item.dietary ? 6 : 0 }, out && { color: colors.muted }]} numberOfLines={2}>{item.name}</Text>
                  </View>
                  <Text style={type.small}>{formatPrice(item.price)} each</Text>
                  {out ? (
                    <PressableScale onPress={() => remove(item._id)} hitSlop={8} style={styles.outBtn} accessibilityLabel={`Remove ${item.name}, no longer available`}>
                      <Feather name="x-circle" size={13} color={colors.danger} />
                      <Text style={[type.caption, { color: colors.danger, marginLeft: 4 }]}>Sold out · Remove</Text>
                    </PressableScale>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {out ? null : (
                    <QuantityStepper
                      compact
                      name={item.name}
                      quantity={item.quantity}
                      maxReached={item.quantity >= maxQty || count >= maxItems}
                      onIncrease={() => update(item._id, item.quantity + 1)}
                      onDecrease={() => update(item._id, item.quantity - 1)}
                    />
                  )}
                  <Text style={[type.price, { marginTop: 6 }, out && { color: colors.faint, textDecorationLine: 'line-through' }]}>{formatPrice(item.price * item.quantity)}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <BillSummary total={billTotal} count={billCount} excluded={unavailable.length > 0} style={{ marginBottom: space.md }} />

        <View style={styles.assure}>
          <Feather name="shield" size={16} color={colors.brand} />
          <Text style={[type.small, { marginLeft: 8, flex: 1 }]}>No online payment — you pay the canteen when you collect. Only canteen staff can cancel an order once it's placed.</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button
          title={blocked ? (unavailable.length ? 'Remove sold-out items' : maintenance ? 'Ordering paused' : 'Canteen closed') : 'Continue to checkout'}
          trailing={blocked ? undefined : formatPrice(total)}
          disabled={blocked}
          onPress={() => navigation.navigate('Checkout')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: space.md },
  canteen: { flexDirection: 'row', alignItems: 'center', padding: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: space.md, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  canteenIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  addMore: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandTint, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  outBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  assure: { flexDirection: 'row', alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: colors.brandTint },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow.raised },
});
