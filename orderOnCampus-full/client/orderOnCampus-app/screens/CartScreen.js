import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { EmptyState } from '../components/ui/feedback';
import { FoodArt, QuantityStepper, ScreenHeader } from '../components/ui/food';
import { Button, Card, IconButton, PressableScale } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import useCart from '../hooks/useCart';
import { emptyCart, removeItem, selectCartCanteen, selectCartCount, selectCartItems, selectCartTotal } from '../slices/CartSlice';
import { formatPrice } from '../utils/format';

export function BillSummary({ total, count }) {
  return (
    <Card>
      <Text style={[type.h3, { marginBottom: space.sm }]}>Bill details</Text>
      <Row label={`Item total (${count} item${count === 1 ? '' : 's'})`} value={formatPrice(total)} />
      <Row label="Packaging & platform fees" value="None" muted />
      <View style={styles.divider} />
      <Row label="To pay" value={formatPrice(total)} strong />
      <Text style={[type.small, { marginTop: space.xs }]}>Prices are confirmed by the canteen when your order is placed.</Text>
    </Card>
  );
}

function Row({ label, value, strong, muted }) {
  return (
    <View style={styles.row}>
      <Text style={[strong ? type.h3 : type.body, { flex: 1 }]}>{label}</Text>
      <Text style={[strong ? type.h3 : type.bodyStrong, muted && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

export default function CartScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const canteen = useSelector(selectCartCanteen);
  const total = useSelector(selectCartTotal);
  const count = useSelector(selectCartCount);
  const { update } = useCart();

  const clear = () =>
    Alert.alert('Clear cart?', 'This removes all items from your cart.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => dispatch(emptyCart()) },
    ]);

  if (!items.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Your cart" />
        <EmptyState
          icon="shopping-bag"
          title="Your cart is empty"
          message="Browse campus canteens and add something delicious."
          actionLabel="Explore canteens"
          onAction={() => navigation.navigate('Main', { screen: 'Home' })}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title="Your cart"
        subtitle={`${count} item${count === 1 ? '' : 's'}`}
        right={<IconButton icon="trash-2" onPress={clear} accessibilityLabel="Clear cart" color={colors.danger} />}
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 140 }}>
        <PressableScale onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id })} scaleTo={0.985} style={styles.canteen}>
          <View style={styles.canteenIcon}><Feather name="home" size={18} color={colors.brand} /></View>
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.caption}>ORDERING FROM</Text>
            <Text style={type.bodyStrong} numberOfLines={1}>{canteen.name}</Text>
          </View>
          <Text style={[type.smallStrong, { color: colors.brand }]}>+ Add more</Text>
        </PressableScale>

        <Card style={{ paddingVertical: space.xs, marginBottom: space.md }}>
          {items.map((item, idx) => (
            <View key={item._id} style={[styles.item, idx < items.length - 1 && styles.itemBorder]}>
              <FoodArt name={item.name} image={item.image} size={56} rounded={radius.sm} />
              <View style={{ flex: 1, marginHorizontal: space.sm }}>
                <Text style={type.bodyStrong} numberOfLines={2}>{item.name}</Text>
                <Text style={type.small}>{formatPrice(item.price)} each</Text>
                <PressableScale onPress={() => dispatch(removeItem(item._id))} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 2 }} accessibilityLabel={`Remove ${item.name}`}>
                  <Text style={[type.caption, { color: colors.danger }]}>Remove</Text>
                </PressableScale>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <QuantityStepper
                  compact
                  name={item.name}
                  quantity={item.quantity}
                  onIncrease={() => update(item._id, Math.min(20, item.quantity + 1))}
                  onDecrease={() => update(item._id, item.quantity - 1)}
                />
                <Text style={[type.bodyStrong, { marginTop: 6 }]}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}
        </Card>

        <BillSummary total={total} count={count} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button title="Proceed to checkout" trailing={formatPrice(total)} onPress={() => navigation.navigate('Checkout')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canteen: { flexDirection: 'row', alignItems: 'center', padding: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: space.md, ...shadow.card },
  canteenIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: space.xs },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, ...shadow.raised },
});
