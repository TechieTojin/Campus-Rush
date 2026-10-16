import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { ActiveOrderCard, CanteenCard, CART_BAR_SPACE, CartBar, DishFeature, DishTile } from '../components/cards';
import { Announcements, BannerCarousel } from '../components/HomeContent';
import { BrandBackdrop } from '../components/ui/brand';
import { Banner, EmptyState, ErrorState, Skeleton, StatusBarScrim } from '../components/ui/feedback';
import { SectionHeader } from '../components/ui/food';
import { Avatar, Chip, IconButton, PressableScale } from '../components/ui/primitives';
import { Text } from '../components/ui/text';
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
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef); // tapping the Home tab again returns to the top
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
  const [pastHero, setPastHero] = useState(false);

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

  // Light icons over the evergreen hero, dark once the cream content scrolls under the status bar.
  useFocusEffect(useCallback(() => { setStatusBarStyle(pastHero ? 'dark' : 'light'); }, [pastHero]));

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
  const usingPopular = showPopular && popular.length > 0;
  const dishes = usingPopular ? popular : onMenu;
  const craving = useMemo(() => cravings(catalog.allItems.filter(e => isOpen(e.canteen))).slice(0, 8), [catalog.allItems]);
  const recentDishes = useMemo(() => recent.items.map(r => catalog.findItem(r.itemId)).filter(Boolean).slice(0, 10), [recent.items, catalog]);
  const featuredIds = (config.studentApp?.featuredCanteens || []).map(String);
  const featured = featuredIds.map(id => canteens.find(c => c._id === id)).filter(Boolean);
  const dishCount = catalog.allItems.filter(e => e.item.available && isOpen(e.canteen)).length;

  const loading = catalog.status === 'loading' || (catalog.status === 'idle' && !canteens.length);
  const offline = catalog.status === 'error' && isNetworkError(catalog.error);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: cartCount ? CART_BAR_SPACE : space.xxl }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => { const p = e.nativeEvent.contentOffset.y > 190; if (p !== pastHero) setPastHero(p); }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} tintColor="#fff" progressViewOffset={insets.top + 40} />}
      >
        {/* Hero: one greeting, one headline, search, and live campus status — the first screenful. */}
        <View style={[styles.hero, { paddingTop: insets.top + space.sm }]}>
          <BrandBackdrop />
          <View style={styles.header}>
            <PressableScale onPress={() => navigation.navigate('User')} scaleTo={0.92} accessibilityLabel="Open profile">
              <Avatar name={user?.name} size={42} />
            </PressableScale>
            <View style={{ flex: 1, marginHorizontal: space.sm }}>
              <Text style={styles.hello} numberOfLines={1}>{greeting()}, {firstName(user?.name) || 'there'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="map-pin" size={12} color={colors.accent} />
                <Text style={styles.place} numberOfLines={1}> Pickup on campus</Text>
              </View>
            </View>
            <IconButton icon="shopping-bag" tone="glass" badge={cartCount} onPress={() => navigation.navigate('Cart')} accessibilityLabel={`Cart, ${cartCount} items`} />
          </View>
          <Text style={styles.headline}>What are you{'\n'}<Text style={{ color: colors.accent }}>craving today?</Text></Text>
          <PressableScale onPress={() => navigation.navigate('Search', { focus: true })} scaleTo={0.985} accessibilityLabel="Search dishes and canteens" style={styles.search}>
            <Feather name="search" size={19} color={colors.brand} />
            <Text style={[type.body, { color: colors.faint, marginLeft: 10, flex: 1 }]} numberOfLines={1}>Search dishes or canteens</Text>
            <View style={styles.searchGo}><Feather name="arrow-right" size={16} color="#fff" /></View>
          </PressableScale>
          {canteens.length ? (
            <View style={styles.stats} accessibilityLabel={`${openCount} of ${canteens.length} canteens open now`}>
              <Stat value={`${openCount}/${canteens.length}`} label="canteens open" live={openCount > 0} />
              <View style={styles.statDiv} />
              <Stat value={String(dishCount)} label={dishCount === 1 ? 'dish available' : 'dishes available'} />
              <View style={styles.statDiv} />
              <Stat value="Pickup" label="pay at counter" />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {user?.status === 'suspended' ? (
            <Banner tone="danger" title="Account suspended" message={`You can browse and see past orders, but can’t place new ones.${user.statusReason ? ` Reason: ${user.statusReason}.` : ''} Contact support from Profile → Help.`} style={styles.notice} />
          ) : null}
          {config.maintenance?.enabled ? (
            <Banner tone="warning" title="Ordering paused" message={config.maintenance.message || 'Campus Rush is under maintenance. You can still browse menus.'} style={styles.notice} />
          ) : null}
        </View>
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
                <SectionHeader title="Browse by craving" style={{ paddingHorizontal: space.lg }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg }}>
                  {craving.map(c => (
                    <PressableScale key={c.label} onPress={() => navigation.navigate('Discover', { craving: c.label })} scaleTo={0.93} style={styles.craving} accessibilityLabel={`${c.label}, for example ${c.sample}`}>
                      <View style={[styles.cravingIcon, { backgroundColor: c.tint }]}>
                        <View style={styles.cravingPlate}><MaterialCommunityIcons name={c.icon} size={26} color={c.color} /></View>
                      </View>
                      <Text style={styles.cravingText} numberOfLines={2}>{c.label}</Text>
                    </PressableScale>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {again.length ? (
              <View style={{ marginBottom: space.xl }}>
                <SectionHeader title="Order again" subtitle="Your recent pickups, one tap away" action="History" onAction={() => navigation.navigate('Orders', { tab: 'past' })} style={{ paddingHorizontal: space.lg }} />
                {again.length === 1 ? (
                  <View style={{ paddingHorizontal: space.lg }}>
                    <AgainCard order={again[0]} canteen={catalog.canteenById(again[0].canteen._id)} wide
                      onReorder={() => reorder(again[0], catalog.canteenById(again[0].canteen._id), () => navigation.navigate('Cart'))}
                      onPress={() => navigation.navigate('OrderDetail', { orderId: again[0]._id })} />
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
                    {again.map(o => (
                      <AgainCard key={o._id} order={o} canteen={catalog.canteenById(o.canteen._id)}
                        onReorder={() => reorder(o, catalog.canteenById(o.canteen._id), () => navigation.navigate('Cart'))}
                        onPress={() => navigation.navigate('OrderDetail', { orderId: o._id })} />
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null}

            {dishes.length ? (
              <View style={{ marginBottom: space.xl }}>
                <SectionHeader
                  title={usingPopular ? 'Popular on campus' : 'On the menu today'}
                  subtitle={usingPopular ? 'The dishes students order most' : 'Available at open canteens'}
                  action={dishes.length > 1 ? 'See all' : undefined}
                  onAction={() => navigation.navigate('Discover')}
                  style={{ paddingHorizontal: space.lg }}
                />
                {dishes.length === 1 ? (
                  <View style={{ paddingHorizontal: space.lg }}>
                    <DishFeature item={dishes[0].item} canteen={dishes[0].canteen} ordered={usingPopular ? dishes[0].ordered : undefined} eyebrow={usingPopular ? undefined : 'ON THE MENU'} />
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
                    {dishes.map(d => <DishTile key={`${d.canteen._id}-${d.item._id}`} item={d.item} canteen={d.canteen} ordered={usingPopular ? d.ordered : undefined} />)}
                  </ScrollView>
                )}
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
              <SectionHeader title="Campus canteens" subtitle={`${openCount} open of ${canteens.length}`} />
              {filters.length > 2 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md, marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
                  {filters.map(c => <Chip key={c} label={c} icon={c === 'Open now' ? 'clock' : undefined} active={c === filter} onPress={() => setFilter(c)} />)}
                </ScrollView>
              ) : null}
              {visible.length ? (
                visible.map(c => <CanteenCard key={c._id} canteen={c} />)
              ) : (
                <EmptyState icon="coffee" title={filter === 'Open now' ? 'Nothing open right now' : 'No canteens here yet'} message={filter === 'Open now' ? 'Canteens open and close through the day — browse menus anyway.' : 'Try another category or pull down to refresh.'} actionLabel="Show all canteens" onAction={() => setFilter('All')} compact />
              )}
            </View>

            {recentDishes.length ? (
              <View style={{ marginTop: space.lg }}>
                <SectionHeader title="Recently viewed" subtitle="Saved on this phone" style={{ paddingHorizontal: space.lg }} />
                {recentDishes.length === 1 ? (
                  <View style={{ paddingHorizontal: space.lg }}><DishFeature item={recentDishes[0].item} canteen={recentDishes[0].canteen} eyebrow="YOU LOOKED AT" /></View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
                    {recentDishes.map(d => <DishTile key={`r-${d.item._id}`} item={d.item} canteen={d.canteen} width={150} />)}
                  </ScrollView>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <StatusBarScrim visible={pastHero} />
      <CartBar bottomOffset={space.md} />
    </View>
  );
}

function Stat({ value, label, live }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {live ? <View style={styles.liveDot} /> : null}
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function AgainCard({ order, canteen, onReorder, onPress, wide }) {
  const { lines } = orderLines(order);
  const names = lines.map(l => `${l.quantity}× ${l.name}`).join(', ');
  const open = isOpen(canteen);
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.again, wide && { width: undefined, marginRight: 0 }]} accessibilityLabel={`${order.canteen.name}: ${names}. ${formatPrice(order.totalPrice)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.againIcon}><Feather name="repeat" size={16} color={colors.brand} /></View>
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <Text style={type.bodyStrong} numberOfLines={1}>{order.canteen.name}</Text>
          <Text style={type.caption} numberOfLines={1}>Last ordered {formatDate(order.timestamp)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: space.sm }}>
        <Text style={[type.body, { color: colors.text, flex: 1, marginRight: space.sm }]} numberOfLines={2}>{names}</Text>
        <Text style={type.price}>{formatPrice(order.totalPrice)}</Text>
      </View>
      <PressableScale onPress={onReorder} disabled={!open} scaleTo={0.96} hitSlop={6} style={[styles.againBtn, !open && { backgroundColor: colors.surfaceAlt }]} accessibilityLabel={open ? 'Add these items to cart again' : `${order.canteen.name} is closed`}>
        <Feather name={open ? 'shopping-bag' : 'moon'} size={15} color={open ? '#fff' : colors.faint} />
        <Text style={[type.smallStrong, { color: open ? colors.onBrand : colors.faint, marginLeft: 8 }]}>{open ? 'Add to cart again' : 'Closed right now'}</Text>
      </PressableScale>
    </PressableScale>
  );
}

function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: space.lg }}>
      <Skeleton width={200} height={22} style={{ marginBottom: space.sm }} />
      <View style={{ flexDirection: 'row', marginBottom: space.xl }}>
        {[0, 1, 2, 3].map(i => <Skeleton key={i} width={74} height={96} radius={radius.md} style={{ marginRight: space.sm }} />)}
      </View>
      <Skeleton width={170} height={22} style={{ marginBottom: space.sm }} />
      <View style={{ flexDirection: 'row', marginBottom: space.xl }}>
        {[0, 1].map(i => <Skeleton key={i} width={168} height={210} radius={radius.lg} style={{ marginRight: space.sm }} />)}
      </View>
      {[0, 1].map(i => <Skeleton key={i} height={220} radius={radius.lg} style={{ marginBottom: space.md }} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.lg, paddingBottom: space.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden', marginBottom: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  hello: { color: '#fff', fontSize: 15, fontWeight: '700' },
  place: { color: colors.onBrandMuted, fontSize: 12.5, fontWeight: '600' },
  headline: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -1, marginBottom: space.lg },
  search: { flexDirection: 'row', alignItems: 'center', height: 54, paddingLeft: space.md, paddingRight: 7, borderRadius: radius.pill, backgroundColor: colors.surface, ...shadow.raised },
  searchGo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', marginTop: space.lg, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 4 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statLabel: { color: colors.onBrandMuted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#5BD69A', marginRight: 6 },
  body: { paddingHorizontal: space.lg },
  notice: { marginBottom: space.md },
  moreActive: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: space.sm },
  craving: { width: 80, alignItems: 'center', marginRight: space.sm },
  cravingIcon: { width: 72, height: 72, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  cravingPlate: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cravingText: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
  again: { width: 260, marginRight: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  againIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  againBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand, borderRadius: radius.pill, height: 42, marginTop: space.md },
});
