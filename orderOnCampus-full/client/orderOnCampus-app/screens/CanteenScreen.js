import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { CartBar, DishRow, prepSpan } from '../components/cards';
import { Banner, EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { CanteenCover, DietMark } from '../components/ui/food';
import { SearchField } from '../components/ui/forms';
import { Chip, IconButton, Tag } from '../components/ui/primitives';
import { BottomSheet, OptionRow } from '../components/ui/sheet';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import { useRealtime } from '../hooks/useRealtime';
import { useFavorite } from '../hooks/useSession';
import { errorMessage, getCanteen, isNetworkError } from '../services/api';
import { syncWithMenu } from '../slices/CartSlice';
import { openingHours } from '../utils/format';

const COVER = 230;
const SORTS = [
  { key: 'menu', label: 'Menu order', hint: 'As the canteen arranged it' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'prep', label: 'Quickest to prepare' },
];

export default function CanteenScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { params } = useRoute();
  const canteenId = params?.canteenId || params?._id;
  const [canteen, setCanteen] = useState(params?.canteen?.menu ? params.canteen : null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [section, setSection] = useState('');
  const [sort, setSort] = useState('menu');
  const [sheet, setSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { isFavorite, toggle, busy } = useFavorite(canteenId);
  const config = useAppConfig();
  const favoritesOn = config.studentApp?.enableFavorites !== false;
  const scrollY = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      const fresh = await getCanteen(canteenId);
      if (fresh) {
        setCanteen(fresh);
        dispatch(syncWithMenu({ canteenId, menu: (fresh.menu || []).filter(Boolean) }));
      }
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [canteenId, dispatch]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  // This canteen's menu or profile changed (staff or admin): refetch from the server.
  useRealtime(['menu.updated', 'canteen.updated'], (e) => { if (e.type === 'resync' || e.canteenId === canteenId) load(); });

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Sections follow the order the canteen set on its Categories page; uncategorised items go last.
  const sections = useMemo(() => {
    const order = canteen?.menuCategories || [];
    const used = new Set((canteen?.menu || []).map(m => m?.category).filter(Boolean));
    return order.filter(c => used.has(c));
  }, [canteen]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = (canteen?.menu || []).filter(m =>
      m && (!onlyAvailable || m.available) && (!vegOnly || m.dietary === 'veg' || m.dietary === 'vegan') && (!section || m.category === section) &&
      (!q || m.name.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))
    );
    if (sort !== 'menu') {
      items = [...items].sort((a, b) => (sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : (a.prepTime || 999) - (b.prepTime || 999)));
      return items.map((m, i) => ({ ...m, _last: i === items.length - 1 }));
    }
    if (!sections.length || section) return items.map((m, i) => ({ ...m, _last: i === items.length - 1 }));
    const rank = (m) => { const i = sections.indexOf(m.category); return i === -1 ? sections.length : i; };
    const sorted = [...items].sort((a, b) => rank(a) - rank(b));
    const out = [];
    let current = null;
    sorted.forEach((m, i) => {
      const title = sections.includes(m.category) ? m.category : 'More items';
      if (title !== current) { out.push({ header: true, _id: `h-${title}`, title, count: sorted.filter(x => (sections.includes(x.category) ? x.category : 'More items') === title).length }); current = title; }
      const next = sorted[i + 1];
      const nextTitle = next ? (sections.includes(next.category) ? next.category : 'More items') : null;
      out.push({ ...m, _last: nextTitle !== title });
    });
    return out;
  }, [canteen, query, onlyAvailable, vegOnly, section, sections, sort]);

  // Suspended by Campus Rush, or paused by the canteen: browsable, not orderable (the server enforces both).
  const suspended = canteen?.status === 'suspended';
  const closed = canteen?.openStatus === false || suspended || !!config.maintenance?.enabled;
  const menu = (canteen?.menu || []).filter(Boolean);
  const total = menu.length;
  const availableCount = menu.filter(m => m.available).length;
  const hasVeg = menu.some(m => m.dietary === 'veg' || m.dietary === 'vegan');
  const prep = prepSpan(menu);

  // Light status-bar icons over the cover; dark ones once the solid header slides in.
  const darkBar = useRef(false);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const dark = value > COVER - 90;
      if (dark !== darkBar.current) {
        darkBar.current = dark;
        navigation.setOptions({ statusBarStyle: dark ? 'dark' : 'light' });
      }
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, navigation]);

  const barOpacity = scrollY.interpolate({ inputRange: [COVER - 120, COVER - 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const coverShift = scrollY.interpolate({ inputRange: [-200, 0, COVER], outputRange: [-100, 0, COVER * 0.45], extrapolate: 'clamp' });
  const coverScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.6, 1], extrapolateRight: 'clamp' });

  if (!canteen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {error ? (
          <View style={{ paddingTop: insets.top + space.xxxl }}>
            <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={{ position: 'absolute', top: insets.top + space.xs, left: space.lg }} />
            <ErrorState offline={isNetworkError(error)} message={errorMessage(error)} onRetry={load} />
          </View>
        ) : (
          <>
            <Skeleton height={COVER + insets.top} radius={0} />
            <View style={{ padding: space.lg }}>
              <Skeleton height={150} radius={radius.lg} style={{ marginTop: -50, marginBottom: space.lg }} />
              {[0, 1, 2].map(i => <Skeleton key={i} height={112} radius={radius.lg} style={{ marginBottom: space.sm }} />)}
            </View>
          </>
        )}
      </View>
    );
  }

  const header = (
    <View>
      <Animated.View style={{ height: COVER + insets.top, overflow: 'hidden', transform: [{ translateY: coverShift }, { scale: coverScale }] }}>
        <CanteenCover canteen={canteen} height={COVER + insets.top} rounded={0} dim={0.28} />
      </Animated.View>
      <View style={styles.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
          <Tag label={closed ? (suspended ? 'Unavailable' : 'Closed now') : 'Open now'} tone={closed ? 'danger' : 'success'} icon={closed ? 'moon' : 'clock'} />
          {canteen.category ? <Tag label={canteen.category} tone="brand" style={{ marginLeft: space.xs }} /> : null}
        </View>
        <Text style={type.h1}>{canteen.name}</Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={14} color={colors.muted} />
          <Text style={[type.small, { marginLeft: 6, flex: 1 }]}>{canteen.location}</Text>
        </View>
        {openingHours(canteen) ? (
          <View style={styles.metaRow}>
            <Feather name="sun" size={14} color={colors.muted} />
            <Text style={[type.small, { marginLeft: 6, flex: 1 }]}>Usually open {openingHours(canteen)}</Text>
          </View>
        ) : null}
        {canteen.canteenDescription ? <Text style={[type.body, { marginTop: space.sm, color: colors.muted }]}>{canteen.canteenDescription}</Text> : null}
        <View style={styles.stats}>
          <Stat value={`${availableCount}/${total}`} label="available" />
          <View style={styles.statDivider} />
          <Stat value={prep ? prep.replace(' prep', '') : '—'} label="prep time" />
          <View style={styles.statDivider} />
          <Stat value="Pickup" label="at counter" />
        </View>
        {canteen.pickupInstructions ? (
          <View style={styles.pickup}>
            <Feather name="info" size={15} color={colors.brand} style={{ marginTop: 1 }} />
            <Text style={[type.small, { marginLeft: 8, flex: 1, color: colors.text }]}>{canteen.pickupInstructions}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: space.lg }}>
        {suspended ? <Banner tone="danger" title="Temporarily unavailable" message="This canteen isn't taking orders on Campus Rush right now. You can still browse the menu." style={{ marginBottom: space.md }} />
          : config.maintenance?.enabled ? <Banner tone="warning" title="Ordering paused" message={config.maintenance.message || 'Ordering is paused for maintenance.'} style={{ marginBottom: space.md }} />
          : closed ? <Banner tone="warning" title="Closed right now" message="The canteen isn't taking orders at the moment. Browse the menu and check back soon." style={{ marginBottom: space.md }} /> : null}
      </View>
    </View>
  );

  const toolbar = (
    <View style={styles.toolbar}>
      <Text style={[type.h2, { marginBottom: space.sm }]}>Menu</Text>
      {total > 0 ? (
        <>
          <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${canteen.name}`} onFilter={() => setSheet(true)} filterActive={sort !== 'menu'} style={{ marginBottom: space.sm }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
            {hasVeg ? <Chip label="Veg" tone="veg" active={vegOnly} onPress={() => setVegOnly(v => !v)} leading={<View style={{ marginRight: 6 }}><DietMark dietary="veg" size={12} /></View>} /> : null}
            <Chip label="Available" icon="check" active={onlyAvailable} onPress={() => setOnlyAvailable(v => !v)} />
            {sections.length ? <View style={styles.chipSep} /> : null}
            {sections.length ? <Chip label="All" active={!section} onPress={() => setSection('')} /> : null}
            {sections.map(s => <Chip key={s} label={s} active={section === s} onPress={() => setSection(section === s ? '' : s)} />)}
          </ScrollView>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.FlatList
        data={[{ _id: '__toolbar', toolbar: true }, ...rows]}
        keyExtractor={m => m._id}
        ListHeaderComponent={header}
        stickyHeaderIndices={[1]}
        renderItem={({ item }) => (
          item.toolbar ? toolbar
            : item.header ? (
              <View style={styles.sectionHead}>
                <Text style={type.h3} accessibilityRole="header">{item.title}</Text>
                <Text style={[type.caption, { marginLeft: 6 }]}>{item.count}</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: space.lg }}>
                <DishRow item={item} canteen={canteen} closed={closed} last={item._last} />
              </View>
            )
        )}
        ListEmptyComponent={null}
        ListFooterComponent={
          rows.length ? null : total === 0 ? (
            <EmptyState icon="book-open" title="Menu coming soon" message="This canteen hasn't added any dishes yet." compact />
          ) : (
            <EmptyState icon="search" title="No matching dishes" message="Try a different search or clear the filters." actionLabel="Clear filters" onAction={() => { setQuery(''); setOnlyAvailable(false); setVegOnly(false); setSection(''); }} compact />
          )
        }
        contentContainerStyle={{ paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} progressViewOffset={insets.top + 40} />}
      />

      <Animated.View pointerEvents="none" style={[styles.solidBar, { height: insets.top + 60, opacity: barOpacity }]}>
        <Text style={[type.h3, { marginTop: insets.top + 18, textAlign: 'center', marginHorizontal: 110 }]} numberOfLines={1}>{canteen.name}</Text>
      </Animated.View>
      <View style={[styles.topBar, { top: insets.top + space.xs }]}>
        <IconButton icon="arrow-left" tone="glass" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon="search" tone="glass" onPress={() => navigation.navigate('Search', { focus: true })} accessibilityLabel="Search all canteens" style={{ marginRight: space.xs }} />
          {favoritesOn ? (
            <IconButton
              icon={<MaterialCommunityIcons name={isFavorite ? 'heart' : 'heart-outline'} size={21} color={isFavorite ? colors.heart : colors.ink} />}
              tone="glass"
              onPress={() => !busy && toggle(canteen.name)}
              accessibilityLabel={isFavorite ? 'Remove from saved' : 'Save canteen'}
            />
          ) : null}
        </View>
      </View>

      <CartBar />

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Sort menu">
        {SORTS.map(s => <OptionRow key={s.key} label={s.label} hint={s.hint} selected={sort === s.key} onPress={() => { setSort(s.key); setSheet(false); }} />)}
      </BottomSheet>
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={[type.bodyStrong, { fontSize: 15.5 }]} numberOfLines={1}>{value}</Text>
      <Text style={type.caption} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  solidBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  info: { marginTop: -44, marginHorizontal: space.lg, marginBottom: space.lg, padding: space.lg, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.divider, ...shadow.raised },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  stats: { flexDirection: 'row', marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.divider },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.divider },
  pickup: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.md, padding: space.sm, borderRadius: radius.md, backgroundColor: colors.brandTint },
  toolbar: { backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.sm },
  chipSep: { width: 1, height: 24, backgroundColor: colors.border, alignSelf: 'center', marginRight: space.xs },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: space.lg, marginTop: space.lg },
});
