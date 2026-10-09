import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { ActiveOrderCard, OrderCard } from '../components/cards';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { Segmented } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, radius, space, type } from '../constants/theme';
import useCart from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useRealtime, useRealtimeStatus } from '../hooks/useRealtime';
import { errorMessage, getMyOrders, isNetworkError } from '../services/api';
import { mergeUser } from '../slices/AuthSlice';

// Status changes arrive over the realtime connection; polling is a slow safety net.
const POLL_MS = 30000;

export default function OrdersScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const catalog = useCatalog();
  const { reorder } = useCart();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(params?.tab || 'active');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (params?.tab) setTab(params.tab); }, [params?.tab]);

  const load = useCallback(async () => {
    try {
      const list = await getMyOrders();
      const sorted = [...list].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setOrders(sorted);
      dispatch(mergeUser({ orders: sorted }));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]));

  useRealtime(['order.created', 'order.updated'], () => load(), { debounceMs: 150 });
  const live = useRealtimeStatus() === 'live';

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const active = (orders || []).filter(o => ACTIVE_STATUSES.includes(o.status));
  const past = (orders || []).filter(o => !ACTIVE_STATUSES.includes(o.status));
  const data = tab === 'active' ? active : past;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space.sm }}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={type.h1}>My orders</Text>
        <View style={styles.liveRow} accessibilityLiveRegion="polite">
          <View style={[styles.liveDot, { backgroundColor: live ? colors.success : colors.faint }]} />
          <Text style={type.small}>{live ? 'Live — updates the moment the canteen changes a status' : 'Reconnecting… pull down to refresh'}</Text>
        </View>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'active', label: 'Active', count: orders ? active.length : undefined },
            { key: 'past', label: 'Past', count: orders ? past.length : undefined },
          ]}
          style={{ marginBottom: space.xs }}
        />
      </View>

      {!orders && !error ? (
        <View style={{ padding: space.lg }}>{[0, 1, 2].map(i => <Skeleton key={i} height={150} radius={radius.lg} style={{ marginBottom: space.sm }} />)}</View>
      ) : !orders && error ? (
        <ErrorState offline={isNetworkError(error)} message={errorMessage(error)} onRetry={load} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={o => o._id}
          renderItem={({ item }) => (
            tab === 'active' ? (
              <ActiveOrderCard order={item} onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })} style={{ marginBottom: space.sm }} />
            ) : (
              <OrderCard
                order={item}
                onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
                onReorder={item.canteen?._id ? () => reorder(item, catalog.canteenById(item.canteen._id), () => navigation.navigate('Cart')) : undefined}
              />
            )
          )}
          contentContainerStyle={{ padding: space.lg, paddingTop: space.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
          ListHeaderComponent={error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.sm }]}>Couldn't refresh just now — showing your last loaded orders.</Text> : null}
          ListEmptyComponent={
            tab === 'active' ? (
              <EmptyState
                icon="coffee"
                tone="accent"
                title="Nothing cooking right now"
                message="Place an order and follow it here, live, from the kitchen to the counter."
                actionLabel="Find something to eat"
                onAction={() => navigation.navigate('Home')}
                secondaryLabel={past.length ? 'See past orders' : undefined}
                onSecondary={() => setTab('past')}
              />
            ) : (
              <EmptyState icon="clock" title="No past orders yet" message="Collected and cancelled orders will show up here, ready to order again." />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: space.md },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
});
