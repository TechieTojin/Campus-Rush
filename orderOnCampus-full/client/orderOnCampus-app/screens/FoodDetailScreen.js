import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Banner } from '../components/ui/feedback';
import { FoodArt } from '../components/ui/food';
import { Button, IconButton, PressableScale, Tag } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import useCart from '../hooks/useCart';
import { selectItemQuantity } from '../slices/CartSlice';
import { formatPrice } from '../utils/format';

export default function FoodDetailScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute();
  const { item, canteen, closed } = params;
  const inCart = useSelector(selectItemQuantity(item._id));
  const [quantity, setQuantity] = useState(inCart || 1);
  const { add, update, cartCanteen } = useCart();
  const unavailable = !item.available || closed;
  const sameCanteen = !cartCanteen || cartCanteen._id === canteen._id;

  const confirm = () => {
    if (inCart && sameCanteen) update(item._id, quantity);
    else add(item, canteen, quantity);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={[styles.hero, { paddingTop: insets.top + space.xxxl }]}>
          <FoodArt name={item.name} image={item.image} size={200} rounded={100} dimmed={unavailable} />
          <IconButton icon="x" tone="glass" onPress={() => navigation.goBack()} accessibilityLabel="Close" style={[styles.close, { top: insets.top + space.xs }]} />
        </View>
        <View style={styles.body}>
          <View style={{ flexDirection: 'row', marginBottom: space.sm }}>
            <Tag label={item.available ? 'Available' : 'Unavailable'} tone={item.available ? 'success' : 'danger'} icon={item.available ? 'check' : 'x'} />
          </View>
          <Text style={type.display}>{item.name}</Text>
          <Text style={[type.h2, { color: colors.brand, marginTop: space.xs }]}>{formatPrice(item.price)}</Text>
          {item.description ? <Text style={[type.body, { marginTop: space.md, color: colors.muted }]}>{item.description}</Text> : null}

          <PressableScale onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id, canteen })} scaleTo={0.985} style={styles.from}>
            <Feather name="map-pin" size={16} color={colors.brand} />
            <View style={{ flex: 1, marginLeft: space.sm }}>
              <Text style={type.caption}>FROM</Text>
              <Text style={type.bodyStrong} numberOfLines={1}>{canteen.name}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.faint} />
          </PressableScale>

          {closed ? <Banner tone="warning" message="This canteen isn't taking orders right now." style={{ marginTop: space.md }} /> : null}
          {!sameCanteen && !unavailable ? (
            <Banner tone="info" message={`Your cart has items from ${cartCanteen.name}. Adding this will start a new cart.`} style={{ marginTop: space.md }} />
          ) : null}
        </View>
      </ScrollView>

      {!unavailable ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <View style={styles.qty}>
            <IconButton icon="minus" tone="soft" size={40} onPress={() => setQuantity(q => Math.max(1, q - 1))} accessibilityLabel="Decrease quantity" />
            <Text style={styles.qtyText} accessibilityLabel={`Quantity ${quantity}`}>{quantity}</Text>
            <IconButton icon="plus" tone="soft" size={40} onPress={() => setQuantity(q => Math.min(20, q + 1))} accessibilityLabel="Increase quantity" />
          </View>
          <Button
            title={inCart && sameCanteen ? 'Update cart' : 'Add to cart'}
            trailing={formatPrice(item.price * quantity)}
            onPress={confirm}
            style={{ flex: 1, marginLeft: space.sm, paddingHorizontal: space.lg }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: space.xxl, backgroundColor: colors.surfaceMuted, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  close: { position: 'absolute', right: space.lg },
  body: { padding: space.lg },
  from: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, padding: space.md, backgroundColor: colors.surface, borderRadius: radius.md, ...shadow.card },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow.raised,
  },
  qty: { flexDirection: 'row', alignItems: 'center' },
  qtyText: { minWidth: 34, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink },
});
