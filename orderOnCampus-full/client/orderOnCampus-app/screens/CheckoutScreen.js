import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Banner } from '../components/ui/feedback';
import { DietMark, ScreenHeader } from '../components/ui/food';
import { Button, Card, Divider } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import { refreshUser, useUser } from '../hooks/useSession';
import { errorMessage, getMyOrders, isNetworkError, placeOrder } from '../services/api';
import { emptyCart, selectCartCanteen, selectCartCount, selectCartItems, selectCartTotal } from '../slices/CartSlice';
import { formatPrice } from '../utils/format';
import { BillSummary, useLiveCartCanteen } from './CartScreen';

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const canteen = useSelector(selectCartCanteen);
  const total = useSelector(selectCartTotal);
  const count = useSelector(selectCartCount);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const config = useAppConfig();
  const user = useUser();
  const live = useLiveCartCanteen();

  useEffect(() => {
    if (!items.length && !inFlight.current) navigation.goBack();
  }, [items.length, navigation]);

  if (!canteen) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const suspendedCanteen = live?.status === 'suspended';
  const closed = live?.openStatus === false || suspendedCanteen;
  const maintenance = !!config.maintenance?.enabled;
  const accountSuspended = user?.status === 'suspended';
  const unavailable = items.filter(i => i.available === false).map(i => i.name);
  const blocked = closed || unavailable.length > 0 || maintenance || accountSuspended;

  const succeed = (order) => {
    dispatch(emptyCart());
    refreshUser().catch(() => {});
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main', params: { screen: 'Orders' } },
        { name: 'OrderSuccess', params: { order, canteen: live || canteen } },
      ],
    });
  };

  const submit = async () => {
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setPlacing(true);
    setError(null);
    const startedAt = Date.now();
    try {
      const itemIds = items.flatMap(i => Array(i.quantity).fill(i._id));
      const order = await placeOrder({ canteenId: canteen._id, itemIds });
      succeed(order);
    } catch (e) {
      // The request may have reached the server before the connection dropped: look before retrying,
      // so a flaky network never turns into a duplicate order.
      if (isNetworkError(e)) {
        try {
          const recent = (await getMyOrders()).find(o =>
            (o.canteen?._id || o.canteen) === canteen._id && o.status === 'Placed' &&
            new Date(o.timestamp).getTime() >= startedAt - 60000 && Number(o.totalPrice) === Number(total));
          if (recent) { succeed(recent); return; }
        } catch { /* still offline */ }
      }
      const code = e?.response?.data?.code;
      setError({
        title: isNetworkError(e) ? "We couldn't reach Campus Rush" : code === 'MAINTENANCE' ? 'Ordering is paused' : code === 'SUSPENDED' ? 'Account suspended' : 'Order not placed',
        message: isNetworkError(e)
          ? 'Your order was not placed and nothing was charged. Check your connection and try again.'
          : errorMessage(e, 'Your order could not be placed. Nothing was charged.'),
      });
      inFlight.current = false;
      setPlacing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Checkout" subtitle={`${count} item${count === 1 ? '' : 's'} · ${canteen.name}`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 160 }}>
        {error ? <Banner tone="danger" title={error.title} message={error.message} style={styles.notice} /> : null}
        {accountSuspended ? <Banner tone="danger" title="Account suspended" message="You can't place orders right now. Contact support from Profile → Help." style={styles.notice} /> : null}
        {maintenance ? <Banner tone="warning" title="Ordering paused" message={config.maintenance.message || 'Ordering is paused for maintenance.'} style={styles.notice} /> : null}
        {suspendedCanteen ? <Banner tone="danger" message={`${canteen.name} is temporarily unavailable on Campus Rush.`} style={styles.notice} />
          : closed ? <Banner tone="warning" message={`${canteen.name} isn't taking orders right now.`} style={styles.notice} /> : null}
        {unavailable.length ? <Banner tone="warning" message={`No longer available: ${unavailable.join(', ')}. Go back to your cart to remove them.`} style={styles.notice} /> : null}

        <Text style={styles.section}>Pickup</Text>
        <Card style={styles.pickup}>
          <View style={styles.pickupIcon}><MaterialCommunityIcons name="storefront-outline" size={22} color={colors.brand} /></View>
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.bodyStrong}>{canteen.name}</Text>
            <Text style={type.small}>{live?.location || canteen.location}</Text>
            <View style={styles.steps}>
              <Step icon="send" text="Place your order" />
              <Step icon="bell" text="We'll show “Ready” when it's done" />
              <Step icon="hash" text="Show your order code at the counter" last />
            </View>
            {live?.pickupInstructions ? (
              <View style={styles.instr}>
                <Feather name="info" size={14} color={colors.brand} style={{ marginTop: 2 }} />
                <Text style={[type.small, { marginLeft: 6, flex: 1, color: colors.text }]}>{live.pickupInstructions}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        <Text style={styles.section}>Your order</Text>
        <Card style={{ marginBottom: space.lg }}>
          {items.map((i, idx) => (
            <View key={i._id}>
              <View style={styles.line}>
                <Text style={styles.qty}>{i.quantity}×</Text>
                <DietMark dietary={i.dietary} size={12} />
                <Text style={[type.body, { flex: 1, marginLeft: i.dietary ? 6 : 0 }, i.available === false && { color: colors.faint, textDecorationLine: 'line-through' }]} numberOfLines={2}>{i.name}</Text>
                <Text style={type.bodyStrong}>{formatPrice(i.price * i.quantity)}</Text>
              </View>
              {idx < items.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>

        <Text style={styles.section}>Payment</Text>
        <Card style={[styles.pay, { marginBottom: space.lg }]}>
          <View style={styles.payIcon}><MaterialCommunityIcons name="cash-register" size={22} color={colors.brand} /></View>
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.bodyStrong}>Pay at the pickup counter</Text>
            <Text style={type.small}>Pay the canteen directly when you collect. Nothing is charged in the app.</Text>
          </View>
          <Feather name="check-circle" size={20} color={colors.brand} />
        </Card>

        <BillSummary total={total} count={count} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button
          title={placing ? 'Placing your order…' : blocked ? 'Unavailable right now' : 'Place order'}
          trailing={placing || blocked ? undefined : formatPrice(total)}
          onPress={submit}
          loading={placing}
          disabled={blocked}
          testID="place-order"
        />
        <Text style={[type.caption, { textAlign: 'center', marginTop: space.xs }]}>By placing the order you agree to collect and pay at {canteen.name}.</Text>
      </View>
    </View>
  );
}

function Step({ icon, text, last }) {
  return (
    <View style={[styles.step, !last && { marginBottom: 6 }]}>
      <View style={styles.stepIcon}><Feather name={icon} size={11} color={colors.brand} /></View>
      <Text style={[type.small, { color: colors.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { marginBottom: space.md },
  section: { ...type.overline, marginBottom: space.xs },
  pickup: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg },
  pickupIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  steps: { marginTop: space.sm },
  step: { flexDirection: 'row', alignItems: 'center' },
  stepIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  instr: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.sm, padding: space.xs, borderRadius: radius.sm, backgroundColor: colors.brandTint },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  qty: { width: 32, fontWeight: '800', color: colors.brand, fontSize: 15 },
  pay: { flexDirection: 'row', alignItems: 'center', borderColor: colors.brand, borderWidth: 1.5, backgroundColor: colors.brandTint },
  payIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow.raised },
});
