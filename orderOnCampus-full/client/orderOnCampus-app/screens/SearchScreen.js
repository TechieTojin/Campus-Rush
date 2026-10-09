import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanteenCard, CartBar, DishRow } from '../components/cards';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { CanteenCover, DietMark } from '../components/ui/food';
import { SearchField } from '../components/ui/forms';
import { Chip, IconButton, PressableScale } from '../components/ui/primitives';
import { BottomSheet, OptionRow, ToggleRow } from '../components/ui/sheet';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { isOpen, useCatalog } from '../hooks/useCatalog';
import { recordSearch, useRecent } from '../hooks/useRecent';
import { isNetworkError } from '../services/api';
import { cravings, matchesCraving } from '../utils/format';

const SORTS = [
  { key: 'relevance', label: 'Relevance', hint: 'Best match first' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'prep', label: 'Quickest to prepare', hint: 'Uses prep times set by canteens' },
];

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { params } = route;
  const isTab = route.name === 'Discover';
  const inputRef = useRef(null);
  const catalog = useCatalog();
  const recent = useRecent();
  // Banners can open search with a preset query (validated text only, set by admins).
  const [query, setQuery] = useState(typeof params?.query === 'string' ? params.query.slice(0, 40) : '');
  const [craving, setCraving] = useState(params?.craving || '');
  const [vegOnly, setVegOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState('relevance');
  const [sheet, setSheet] = useState(false);

  // Re-apply params when navigated to again (e.g. a different craving from Home).
  useEffect(() => {
    if (typeof params?.query === 'string') setQuery(params.query.slice(0, 40));
    if (params?.craving !== undefined) setCraving(params.craving || '');
  }, [params?.query, params?.craving]);
  useEffect(() => {
    if (params?.focus) setTimeout(() => inputRef.current?.focus(), 250);
  }, [params?.focus]);

  const q = query.trim().toLowerCase();
  const filtering = !!(q || craving || vegOnly || availableOnly || openOnly || sort !== 'relevance');
  const filterCount = [vegOnly, availableOnly, openOnly, sort !== 'relevance'].filter(Boolean).length;

  const results = useMemo(() => {
    if (!filtering) return [];
    const score = (name = '') => { const n = name.toLowerCase(); return !q ? 0 : n.startsWith(q) ? 0 : n.split(/\s+/).some(w => w.startsWith(q)) ? 1 : 2; };
    let dishes = catalog.allItems.filter(({ item, canteen }) =>
      (!q || [item.name, item.description, item.category, canteen.name].some(f => f?.toLowerCase().includes(q))) &&
      (!craving || matchesCraving(craving, item.name)) &&
      (!vegOnly || item.dietary === 'veg' || item.dietary === 'vegan') &&
      (!availableOnly || item.available) &&
      (!openOnly || isOpen(canteen))
    );
    dishes = [...dishes].sort((a, b) => {
      if (sort === 'price-asc') return a.item.price - b.item.price;
      if (sort === 'price-desc') return b.item.price - a.item.price;
      if (sort === 'prep') return (a.item.prepTime || 999) - (b.item.prepTime || 999);
      return score(a.item.name) - score(b.item.name) || Number(b.item.available && isOpen(b.canteen)) - Number(a.item.available && isOpen(a.canteen));
    });
    const canteens = !q || craving ? [] : catalog.canteens.filter(c => [c.name, c.location, c.category].some(f => f?.toLowerCase().includes(q)) && (!openOnly || isOpen(c)));
    const rows = [];
    if (dishes.length) rows.push({ type: 'header', key: 'h-d', title: `Dishes · ${dishes.length}` }, ...dishes.map((d, i) => ({ type: 'dish', key: `d-${d.canteen._id}-${d.item._id}`, ...d, last: i === dishes.length - 1 })));
    if (canteens.length) rows.push({ type: 'header', key: 'h-c', title: `Canteens · ${canteens.length}` }, ...canteens.map(c => ({ type: 'canteen', key: `c-${c._id}`, canteen: c })));
    return rows;
  }, [filtering, q, craving, vegOnly, availableOnly, openOnly, sort, catalog.allItems, catalog.canteens]);

  const groups = useMemo(() => cravings(catalog.allItems), [catalog.allItems]);

  const submit = () => { recordSearch(query); Keyboard.dismiss(); };
  const resetFilters = () => { setVegOnly(false); setAvailableOnly(false); setOpenOnly(false); setSort('relevance'); };

  const renderRow = ({ item: row }) => {
    if (row.type === 'header') return <Text style={[type.overline, styles.groupTitle]}>{row.title}</Text>;
    if (row.type === 'dish') {
      return (
        <View style={styles.dishWrap}>
          <Text style={[type.caption, { marginTop: space.sm }]} numberOfLines={1}>{row.canteen.name}{isOpen(row.canteen) ? '' : ' · closed now'}</Text>
          <DishRow item={row.item} canteen={row.canteen} closed={!isOpen(row.canteen)} last />
        </View>
      );
    }
    return <View style={{ paddingHorizontal: space.lg }}><CanteenCard canteen={row.canteen} /></View>;
  };

  const loading = catalog.status === 'loading' || (catalog.status === 'idle' && !catalog.canteens.length);

  const Idle = (
    <View>
      {recent.searches.length ? (
        <View style={{ paddingHorizontal: space.lg, marginBottom: space.lg }}>
          <Text style={[type.overline, { marginBottom: space.xs }]}>Recent searches</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {recent.searches.map(s => (
              <View key={s} style={{ marginBottom: space.xs }}><Chip label={s} icon="clock" onPress={() => { setQuery(s); recordSearch(s); }} /></View>
            ))}
          </View>
        </View>
      ) : null}
      {groups.length ? (
        <View style={{ paddingHorizontal: space.lg }}>
          <Text style={[type.overline, { marginBottom: space.sm }]}>Browse by craving</Text>
          <View style={styles.grid}>
            {groups.map(g => (
              <PressableScale key={g.label} onPress={() => setCraving(g.label)} scaleTo={0.95} style={[styles.gridTile, { backgroundColor: g.tint }]} accessibilityLabel={`${g.label}, ${g.count} dish${g.count === 1 ? '' : 'es'} available`}>
                <MaterialCommunityIcons name={g.icon} size={28} color={g.color} />
                <Text style={[styles.gridLabel, { color: colors.ink }]} numberOfLines={2}>{g.label}</Text>
                <Text style={[type.caption, { color: g.color }]}>{g.count} dish{g.count === 1 ? '' : 'es'}</Text>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : null}
      {catalog.canteens.length ? (
        <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
          <Text style={[type.overline, { marginBottom: space.sm }]}>All canteens</Text>
          {catalog.canteens.map(c => (
            <PressableScale key={c._id} onPress={() => navigation.navigate('Canteen', { canteenId: c._id, canteen: c })} scaleTo={0.985} style={styles.canteenRow} accessibilityLabel={`${c.name}, ${isOpen(c) ? 'open' : 'closed'}`}>
              <CanteenCover canteen={c} height={52} rounded={radius.sm} style={{ width: 52 }} />
              <View style={{ flex: 1, marginLeft: space.sm }}>
                <Text style={type.bodyStrong} numberOfLines={1}>{c.name}</Text>
                <Text style={type.small} numberOfLines={1}>{c.location}</Text>
              </View>
              <View style={[styles.openPill, { backgroundColor: isOpen(c) ? colors.successSoft : colors.surfaceAlt }]}>
                <Text style={[type.caption, { color: isOpen(c) ? colors.success : colors.muted }]}>{isOpen(c) ? 'Open' : 'Closed'}</Text>
              </View>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + space.xs }]}>
        {isTab ? (
          <View style={{ marginBottom: space.sm }}>
            <Text style={type.h1}>Discover</Text>
            <Text style={type.small}>Every dish across campus, in one place</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isTab ? <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={{ marginRight: space.sm }} /> : null}
          <SearchField
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            placeholder="Search dishes or canteens"
            style={{ flex: 1 }}
            onBlur={() => recordSearch(query)}
            onFilter={() => { Keyboard.dismiss(); setSheet(true); }}
            filterActive={filterCount > 0}
          />
        </View>
        <View style={styles.quick}>
          <Chip label="Veg" active={vegOnly} tone="veg" onPress={() => setVegOnly(v => !v)} leading={<View style={{ marginRight: 6 }}><DietMark dietary="veg" size={12} /></View>} />
          <Chip label="Available now" icon="check" active={availableOnly} onPress={() => setAvailableOnly(v => !v)} />
          {craving ? <Chip label={craving} icon="x" active onPress={() => setCraving('')} /> : null}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: space.lg }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} height={96} radius={radius.md} style={{ marginBottom: space.sm }} />)}</View>
      ) : catalog.status === 'error' && !catalog.canteens.length ? (
        <ErrorState offline={isNetworkError(catalog.error)} message="Couldn't load menus. Check your connection and try again." onRetry={catalog.reload} />
      ) : !filtering ? (
        <FlatList data={[]} renderItem={null} ListHeaderComponent={Idle} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 140 }} />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search"
          title={q ? `No matches for “${query.trim()}”` : 'Nothing matches these filters'}
          message="Try a different word, or loosen the filters."
          actionLabel={filterCount || craving ? 'Clear filters' : undefined}
          onAction={() => { resetFilters(); setCraving(''); }}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={r => r.key}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => q && recordSearch(query)}
          contentContainerStyle={{ paddingBottom: 140 }}
        />
      )}
      <CartBar bottomOffset={isTab ? space.md : undefined} />

      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Sort & filter"
        footer={
          <View style={{ flexDirection: 'row' }}>
            <PressableScale onPress={resetFilters} style={[styles.sheetBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: space.sm }]} accessibilityLabel="Reset filters">
              <Text style={type.bodyStrong}>Reset</Text>
            </PressableScale>
            <PressableScale onPress={() => setSheet(false)} style={[styles.sheetBtn, { flex: 1, backgroundColor: colors.brand }]} accessibilityLabel="Show results">
              <Text style={[type.bodyStrong, { color: '#fff' }]}>Show results</Text>
            </PressableScale>
          </View>
        }
      >
        <Text style={[type.overline, { marginTop: space.sm }]}>Sort by</Text>
        {SORTS.map(s => <OptionRow key={s.key} label={s.label} hint={s.hint} selected={sort === s.key} onPress={() => setSort(s.key)} />)}
        <Text style={[type.overline, { marginTop: space.md }]}>Filter</Text>
        <ToggleRow label="Vegetarian only" hint="Items the canteen marked veg or vegan" value={vegOnly} onChange={setVegOnly} leading={<DietMark dietary="veg" size={16} />} />
        <ToggleRow label="Available now" hint="Hide items marked unavailable" value={availableOnly} onChange={setAvailableOnly} leading={<Feather name="check-circle" size={16} color={colors.brand} />} />
        <ToggleRow label="Open canteens only" value={openOnly} onChange={setOpenOnly} leading={<Feather name="clock" size={16} color={colors.brand} />} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.lg, paddingBottom: space.xs, backgroundColor: colors.bg },
  quick: { flexDirection: 'row', marginTop: space.sm, marginBottom: space.xs },
  groupTitle: { paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: 2 },
  dishWrap: { marginHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridTile: { width: '48.5%', borderRadius: radius.lg, padding: space.md, marginBottom: space.sm, minHeight: 112, justifyContent: 'space-between' },
  gridLabel: { fontSize: 14.5, fontWeight: '800', marginTop: space.xs },
  canteenRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm, marginBottom: space.xs, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  openPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  sheetBtn: { height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
});
