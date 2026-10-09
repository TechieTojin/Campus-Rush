import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ActiveOrderCard, CanteenCard, CartBar, DishTile } from '../components/cards';
import { Announcements, BannerCarousel } from '../components/HomeContent';
import { Banner, EmptyState, ErrorState, Skeleton, StatusBarScrim } from '../components/ui/feedback';
import { SectionHeader } from '../components/ui/food';
import { Avatar, Chip, IconButton, PressableScale } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, radius, shadow, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import useCart from '../hooks/useCart';
import { isOpen, refreshCatalog, useCatalog } from '../hooks/useCatalog';
import { useRealtime } from '../hooks/useRealtime';
import { useRecent } from '../hooks/useRecent';
import { refreshUser, useUser } from '../hooks/useSession';
import { getAnnouncements, getBanners, getMyOrders, isNetworkError } from '../services/api';
import { mergeUser } from '../slices/AuthSlice';
import { selectCartCount } from '../slices/CartSlice';
import { cravings, firstName, formatDate, formatPrice, greeting, orderLines } from '../utils/format';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useUser();
  const cartCount = useSelector(selectCartCount);
  const catalog = useCatalog();
  const recent = useRecent();
  const config = useAppConfig();
  const { reorder } = useCart();
  const [filter, setFilter] = useState('All');
  const [orders, setOrders] = useState(null);
  const [banners, setBanners] = useState([]);
  const [notes, setNotes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Banners and announcements are optional extras; the home screen still works if they fail.
  const loadContent = useCallback(async () => {
    const [b, n] = await Promise.allSettled([getBanners(), getAnnouncements()]);
    if (b.status === 'fulfilled') setBanners(b.value);
    if (n.status === 'fulfilled') setNotes(n.value);
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const list = await getMyOrders();
      setOrders(list);
      dispatch(mergeUser({ orders: list }));
    } catch {
      setOrders((o) => o || []);
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    loadContent();
    loadOrders();
    refreshCatalog();
    refreshUser().catch(() => {});
  }, [loadContent, loadOrders]));

  useRealtime(['order.updated', 'order.created'], loadOrders, { debounceMs: 200 });
  useRealtime(['content.updated', 'announcement.updated'], loadContent);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([catalog.reload(), loadOrders(), loadContent(), refreshUser().catch(() => {})]);
    setRefreshing(false);
  };

  const canteens = catalog.canteens;
  const openCount = canteens.filter(isOpen).length;
  const filters = useMemo(
    () => ['All', 'Open now', ...new Set(canteens.map(c => c.category?.trim()).filter(c => c && c.toLowerCase() !== 'all'))],
    [canteens]
  );
  const visible = useMemo(() => {
    const list = filter === 'All' ? canteens : filter === 'Open now' ? canteens.filter(isOpen) : canteens.filter(c => c.category?.trim() === filter);
    return [...list].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)));
  }, [canteens, filter]);

  const active = useMemo(
    () => (orders || []).filter(o => ACTIVE_STATUSES.includes(o.status)).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [orders]
  );

  // "Order again": the student's most recent collected orders, one per distinct basket.
  const again = useMemo(() => {
    const seen = new Set();
    return (orders || [])
      .filter(o => o.status === 'Completed' && o.canteen?._id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .filter((o) => {
        const key = `${o.canteen._id}:${orderLines(o).lines.map(l => `${l._id}x${l.quantity}`).sort().join(',')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [orders]);

  const showPopular = config.studentApp?.showPopularItems !== false;
  const popular = catalog.popular.filter(p => p.item).slice(0, 10);
  const onMenu = useMemo(() => catalog.allItems.filter(e => e.item.available && isOpen(e.canteen)).slice(0, 10), [catalog.allItems]);
  const dishes = showPopular && popular.length ? popular : onMenu;
  const craving = useMemo(() => cravings(catalog.allItems.filter(e => isOpen(e.canteen))).slice(0, 8), [catalog.allItems]);
  const recentDishes = useMemo(
    () => recent.items.map(r => catalog.findItem(r.itemId)).filter(Boolean).slice(0, 10),
    [recent.items, catalog]
  );
  const featuredIds = (config.studentApp?.featuredCanteens || []).map(String);
  const featured = featuredIds.map(id => canteens.find(c => c._id === id)).filter(Boolean);

  const loading = catalog.status === 'loading' || (catalog.status === 'idle' && !canteens.length);
  const offline = catalog.status === 'error' && isNetworkError(catalog.error);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: cartCount ? 120 : space.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} tintColor={colors.brand} progressViewOffset={insets.top} />}
      >
        <View style={styles.header}>
          <PressableScale onPress={() => navigation.navigate('User')} scaleTo={0.92} accessibilityLabel="Open profile">
            <Avatar name={user?.name} size={46} />
          </PressableScale>
          <View style={{ flex: 1, marginHorizontal: space.sm }}>
            <Text style={type.small}>{greeting()}</Text>
            <Text style={type.h2} numberOfLines={1}>{firstName(user?.name) || 'Hello'} 👋</Text>
          </View>
          <IconButton icon="shopping-bag" badge={cartCount} onPress={() => navigation.navigate('Cart')} accessibilityLabel={`Cart, ${cartCount} items`} />
        </View>

        <View style={styles.headline}>
          <Text style={styles.headlineText}>What's on the menu{'\n'}<Text style={{ color: colors.brand }}>on campus today?</Text></Text>
        </View>

        <PressableScale onPress={() => navigation.navigate('Search', { focus: true })} scaleTo={0.985} accessibilityLabel="Search dishes and canteens" style={styles.search}>
          <Feather name="search" size={19} color={colors.brand} />
          <Text style={[type.body, { color: colors.faint, marginLeft: 10, flex: 1 }]} numberOfLines={1}>Search dosa, biryani, coffee…</Text>
          <View style={styles.searchKbd}><Feather name="sliders" size={15} color={colors.ink} /></View>
        </PressableScale>

        {canteens.length ? (
          <View style={styles.statusStrip} accessibilityLabel={`${openCount} of ${canteens.length} canteens open now`}>
            <View style={[styles.statusDot, { backgroundColor: openCount ? colors.success : colors.faint }]} />
            <Text style={type.smallStrong}>{openCount ? `${openCount} of ${canteens.length} canteens open now` : 'All canteens are closed right now'}</Text>
            <Text style={[type.small, { marginLeft: 6 }]}>· Self pickup</Text>
          </View>
        ) : null}

        {user?.status === 'suspended' ? (
          <Banner tone="danger" title="Account suspended" message={`You can browse and see past orders, but can’t place new ones.${user.statusReason ? ` Reason: ${user.statusReason}.` : ''} Contact support from Profile → Help.`} style={styles.notice} />
        ) : null}
        {config.maintenance?.enabled ? (
          <Banner tone="warning" title="Ordering paused" message={config.maintenance.message || 'Campus Rush is under maintenance. You can still browse menus.'} style={styles.notice} />
        ) : null}
        <Announcements items={notes} />

        {active.length ? (
          <View style={{ paddingHorizontal: space.lg, marginBottom: space.xl }}>
            <ActiveOrderCard order={active[0]} onPress={() => navigation.navigate('OrderDetail', { orderId: active[0]._id })} />
            {active.length > 1 ? (
              <PressableScale onPress={() => navigation.navigate('Orders')} scaleTo={0.97} style={styles.moreActive} accessibilityLabel={`${active.length - 1} more active orders`}>
                <Text style={[type.smallStrong, { color: colors.brand }]}>+{active.length - 1} more active order{active.length > 2 ? 's' : ''}</Text>
                <Feather name="chevron-right" size={15} color={colors.brand} />
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        <BannerCarousel banners={banners} />

        {loading ? (
          <HomeSkeleton />
        ) : catalog.status === 'error' && !canteens.length ? (
          <ErrorState offline={offline} message={offline ? "Can't reach Campus Rush. Check your connection and try again." : 'Something went wrong loading canteens.'} onRetry={catalog.reload} />
        ) : (
          <>
            {craving.length ? (
              <View style={{ marginBottom: space.xl }}>
                <SectionHeader title="What are you craving?" style={{ paddingHorizontal: space.lg }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg }}>
                  {craving.map(c => (
                    <PressableScale key={c.label} onPress={() => navigation.navigate('Search', { craving: c.label })} scaleTo={0.93} style={styles.craving} accessibilityLabel={`${c.label}, ${c.count} dishes`}>
                      <View style={[styles.cravingIcon, { backgroundColor: c.tint }]}>
                        <MaterialCommunityIcons name={c.icon} size={30} color={c.color} />
                      </View>
                      <Text style={styles.cravingText} numberOfLines={2}>{c.label}</Text>
                    </PressableScale>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {again.length ? (
              <View style={{ marginBottom: space.xl }}>
                <SectionHeader title="Order again" subtitle="From your recent pickups" action="History" onAction={() => navigation.navigate('Orders', { tab: 'past' })} style={{ paddingHorizontal: space.lg }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
                  {again.map(o => (
                    <AgainCard
                      key={o._id}
                      order={o}
                      canteen={catalog.canteenById(o.canteen._id)}
                      onReorder={() => reorder(o, catalog.canteenById(o.canteen._id), () => navigation.navigate('Cart'))}
                      onPress={() => navigation.navigate('OrderDetail', { orderId: o._id })}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {dishes.length ? (
              <View style={{ marginBottom: space.xl }}>
                <SectionHeader
                  title={showPopular && popular.length ? 'Popular right now' : 'On the menu today'}
                  subtitle={showPopular && popular.length ? 'Most-ordered dishes on campus' : 'Available at open canteens'}
                  action="See all"
                  onAction={() => navigation.navigate('Discover')}
                  style={{ paddingHorizontal: space.lg }}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
                  {dishes.map(d => <DishTile key={`${d.canteen._id}-${d.item._id}`} item={d.item} canteen={d.canteen} ordered={showPopular && popular.length ? d.ordered : undefined} />)}
                </ScrollView>
              </View>
            ) : null}

            {featured.length ? (
              <View style={{ marginBottom: space.xl }}>
                <SectionHeader title="Featured canteens" style={{ paddingHorizontal: space.lg }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
                  {featured.map(c => <CanteenCard key={`f-${c._id}`} canteen={c} compact />)}
                </ScrollView>
              </View>
            ) : null}

            <View style={{ paddingHorizontal: space.lg }}>
              <SectionHeader title="Campus canteens" subtitle={`${canteens.length} on Campus Rush`} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md, marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
                {filters.map(c => <Chip key={c} label={c} icon={c === 'Open now' ? 'clock' : undefined} active={c === filter} onPress={() => setFilter(c)} />)}
              </ScrollView>
              {visible.length ? (
                visible.map(c => <CanteenCard key={c._id} canteen={c} />)
              ) : (
                <EmptyState icon="coffee" title={filter === 'Open now' ? 'Nothing open right now' : 'No canteens here yet'} message={filter === 'Open now' ? 'Canteens open and close through the day — check back soon or browse menus anyway.' : 'Try another category or pull down to refresh.'} actionLabel="Show all canteens" onAction={() => setFilter('All')} compact />
              )}
            </View>

            {recentDishes.length ? (
              <View style={{ marginTop: space.lg }}>
                <SectionHeader title="Recently viewed" subtitle="Saved on this phone" style={{ paddingHorizontal: space.lg }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
                  {recentDishes.map(d => <DishTile key={`r-${d.item._id}`} item={d.item} canteen={d.canteen} width={150} />)}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <StatusBarScrim />
      <CartBar bottomOffset={space.md} />
    </View>
  );
}

function AgainCard({ order, canteen, onReorder, onPress }) {
  const { lines } = orderLines(order);
  const names = lines.map(l => `${l.quantity}× ${l.name}`).join(', ');
  const open = isOpen(canteen);
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={styles.again} accessibilityLabel={`${order.canteen.name}: ${names}. ${formatPrice(order.totalPrice)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.againIcon}><Feather name="repeat" size={16} color={colors.brand} /></View>
        <View style={{ flex: 1, marginLeft: space.xs }}>
          <Text style={type.bodyStrong} numberOfLines={1}>{order.canteen.name}</Text>
          <Text style={type.caption} numberOfLines={1}>{formatDate(order.timestamp)}</Text>
        </View>
      </View>
      <Text style={[type.small, { color: colors.text, marginTop: space.xs, minHeight: 36 }]} numberOfLines={2}>{names}</Text>
      <View style={styles.againFooter}>
        <Text style={type.price}>{formatPrice(order.totalPrice)}</Text>
        <PressableScale onPress={onReorder} disabled={!open} scaleTo={0.92} hitSlop={8} style={[styles.againBtn, !open && { backgroundColor: colors.surfaceAlt }]} accessibilityLabel={open ? 'Add these items to cart again' : `${order.canteen.name} is closed`}>
          <Text style={[type.smallStrong, { color: open ? colors.onBrand : colors.faint }]}>{open ? 'Reorder' : 'Closed'}</Text>
        </PressableScale>
      </View>
    </PressableScale>
  );
}

function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: space.lg }}>
      <Skeleton width={200} height={22} style={{ marginBottom: space.sm }} />
      <View style={{ flexDirection: 'row', marginBottom: space.xl }}>
        {[0, 1, 2, 3].map(i => <Skeleton key={i} width={72} height={92} radius={radius.md} style={{ marginRight: space.sm }} />)}
      </View>
      <Skeleton width={170} height={22} style={{ marginBottom: space.sm }} />
      <View style={{ flexDirection: 'row', marginBottom: space.xl }}>
        {[0, 1].map(i => <Skeleton key={i} width={168} height={210} radius={radius.lg} style={{ marginRight: space.sm }} />)}
      </View>
      {[0, 1].map(i => <Skeleton key={i} height={226} radius={radius.lg} style={{ marginBottom: space.md }} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.md },
  headline: { paddingHorizontal: space.lg, marginBottom: space.md },
  headlineText: { fontSize: 27, lineHeight: 33, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  search: {
    flexDirection: 'row', alignItems: 'center', height: 54, marginHorizontal: space.lg, paddingLeft: space.md, paddingRight: 7,
    borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  searchKbd: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  statusStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginTop: space.sm, marginBottom: space.lg },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  notice: { marginHorizontal: space.lg, marginBottom: space.md },
  moreActive: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: space.sm },
  craving: { width: 78, alignItems: 'center', marginRight: space.sm },
  cravingIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  cravingText: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
  again: { width: 236, marginRight: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  againIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  againFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  againBtn: { backgroundColor: colors.brand, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
});
