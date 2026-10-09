import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Banner } from '../components/ui/feedback';
import { ScreenHeader } from '../components/ui/food';
import { Button, Card, Tag } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { refreshUser, useUser } from '../hooks/useSession';
import { useAppConfig } from '../hooks/useAppConfig';
import { useRealtime } from '../hooks/useRealtime';
import { errorMessage, getCanteen, placeOrder } from '../services/api';
import { emptyCart, selectCartCanteen, selectCartCount, selectCartItems, selectCartTotal } from '../slices/CartSlice';
import { formatPrice } from '../utils/format';
import { BillSummary } from './CartScreen';

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const canteen = useSelector(selectCartCanteen);
  const total = useSelector(selectCartTotal);
  const count = useSelector(selectCartCount);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [liveCanteen, setLiveCanteen] = useState(null);
  const inFlight = useRef(false);
  const config = useAppConfig();
  const user = useUser();

  const loadLive = useCallback(() => {
    if (canteen?._id) getCanteen(canteen._id).then(setLiveCanteen).catch(() => {});
  }, [canteen?._id]);
  useEffect(() => { loadLive(); }, [loadLive]);
  // Prices, availability or canteen status may change while the student is on this screen.
  useRealtime(['menu.updated', 'canteen.updated'], (e) => { if (e.type === 'resync' || e.canteenId === canteen?._id) loadLive(); });

  useEffect(() => {
    if (!items.length && !inFlight.current) navigation.goBack();
  }, [items.length, navigation]);

  if (!canteen) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const suspendedCanteen = liveCanteen?.status === 'suspended';
  const closed = liveCanteen?.openStatus === false || suspendedCanteen;
  const maintenance = !!config.maintenance?.enabled;
  const accountSuspended = user?.status === 'suspended';
  const unavailable = liveCanteen
    ? items.filter(i => !liveCanteen.menu?.find(m => m._id === i._id)?.available).map(i => i.name)
    : [];
  const priceChanged = liveCanteen
    ? items.some(i => { const m = liveCanteen.menu?.find(x => x._id === i._id); return m && m.price !== i.price; })
    : false;
  const blocked = closed || unavailable.length > 0 || maintenance || accountSuspended;

  const submit = async () => {
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setPlacing(true);
    setError('');
    try {
      const itemIds = items.flatMap(i => Array(i.quantity).fill(i._id));
      const order = await placeOrder({ canteenId: canteen._id, itemIds });
      dispatch(emptyCart());
      refreshUser().catch(() => {});
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main', params: { screen: 'Orders' } },
          { name: 'OrderSuccess', params: { order, canteen, estimate: total } },
        ],
      });
    } catch (e) {
      setError(errorMessage(e, 'Your order could not be placed. Nothing was charged.'));
      inFlight.current = false;
      setPlacing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Checkout" subtitle={canteen.name} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 150 }}>
        <Banner message={error} style={{ marginBottom: space.md }} />
        {accountSuspended ? <Banner tone="danger" message="Your account is suspended, so you can’t place orders. Contact support from the Help page." style={{ marginBottom: space.md }} /> : null}
        {maintenance ? <Banner tone="warning" message={config.maintenance.message || 'Ordering is paused for maintenance.'} style={{ marginBottom: space.md }} /> : null}
        {suspendedCanteen ? <Banner tone="danger" message={`${canteen.name} is temporarily unavailable on Campus Rush.`} style={{ marginBottom: space.md }} />
          : closed ? <Banner tone="warning" message={`${canteen.name} isn't taking orders right now.`} style={{ marginBottom: space.md }} /> : null}
        {unavailable.length ? (
          <Banner tone="warning" message={`No longer available: ${unavailable.join(', ')}. Remove them from your cart to continue.`} style={{ marginBottom: space.md }} />
        ) : null}
        {priceChanged ? <Banner tone="info" message="Some menu prices changed since you added them. The canteen's current prices will be charged." style={{ marginBottom: space.md }} /> : null}

        <Text style={styles.section}>PICKUP</Text>
        <Card style={styles.pickup}>
          <View style={styles.pickupIcon}><MaterialCommunityIcons name="storefront-outline" size={22} color={colors.brand} /></View>
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.bodyStrong}>{canteen.name}</Text>
            <Text style={type.small}>{canteen.location}</Text>
            <Text style={[type.small, { marginTop: 4 }]}>Self pickup at the counter. We'll show "Ready" when it's time to collect.</Text>
            {liveCanteen?.pickupInstructions ? <Text style={[type.small, { marginTop: 4, color: colors.text }]}>{liveCanteen.pickupInstructions}</Text> : null}
          </View>
        </Card>

        <Text style={styles.section}>ORDER SUMMARY</Text>
        <Card style={{ marginBottom: space.lg }}>
          {items.map(i => (
            <View key={i._id} style={styles.line}>
              <Text style={styles.qty}>{i.quantity}×</Text>
              <Text style={[type.body, { flex: 1 }]} numberOfLines={2}>{i.name}</Text>
              <Text style={type.bodyStrong}>{formatPrice(i.price * i.quantity)}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.section}>PAYMENT</Text>
        <Card style={{ marginBottom: space.lg, padding: 0 }}>
          <View style={[styles.pay, styles.paySelected]}>
            <Feather name="check-circle" size={20} color={colors.brand} />
            <View style={{ flex: 1, marginLeft: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={[type.bodyStrong, { marginRight: space.xs }]}>Pay at pickup counter</Text>
                <Tag label="Test mode" tone="accent" />
              </View>
              <Text style={type.small}>No online payment is taken. Pay the canteen when you collect your order.</Text>
            </View>
          </View>
          <View style={[styles.pay, { opacity: 0.55 }]}>
            <Feather name="credit-card" size={20} color={colors.faint} />
            <View style={{ flex: 1, marginLeft: space.sm }}>
              <Text style={type.bodyStrong}>UPI / Card</Text>
              <Text style={type.small}>Not set up for Campus Rush yet</Text>
            </View>
          </View>
        </Card>

        <BillSummary total={total} count={count} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button title={placing ? 'Placing order…' : 'Place order'} trailing={placing ? undefined : formatPrice(total)} onPress={submit} loading={placing} disabled={blocked} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...type.overline, marginBottom: space.xs },
  pickup: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg },
  pickupIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  qty: { width: 34, fontWeight: '800', color: colors.brand, fontSize: 15 },
  pay: { flexDirection: 'row', alignItems: 'flex-start', padding: space.md },
  paySelected: { backgroundColor: colors.brandTint, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, ...shadow.raised },
});
