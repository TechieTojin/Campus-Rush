import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { CartBar, DishCard } from '../components/cards';
import { Banner, EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { CanteenCover } from '../components/ui/food';
import { SearchField } from '../components/ui/forms';
import { Chip, IconButton, Tag } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { useFavorite } from '../hooks/useSession';
import { errorMessage, getCanteen } from '../services/api';
import { selectCartCount } from '../slices/CartSlice';
import { openingHours } from '../utils/format';

export default function CanteenScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute();
  const canteenId = params?.canteenId || params?._id;
  const [canteen, setCanteen] = useState(params?.canteen || (params?._id ? params : null));
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [section, setSection] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const cartCount = useSelector(selectCartCount);
  const { isFavorite, toggle, busy } = useFavorite(canteenId);

  const load = useCallback(async () => {
    try {
      const fresh = await getCanteen(canteenId);
      if (fresh) setCanteen(fresh);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [canteenId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Sections follow the order the canteen set on its Categories page; uncategorised items go last.
  const sections = useMemo(() => {
    const order = canteen?.menuCategories || [];
    const used = new Set((canteen?.menu || []).map(m => m?.category).filter(Boolean));
    return order.filter(c => used.has(c));
  }, [canteen]);

  const menu = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = (canteen?.menu || []).filter(m =>
      m && (!onlyAvailable || m.available) && (!section || m.category === section) &&
      (!q || m.name.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))
    );
    if (!sections.length || section) return items;
    const rank = (m) => { const i = sections.indexOf(m.category); return i === -1 ? sections.length : i; };
    const sorted = [...items].sort((a, b) => rank(a) - rank(b));
    const rows = [];
    let current = null;
    sorted.forEach((m) => {
      const title = sections.includes(m.category) ? m.category : 'More items';
      if (title !== current) { rows.push({ header: true, _id: `h-${title}`, title }); current = title; }
      rows.push(m);
    });
    return rows;
  }, [canteen, query, onlyAvailable, section, sections]);

  const closed = canteen?.openStatus === false;
  const total = canteen?.menu?.length || 0;
  const availableCount = canteen?.menu?.filter(m => m?.available).length || 0;

  const header = canteen ? (
    <View>
      <CanteenCover canteen={canteen} height={200 + insets.top} rounded={0}>
        <View style={[styles.topBar, { top: insets.top + space.xs }]}>
          <IconButton icon="arrow-left" tone="glass" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="search" tone="glass" onPress={() => navigation.navigate('Search')} accessibilityLabel="Search all canteens" style={{ marginRight: space.xs }} />
            <IconButton
              icon={<Feather name="heart" size={20} color={isFavorite ? colors.heart : colors.ink} />}
              tone="glass"
              onPress={() => !busy && toggle(canteen.name)}
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            />
          </View>
        </View>
      </CanteenCover>
      <View style={styles.info}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
          <Tag label={closed ? 'Closed' : 'Open now'} tone={closed ? 'danger' : 'success'} icon={closed ? 'x-circle' : 'clock'} />
          {canteen.category ? <View style={{ marginLeft: space.xs }}><Tag label={canteen.category} tone="brand" /></View> : null}
        </View>
        <Text style={type.h1}>{canteen.name}</Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={14} color={colors.muted} />
          <Text style={[type.small, { marginLeft: 6, flex: 1 }]}>{canteen.location}</Text>
        </View>
        {openingHours(canteen) ? (
          <View style={styles.metaRow}>
            <Feather name="clock" size={14} color={colors.muted} />
            <Text style={[type.small, { marginLeft: 6, flex: 1 }]}>Usually open {openingHours(canteen)}</Text>
          </View>
        ) : null}
        {canteen.canteenDescription ? <Text style={[type.body, { marginTop: space.xs, color: colors.muted }]}>{canteen.canteenDescription}</Text> : null}
        {canteen.pickupInstructions ? (
          <View style={[styles.metaRow, { alignItems: 'flex-start', marginTop: space.xs }]}>
            <Feather name="info" size={14} color={colors.brand} style={{ marginTop: 2 }} />
            <Text style={[type.small, { marginLeft: 6, flex: 1, color: colors.text }]}>{canteen.pickupInstructions}</Text>
          </View>
        ) : null}
        <View style={styles.stats}>
          <Stat icon="list" label={`${total} item${total === 1 ? '' : 's'}`} />
          <Stat icon="check-circle" label={`${availableCount} available`} />
          <Stat icon="shopping-bag" label="Self pickup" />
        </View>
      </View>
      <View style={{ paddingHorizontal: space.lg }}>
        {closed ? <Banner tone="warning" message="This canteen isn't taking orders right now. You can still browse the menu." style={{ marginBottom: space.md }} /> : null}
        <Text style={[type.h2, { marginBottom: space.sm }]}>Menu</Text>
        {total > 0 ? (
          <>
            <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${canteen.name}`} style={{ marginBottom: space.sm }} />
            <View style={{ flexDirection: 'row', marginBottom: sections.length ? space.xs : space.md }}>
              <Chip label="All items" active={!onlyAvailable} onPress={() => setOnlyAvailable(false)} />
              <Chip label="Available now" icon="check" active={onlyAvailable} onPress={() => setOnlyAvailable(true)} />
            </View>
            {sections.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginBottom: space.md }} contentContainerStyle={{ paddingHorizontal: space.lg }}>
                <Chip label="All categories" active={!section} onPress={() => setSection('')} />
                {sections.map(s => <Chip key={s} label={s} active={section === s} onPress={() => setSection(section === s ? '' : s)} />)}
              </ScrollView>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  ) : null;

  if (!canteen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {error ? (
          <View style={{ paddingTop: insets.top + space.xxxl }}><ErrorState message={error} onRetry={load} /></View>
        ) : (
          <>
            <Skeleton height={200 + insets.top} radius={0} />
            <View style={{ padding: space.lg }}>
              <Skeleton width={220} height={28} style={{ marginBottom: space.sm }} />
              {[0, 1, 2].map(i => <Skeleton key={i} height={108} radius={radius.lg} style={{ marginTop: space.sm }} />)}
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={menu}
        keyExtractor={m => m._id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          item.header ? (
            <Text style={[type.overline, { paddingHorizontal: space.lg, marginTop: space.sm, marginBottom: space.xs }]} accessibilityRole="header">{item.title}</Text>
          ) : (
            <View style={{ paddingHorizontal: space.lg }}>
              <DishCard item={item} canteen={canteen} closed={closed} />
            </View>
          )
        )}
        ListEmptyComponent={
          total === 0 ? (
            <EmptyState icon="book-open" title="Menu coming soon" message="This canteen hasn't added any items yet." compact />
          ) : (
            <EmptyState icon="search" title="No matching items" message="Try a different search or show all items." compact />
          )
        }
        contentContainerStyle={{ paddingBottom: cartCount ? 120 : space.xxl }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} progressViewOffset={insets.top} />}
      />
      <CartBar style={{ bottom: Math.max(insets.bottom, space.md) }} />
    </View>
  );
}

function Stat({ icon, label }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={14} color={colors.brand} />
      <Text style={[type.caption, { marginLeft: 6, color: colors.text }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  info: {
    marginTop: -28,
    marginHorizontal: space.lg,
    marginBottom: space.lg,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.divider, justifyContent: 'space-between' },
  stat: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
});
