import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { FoodArt, ScreenHeader } from '../components/ui/food';
import { Button, Card, StatusBadge } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, ORDER_STATUS, PROGRESS_STEPS, radius, space, type } from '../constants/theme';
import { errorMessage, getMyOrders } from '../services/api';
import { formatDate, formatPrice, orderLines, orderRef } from '../utils/format';

const POLL_MS = 6000;

function Progress({ status }) {
  const current = PROGRESS_STEPS.indexOf(status);
  return (
    <View>
      {PROGRESS_STEPS.map((step, i) => {
        const meta = ORDER_STATUS[step];
        const done = i <= current;
        const isCurrent = i === current;
        const last = i === PROGRESS_STEPS.length - 1;
        return (
          <View key={step} style={styles.step} accessibilityLabel={`${meta.title}${done ? ', done' : ''}`}>
            <View style={{ alignItems: 'center', width: 32 }}>
              <View style={[styles.stepDot, done && { backgroundColor: meta.color, borderColor: meta.color }, isCurrent && styles.stepCurrent]}>
                {done ? <Feather name={isCurrent && step !== 'Completed' ? meta.icon : 'check'} size={14} color="#fff" /> : null}
              </View>
              {!last ? <View style={[styles.stepLine, i < current && { backgroundColor: ORDER_STATUS[PROGRESS_STEPS[i + 1]].color }]} /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: space.sm, paddingBottom: last ? 0 : space.md }}>
              <Text style={[type.bodyStrong, !done && { color: colors.faint }]}>{meta.title}</Text>
              {isCurrent ? <Text style={type.small}>{meta.hint}</Text> : null}
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
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const found = (await getMyOrders()).find(o => o._id === params.orderId);
      if (found) setOrder(found);
      else setMissing(true);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [params.orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, POLL_MS);
      return () => clearInterval(id);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Order details" />
        {missing ? (
          <EmptyState icon="search" title="Order not found" message="This order isn't linked to your account." />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <View style={{ padding: space.lg }}>
            <Skeleton height={120} radius={radius.lg} style={{ marginBottom: space.md }} />
            <Skeleton height={220} radius={radius.lg} />
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={`Order ${orderRef(order._id)}`} subtitle={formatDate(order.timestamp)} />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
      >
        <View style={[styles.hero, { backgroundColor: meta.soft }]}>
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
            <View style={styles.liveDot} />
            <Text style={type.caption}>Live — refreshes every few seconds</Text>
          </View>
        ) : null}

        {!cancelled ? (
          <Card style={{ marginBottom: space.md }}>
            <Text style={[type.h3, { marginBottom: space.md }]}>Progress</Text>
            <Progress status={order.status} />
          </Card>
        ) : null}

        <Card style={{ marginBottom: space.md, flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={styles.pickupIcon}><MaterialCommunityIcons name="storefront-outline" size={22} color={colors.brand} /></View>
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.caption}>PICKUP FROM</Text>
            <Text style={type.bodyStrong}>{order.canteen?.name || 'Canteen'}</Text>
            {order.canteen?.location ? <Text style={type.small}>{order.canteen.location}</Text> : null}
            {order.canteen?.pickupInstructions ? <Text style={[type.small, { marginTop: 4, color: colors.text }]}>{order.canteen.pickupInstructions}</Text> : null}
            <Text style={[type.small, { marginTop: 4 }]}>
              Payment: {order.status === 'Cancelled' ? 'none — this order was cancelled.' : order.paymentStatus === 'paid' ? 'paid at the counter.' : 'pay at the counter when collecting.'}
            </Text>
          </View>
        </Card>

        <Card style={{ marginBottom: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}>
            <Text style={type.h3}>Items</Text>
            <StatusBadge status={order.status} size="sm" />
          </View>
          {lines.map(l => (
            <View key={l._id} style={styles.line}>
              <FoodArt name={l.name} image={l.image} size={40} rounded={10} />
              <Text style={[type.body, { flex: 1, marginHorizontal: space.sm }]} numberOfLines={2}>
                <Text style={{ fontWeight: '800', color: colors.brand }}>{l.quantity}× </Text>{l.name}
              </Text>
              {l.price != null ? <Text style={type.bodyStrong}>{formatPrice(l.price * l.quantity)}</Text> : null}
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={type.h3}>Total</Text>
            <Text style={type.h2}>{formatPrice(order.totalPrice)}</Text>
          </View>
          {!snapshot && lineSum && lineSum !== order.totalPrice ? (
            <Text style={[type.small, { marginTop: 4 }]}>Item prices shown are today's menu prices; the total is what was charged at order time.</Text>
          ) : null}
        </Card>

        {order.status === 'Placed' ? (
          <Text style={[type.small, { textAlign: 'center', marginBottom: space.md }]}>Need to change or cancel? Speak to the canteen counter — only canteen staff can cancel orders.</Text>
        ) : null}

        <Button title="Back to my orders" variant="secondary" onPress={() => navigation.navigate('Main', { screen: 'Orders' })} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', padding: space.lg, borderRadius: radius.lg, marginBottom: space.xs },
  heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginBottom: space.md, marginTop: space.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginRight: 6 },
  step: { flexDirection: 'row' },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepCurrent: { transform: [{ scale: 1.1 }] },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2, minHeight: 16 },
  pickupIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: space.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
