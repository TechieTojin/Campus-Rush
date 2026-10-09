import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { mergeUser } from '../slices/AuthSlice';
import { OrderListCard } from '../components/cards';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { PressableScale } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, radius, space, type } from '../constants/theme';
import { errorMessage, getMyOrders } from '../services/api';
import { useRealtime, useRealtimeStatus } from '../hooks/useRealtime';

// Status changes arrive over the realtime connection; polling is a slow safety net.
const POLL_MS = 30000;

export default function OrdersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('active');
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();

  const load = useCallback(async () => {
    try {
      const list = await getMyOrders();
      setOrders(list);
      dispatch(mergeUser({ orders: list }));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, POLL_MS);
      return () => clearInterval(id);
    }, [load])
  );

  useRealtime(['order.created', 'order.updated'], () => load(), { debounceMs: 150 });
  const live = useRealtimeStatus() === 'live';

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const active = (orders || []).filter(o => ACTIVE_STATUSES.includes(o.status));
  const past = (orders || []).filter(o => !ACTIVE_STATUSES.includes(o.status));
  const data = tab === 'active' ? active : past;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={type.h1}>My orders</Text>
        <Text style={[type.small, { marginBottom: space.md }]}>{live ? 'Live — status updates the moment the canteen changes it' : 'Reconnecting… pull down to refresh'}</Text>
        <View style={styles.segment} accessibilityRole="tablist">
          {[
            { key: 'active', label: `Active${orders ? ` (${active.length})` : ''}` },
            { key: 'past', label: `Past${orders ? ` (${past.length})` : ''}` },
          ].map(s => (
            <PressableScale
              key={s.key}
              onPress={() => setTab(s.key)}
              scaleTo={0.97}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === s.key }}
              style={[styles.segmentItem, tab === s.key && styles.segmentActive]}
            >
              <Text style={[type.smallStrong, tab === s.key && { color: colors.ink }]}>{s.label}</Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {!orders && !error ? (
        <View style={{ padding: space.lg }}>{[0, 1, 2].map(i => <Skeleton key={i} height={150} radius={radius.lg} style={{ marginBottom: space.sm }} />)}</View>
      ) : !orders && error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={o => o._id}
          renderItem={({ item }) => <OrderListCard order={item} onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })} />}
          contentContainerStyle={{ padding: space.lg, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
          ListHeaderComponent={error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.sm }]}>Couldn't refresh: {error}</Text> : null}
          ListEmptyComponent={
            tab === 'active' ? (
              <EmptyState
                icon="coffee"
                title="No active orders"
                message="When you place an order, you can track it here in real time."
                actionLabel="Order something"
                onAction={() => navigation.navigate('Home')}
              />
            ) : (
              <EmptyState icon="clock" title="No past orders yet" message="Completed and cancelled orders will appear here." />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surface },
});
