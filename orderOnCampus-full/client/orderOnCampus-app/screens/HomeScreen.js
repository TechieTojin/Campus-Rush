import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { CanteenCard, CartBar, PopularDishCard } from '../components/cards';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { SectionHeader } from '../components/ui/food';
import { Chip, IconButton, PressableScale, StatusBadge } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, ORDER_STATUS, radius, shadow, space, type } from '../constants/theme';
import { refreshUser, useUser } from '../hooks/useSession';
import { errorMessage, getAnnouncements, getBanners, getCanteens, getPopularItems } from '../services/api';
import { Announcements, BannerCarousel } from '../components/HomeContent';
import { Banner } from '../components/ui/feedback';
import { useAppConfig } from '../hooks/useAppConfig';
import { useRealtime } from '../hooks/useRealtime';
import { selectCartCount } from '../slices/CartSlice';
import { firstName, greeting, initials, orderRef } from '../utils/format';

export default function HomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const cartCount = useSelector(selectCartCount);
  const [canteens, setCanteens] = useState([]);
  const [popular, setPopular] = useState([]);
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [banners, setBanners] = useState([]);
  const [notes, setNotes] = useState([]);
  const config = useAppConfig();

  // Banners and announcements are optional extras; the home screen still works if they fail.
  const loadContent = useCallback(async () => {
    const [b, n] = await Promise.allSettled([getBanners(), getAnnouncements()]);
    if (b.status === 'fulfilled') setBanners(b.value);
    if (n.status === 'fulfilled') setNotes(n.value);
  }, []);

  const load = useCallback(async () => {
    loadContent();
    try {
      const list = await getCanteens();
      setCanteens(list);
      setStatus('ready');
      const ranked = await Promise.all(
        list.filter(c => c.menu?.length).map(async (c) => {
          try {
            const top = await getPopularItems(c._id);
            return top
              .map(t => ({ item: c.menu.find(m => m.name === t.name), canteen: c, ordered: t.quantity }))
              .filter(p => p.item);
          } catch {
            return [];
          }
        })
      );
      setPopular(ranked.flat().sort((a, b) => b.ordered - a.ordered).slice(0, 8));
    } catch (e) {
      setError(errorMessage(e));
      setStatus(s => (s === 'ready' ? 'ready' : 'error'));
    }
  }, [loadContent]);

  // Live changes from canteens and admins (menus, canteen status, banners, announcements, orders).
  useRealtime(['menu.updated', 'canteen.updated', 'order.updated', 'order.created'], () => { load(); refreshUser().catch(() => {}); }, { debounceMs: 600 });
  useRealtime(['content.updated', 'announcement.updated'], loadContent);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshUser().catch(() => {});
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshUser().catch(() => {})]);
    setRefreshing(false);
  };

  const categories = useMemo(
    () => ['All', ...new Set(canteens.map(c => c.category?.trim()).filter(c => c && c.toLowerCase() !== 'all'))],
    [canteens]
  );
  const visible = category === 'All' ? canteens : canteens.filter(c => c.category?.trim() === category);
  const activeOrder = useMemo(
    () => [...(user?.orders || [])].filter(o => ACTIVE_STATUSES.includes(o?.status)).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0],
    [user]
  );
  const fallbackDishes = useMemo(
    () => canteens.flatMap(c => (c.menu || []).filter(m => m.available).map(item => ({ item, canteen: c }))).slice(0, 8),
    [canteens]
  );
  const dishes = config.studentApp?.showPopularItems === false ? [] : popular.length ? popular : fallbackDishes;
  const featuredIds = (config.studentApp?.featuredCanteens || []).map(String);
  const featured = featuredIds.map(id => canteens.find(c => c._id === id)).filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: cartCount ? 110 : space.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} tintColor={colors.brand} />}
      >
        <View style={styles.header}>
          <PressableScale onPress={() => navigation.navigate('User')} scaleTo={0.92} accessibilityLabel="Open profile" style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user?.name)}</Text>
          </PressableScale>
          <View style={{ flex: 1, marginHorizontal: space.sm }}>
            <Text style={type.small}>{greeting()},</Text>
            <Text style={type.h1} numberOfLines={1}>{firstName(user?.name) || 'there'}</Text>
          </View>
          <IconButton icon="shopping-bag" badge={cartCount} onPress={() => navigation.navigate('Cart')} accessibilityLabel={`Cart, ${cartCount} items`} />
        </View>

        <PressableScale onPress={() => navigation.navigate('Search')} scaleTo={0.985} accessibilityLabel="Search dishes and canteens" style={styles.search}>
          <Feather name="search" size={18} color={colors.muted} />
          <Text style={[type.body, { color: colors.faint, marginLeft: 10, flex: 1 }]}>Search dosa, biryani, coffee…</Text>
        </PressableScale>

        {user?.status === 'suspended' ? (
          <Banner tone="danger" message={`Your account is suspended, so you can’t place new orders.${user.statusReason ? ` Reason: ${user.statusReason}.` : ''} You can still see your past orders. Contact support from your profile’s Help page.`} style={{ marginHorizontal: space.lg, marginBottom: space.md }} />
        ) : null}
        {config.maintenance?.enabled ? (
          <Banner tone="warning" message={config.maintenance.message || 'Campus Rush is under maintenance. Ordering is paused for now — you can still browse menus.'} style={{ marginHorizontal: space.lg, marginBottom: space.md }} />
        ) : null}
        <Announcements items={notes} />
        <BannerCarousel banners={banners} />

        {activeOrder ? (
          <PressableScale
            onPress={() => navigation.navigate('OrderDetail', { orderId: activeOrder._id })}
            scaleTo={0.985}
            accessibilityLabel={`Active order ${orderRef(activeOrder._id)}, ${activeOrder.status}`}
            style={[styles.live, { borderLeftColor: ORDER_STATUS[activeOrder.status].color }]}
          >
            <View style={[styles.liveIcon, { backgroundColor: ORDER_STATUS[activeOrder.status].soft }]}>
              <Feather name={ORDER_STATUS[activeOrder.status].icon} size={20} color={ORDER_STATUS[activeOrder.status].color} />
            </View>
            <View style={{ flex: 1, marginHorizontal: space.sm }}>
              <Text style={type.bodyStrong}>{ORDER_STATUS[activeOrder.status].title}</Text>
              <Text style={type.small} numberOfLines={1}>Order {orderRef(activeOrder._id)} · Tap to track</Text>
            </View>
            <StatusBadge status={activeOrder.status} size="sm" />
          </PressableScale>
        ) : (
          <View style={styles.hero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroOver}>CAMPUS RUSH</Text>
              <Text style={styles.heroTitle}>Skip the queue.</Text>
              <Text style={styles.heroSub}>Order ahead and collect at the counter when it's ready.</Text>
            </View>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={34} color={colors.brand} />
            </View>
          </View>
        )}

        {status === 'loading' ? (
          <View style={{ paddingHorizontal: space.lg }}>
            <Skeleton width={160} height={22} style={{ marginBottom: space.sm }} />
            <View style={{ flexDirection: 'row', marginBottom: space.xl }}>
              {[0, 1, 2].map(i => <Skeleton key={i} width={156} height={190} radius={radius.lg} style={{ marginRight: space.sm }} />)}
            </View>
            {[0, 1].map(i => <Skeleton key={i} height={210} radius={radius.lg} style={{ marginBottom: space.md }} />)}
          </View>
        ) : status === 'error' ? (
          <ErrorState message={error} onRetry={() => { setStatus('loading'); load(); }} />
        ) : (
          <>
            {dishes.length ? (
              <View style={{ marginBottom: space.lg }}>
                <SectionHeader title={popular.length ? 'Popular right now' : 'On the menu today'} style={{ paddingHorizontal: space.lg }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 4 }}>
                  {dishes.map(d => <PopularDishCard key={`${d.canteen._id}-${d.item._id}`} item={d.item} canteen={d.canteen} ordered={d.ordered} />)}
                </ScrollView>
              </View>
            ) : null}

            {featured.length ? (
              <View style={{ marginBottom: space.lg }}>
                <SectionHeader title="Featured canteens" style={{ paddingHorizontal: space.lg }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 4 }}>
                  {featured.map(c => <CanteenCard key={`f-${c._id}`} canteen={c} compact />)}
                </ScrollView>
              </View>
            ) : null}

            <View style={{ paddingHorizontal: space.lg }}>
              <SectionHeader title="Campus canteens" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md, marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
                {categories.map(c => <Chip key={c} label={c} active={c === category} onPress={() => setCategory(c)} />)}
              </ScrollView>
              {visible.length ? (
                visible.map(c => <CanteenCard key={c._id} canteen={c} />)
              ) : (
                <EmptyState icon="coffee" title="No canteens here yet" message="Try another category or pull down to refresh." compact />
              )}
            </View>
          </>
        )}
      </ScrollView>
      <CartBar />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 17, color: colors.ink },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    marginHorizontal: space.lg,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.md,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.lg,
    marginBottom: space.xl,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    overflow: 'hidden',
  },
  heroOver: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 4 },
  heroBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginLeft: space.md, transform: [{ rotate: '8deg' }] },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.lg,
    marginBottom: space.xl,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    ...shadow.card,
  },
  liveIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
