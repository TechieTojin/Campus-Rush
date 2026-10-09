import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { DishTile } from '../components/cards';
import { Banner } from '../components/ui/feedback';
import { CanteenCover, DietMark, FoodArt } from '../components/ui/food';
import { Button, IconButton, PressableScale, Tag } from '../components/ui/primitives';
import { colors, DIETARY, radius, shadow, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import useCart from '../hooks/useCart';
import { isOpen, useCatalog } from '../hooks/useCatalog';
import { recordView } from '../hooks/useRecent';
import { selectItemQuantity } from '../slices/CartSlice';
import { formatPrice } from '../utils/format';

export default function FoodDetailScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { params } = useRoute();
  const catalog = useCatalog();
  const config = useAppConfig();
  // Prefer the live catalogue copy so price/availability are current; fall back to what was tapped.
  const live = catalog.findItem(params.itemId || params.item?._id);
  const item = live?.item || params.item;
  const canteen = live?.canteen || catalog.canteenById(params.canteenId) || params.canteen;
  const inCart = useSelector(selectItemQuantity(item?._id));
  const { add, update, cartCanteen, maxQty } = useCart();
  const [quantity, setQuantity] = useState(inCart || 1);

  useEffect(() => { if (item?._id && canteen?._id) recordView(item._id, canteen._id); }, [item?._id, canteen?._id]);

  const more = useMemo(
    () => (canteen?.menu || []).filter(m => m && m._id !== item?._id && m.available).slice(0, 8),
    [canteen, item?._id]
  );

  if (!item || !canteen) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const closed = !isOpen(canteen) || !!config.maintenance?.enabled;
  const unavailable = !item.available || closed;
  const sameCanteen = !cartCanteen || cartCanteen._id === canteen._id;
  const diet = DIETARY[item.dietary];
  const heroH = Math.min(width * 0.9, 380);

  const confirm = () => {
    if (inCart && sameCanteen) update(item._id, quantity);
    else add(item, canteen, quantity);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <FoodArt name={item.name} image={item.image} size={width} height={heroH + insets.top} rounded={0} dimmed={!item.available} />
        <View style={styles.sheet}>
          <View style={styles.badges}>
            {diet ? <View style={styles.dietChip}><DietMark dietary={item.dietary} size={14} showLabel /></View> : null}
            {item.prepTime ? <Tag label={`About ${item.prepTime} min to prepare`} icon="clock" tone="neutral" style={{ marginLeft: diet ? space.xs : 0 }} /> : null}
          </View>
          <Text style={[type.display, { letterSpacing: 0 }]}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xs }}>
            <Text style={[type.h1, { color: colors.brand }]}>{formatPrice(item.price)}</Text>
            {!item.available ? <Tag label="Not available right now" tone="danger" icon="x" style={{ marginLeft: space.sm }} /> : null}
          </View>
          {item.category ? <Text style={[type.caption, { marginTop: space.xs }]}>{item.category.toUpperCase()}</Text> : null}
          {item.description ? <Text style={[type.body, { marginTop: space.md, color: colors.text, fontSize: 15.5, lineHeight: 23 }]}>{item.description}</Text> : null}

          <PressableScale onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id, canteen })} scaleTo={0.985} style={styles.from} accessibilityLabel={`From ${canteen.name}. Open canteen`}>
            <CanteenCover canteen={canteen} height={48} rounded={radius.sm} style={{ width: 48 }} />
            <View style={{ flex: 1, marginLeft: space.sm }}>
              <Text style={type.bodyStrong} numberOfLines={1}>{canteen.name}</Text>
              <Text style={type.small} numberOfLines={1}>{isOpen(canteen) ? 'Open now' : 'Closed now'} · Pickup at the counter</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.faint} />
          </PressableScale>

          {config.maintenance?.enabled ? <Banner tone="warning" title="Ordering paused" message={config.maintenance.message || 'Ordering is paused for maintenance.'} style={{ marginTop: space.md }} />
            : !isOpen(canteen) ? <Banner tone="warning" message={`${canteen.name} isn't taking orders right now.`} style={{ marginTop: space.md }} /> : null}
          {!sameCanteen && !unavailable ? (
            <Banner tone="info" message={`Your cart has items from ${cartCanteen.name}. Adding this starts a new cart.`} style={{ marginTop: space.md }} />
          ) : null}
        </View>

        {more.length ? (
          <View style={{ marginTop: space.lg }}>
            <Text style={[type.h2, { paddingHorizontal: space.lg, marginBottom: space.sm }]}>More from {canteen.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
              {more.map(m => <DishTile key={m._id} item={m} canteen={canteen} width={150} caption={m.category || undefined} />)}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <IconButton icon="x" tone="glass" onPress={() => navigation.goBack()} accessibilityLabel="Close" style={[styles.close, { top: insets.top + space.xs }]} />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {unavailable ? (
          <Button title={!item.available ? 'Not available right now' : 'Canteen closed'} disabled variant="secondary" style={{ flex: 1 }} />
        ) : (
          <>
            <View style={styles.qty}>
              <IconButton icon="minus" tone="soft" size={42} disabled={quantity <= 1} onPress={() => setQuantity(q => Math.max(1, q - 1))} accessibilityLabel="Decrease quantity" />
              <Text style={styles.qtyText} accessibilityLabel={`Quantity ${quantity}`}>{quantity}</Text>
              <IconButton icon="plus" tone="soft" size={42} disabled={quantity >= maxQty} onPress={() => setQuantity(q => Math.min(maxQty, q + 1))} accessibilityLabel="Increase quantity" />
            </View>
            <Button
              title={inCart && sameCanteen ? 'Update cart' : 'Add to cart'}
              trailing={formatPrice(item.price * quantity)}
              onPress={confirm}
              style={{ flex: 1, marginLeft: space.sm, paddingHorizontal: space.lg }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { marginTop: -28, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingTop: space.lg },
  badges: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm, flexWrap: 'wrap' },
  dietChip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: colors.divider },
  from: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, padding: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  close: { position: 'absolute', right: space.lg },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow.raised,
  },
  qty: { flexDirection: 'row', alignItems: 'center' },
  qtyText: { minWidth: 34, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink },
});
