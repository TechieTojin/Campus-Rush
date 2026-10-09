import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/ui/text';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { FoodArt, ScreenHeader } from '../components/ui/food';
import { Button, Card, Divider } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, ORDER_STATUS, PROGRESS_STEPS, radius, space, type } from '../constants/theme';
import useCart from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useRealtime, useRealtimeStatus } from '../hooks/useRealtime';
import { errorMessage, getMyOrders, isNetworkError } from '../services/api';
import { formatDate, formatPrice, formatTime, orderLines, orderRef } from '../utils/format';

// Status changes arrive over the realtime connection; polling is a slow safety net.
const POLL_MS = 30000;

// Timeline from the server's statusHistory; steps not reached yet are shown greyed out.
function Timeline({ order }) {
  const history = order.statusHistory || [];
  const at = (s) => history.find(h => h.status === s)?.at;
  const cancelled = order.status === 'Cancelled';
  const steps = cancelled
    ? [...PROGRESS_STEPS.filter(s => (s === 'Placed' || at(s)) && s !== 'Completed'), 'Cancelled']
    : PROGRESS_STEPS.filter(s => s !== 'Ready' || at('Ready') || ['Placed', 'Processing', 'Ready'].includes(order.status));
  const current = steps.indexOf(order.status);
  return (
    <View>
      {steps.map((step, i) => {
        const meta = ORDER_STATUS[step];
        const done = i <= current;
        const isCurrent = i === current;
        const last = i === steps.length - 1;
        const time = at(step) || (step === 'Placed' ? order.timestamp : null);
        return (
          <View key={step} style={styles.step} accessibilityLabel={`${meta.title}${done ? `, ${time ? `at ${formatTime(time)}` : 'done'}` : ', not yet'}`}>
            <View style={{ alignItems: 'center', width: 30 }}>
              <View style={[styles.stepDot, done && { backgroundColor: meta.color, borderColor: meta.color }, isCurrent && ACTIVE_STATUSES.includes(step) && styles.stepCurrent]}>
                {done ? <Feather name={isCurrent && step !== 'Completed' ? meta.icon : step === 'Cancelled' ? 'x' : 'check'} size={13} color="#fff" /> : null}
              </View>
              {!last ? <View style={[styles.stepLine, i < current && { backgroundColor: ORDER_STATUS[steps[i + 1]].color }]} /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: space.sm, paddingBottom: last ? 0 : space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[type.bodyStrong, { flex: 1 }, !done && { color: colors.faint }]}>{meta.title}</Text>
                {done && time ? <Text style={type.caption}>{formatTime(time)}</Text> : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const catalog = useCatalog();
  const { reorder } = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flash = useRef(new Animated.Value(0)).current;
  const lastStatus = useRef(null);

  const load = useCallback(async () => {
    try {
      const found = (await getMyOrders()).find(o => o._id === params.orderId);
      if (found) setOrder(found);
      else setMissing(true);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [params.orderId]);

  useFocusEffect(useCallback(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]));

  useRealtime('order.updated', (e) => { if (e.type === 'resync' || e.orderId === params.orderId) load(); }, { debounceMs: 100 });
  const liveConnection = useRealtimeStatus() === 'live';

  // Brief highlight when the status changes while the student is watching.
  useEffect(() => {
    if (!order) return;
    if (lastStatus.current && lastStatus.current !== order.status) {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 1200, useNativeDriver: true }).start();
    }
    lastStatus.current = order.status;
  }, [order, flash]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Order details" />
        {missing ? (
          <EmptyState icon="search" title="Order not found" message="This order isn't linked to your account." actionLabel="Go to my orders" onAction={() => navigation.navigate('Main', { screen: 'Orders' })} />
        ) : error ? (
          <ErrorState offline={isNetworkError(error)} message={errorMessage(error)} onRetry={load} />
        ) : (
          <View style={{ padding: space.lg }}>
            <Skeleton height={140} radius={radius.lg} style={{ marginBottom: space.md }} />
            <Skeleton height={240} radius={radius.lg} />
          </View>
        )}
      </View>
    );
  }

  const meta = ORDER_STATUS[order.status];
  const { lines, snapshot } = orderLines(order);
  const lineSum = lines.reduce((s, l) => s + (l.price || 0) * l.quantity, 0);
  const cancelled = order.status === 'Cancelled';
  const active = ACTIVE_STATUSES.includes(order.status);
  const ready = order.status === 'Ready';
  const code = orderRef(order._id).replace('#', '');
  const liveCanteen = order.canteen?._id ? catalog.canteenById(order.canteen._id) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={`Order ${orderRef(order._id)}`} subtitle={formatDate(order.timestamp)} />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
      >
        <View style={[styles.hero, { backgroundColor: meta.soft }]} accessibilityLiveRegion="polite">
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: meta.color, opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }), borderRadius: radius.lg }]} />
          <View style={[styles.heroIcon, { backgroundColor: meta.color }]}>
            <Feather name={meta.icon} size={24} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Text style={[type.h2, { color: meta.color }]}>{meta.title}</Text>
            <Text style={[type.small, { color: colors.text }]}>{meta.hint}</Text>
          </View>
        </View>
        {active ? (
          <View style={styles.live}>
            <View style={[styles.liveDot, { backgroundColor: liveConnection ? colors.success : colors.faint }]} />
            <Text style={type.caption}>{liveConnection ? 'Live — updates the moment the canteen changes it' : 'Reconnecting… pull down to refresh'}</Text>
          </View>
        ) : <View style={{ height: space.md }} />}

        {!cancelled && order.status !== 'Completed' ? (
          <View style={[styles.codeCard, ready && { backgroundColor: colors.success, borderColor: colors.success }]}>
            <Text style={[type.overline, ready && { color: 'rgba(255,255,255,0.8)' }]}>{ready ? 'Show this at the counter' : 'Your pickup code'}</Text>
            <Text style={[styles.code, ready && { color: '#fff' }]} accessibilityLabel={`Pickup code ${code.split('').join(' ')}`}>{code}</Text>
            <Text style={[type.small, ready && { color: 'rgba(255,255,255,0.85)' }, { textAlign: 'center' }]}>
              {ready ? `Your food is waiting at ${order.canteen?.name || 'the canteen'}.` : 'You\'ll need this when you collect.'}
            </Text>
          </View>
        ) : null}

        <Card style={{ marginBottom: space.md }}>
          <Text style={[type.h3, { marginBottom: space.md }]}>{cancelled ? 'What happened' : 'Progress'}</Text>
          <Timeline order={order} />
        </Card>

        <Card style={{ marginBottom: space.md, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={styles.pickupIcon}><MaterialCommunityIcons name="storefront-outline" size={22} color={colors.brand} /></View>
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.caption}>PICKUP FROM</Text>
            <Text style={type.bodyStrong}>{order.canteen?.name || 'Canteen'}</Text>
            {order.canteen?.location ? <Text style={type.small}>{order.canteen.location}</Text> : null}
            {order.canteen?.pickupInstructions ? <Text style={[type.small, { marginTop: 4, color: colors.text }]}>{order.canteen.pickupInstructions}</Text> : null}
            <View style={styles.payRow}>
              <Feather name={cancelled ? 'slash' : order.paymentStatus === 'paid' ? 'check-circle' : 'credit-card'} size={14} color={order.paymentStatus === 'paid' ? colors.success : colors.muted} />
              <Text style={[type.small, { marginLeft: 6, flex: 1 }]}>
                {cancelled ? 'No payment — this order was cancelled.' : order.paymentStatus === 'paid' ? 'Paid at the counter.' : 'Pay at the counter when you collect.'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: space.md }}>
          <Text style={[type.h3, { marginBottom: space.sm }]}>Items</Text>
          {lines.map(l => (
            <View key={l._id} style={styles.line}>
              <FoodArt name={l.name} image={l.image} size={42} rounded={10} />
              <Text style={[type.body, { flex: 1, marginHorizontal: space.sm }]} numberOfLines={2}>
                <Text style={{ fontWeight: '800', color: colors.brand }}>{l.quantity}× </Text>{l.name}
              </Text>
              {l.price != null ? <Text style={type.bodyStrong}>{formatPrice(l.price * l.quantity)}</Text> : null}
            </View>
          ))}
          <Divider style={{ marginVertical: space.sm }} />
          <View style={styles.totalRow}>
            <Text style={type.h3}>Total</Text>
            <Text style={type.h2}>{formatPrice(order.totalPrice)}</Text>
          </View>
          {!snapshot && lineSum && lineSum !== order.totalPrice ? (
            <Text style={[type.small, { marginTop: 4 }]}>Item prices shown are today's menu prices; the total is what was charged at order time.</Text>
          ) : null}
        </Card>

        {order.status === 'Placed' ? (
          <Text style={[type.small, { textAlign: 'center', marginBottom: space.md }]}>Need to change or cancel? Speak to the counter — only canteen staff can cancel an order.</Text>
        ) : null}

        {!active && order.canteen?._id ? (
          <Button title="Order this again" icon="repeat" onPress={() => reorder(order, liveCanteen, () => navigation.navigate('Cart'))} style={{ marginBottom: space.sm }} />
        ) : null}
        <Button title="Get help with this order" icon="help-circle" variant="secondary" onPress={() => navigation.navigate('Help', { orderRef: orderRef(order._id) })} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', padding: space.lg, borderRadius: radius.lg, overflow: 'hidden' },
  heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginVertical: space.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  codeCard: { alignItems: 'center', padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', marginBottom: space.md },
  code: { fontSize: 38, fontWeight: '900', letterSpacing: 6, color: colors.ink, marginVertical: 2 },
  step: { flexDirection: 'row' },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepCurrent: { transform: [{ scale: 1.12 }] },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2, minHeight: 18 },
  pickupIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  payRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
