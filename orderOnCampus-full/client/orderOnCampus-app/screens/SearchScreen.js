import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CartBar } from '../components/cards';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/feedback';
import { CanteenCover, FoodArt } from '../components/ui/food';
import { SearchField } from '../components/ui/forms';
import { IconButton, PressableScale } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { errorMessage, getCanteens } from '../services/api';
import { formatPrice } from '../utils/format';

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute();
  // Banners can open search with a preset query (validated text only, set by admins).
  const [query, setQuery] = useState(typeof params?.query === 'string' ? params.query.slice(0, 40) : '');
  const [canteens, setCanteens] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    getCanteens().then(setCanteens).catch(e => setError(errorMessage(e)));
  };
  useEffect(load, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !canteens) return [];
    const matchCanteens = canteens
      .filter(c => [c.name, c.location, c.category].some(f => f?.toLowerCase().includes(q)))
      .map(c => ({ type: 'canteen', key: `c-${c._id}`, canteen: c }));
    const matchDishes = canteens.flatMap(c =>
      (c.menu || [])
        .filter(m => [m.name, m.description].some(f => f?.toLowerCase().includes(q)))
        .map(item => ({ type: 'dish', key: `d-${c._id}-${item._id}`, item, canteen: c }))
    );
    const rows = [];
    if (matchDishes.length) rows.push({ type: 'header', key: 'h-d', title: `Dishes (${matchDishes.length})` }, ...matchDishes);
    if (matchCanteens.length) rows.push({ type: 'header', key: 'h-c', title: `Canteens (${matchCanteens.length})` }, ...matchCanteens);
    return rows;
  }, [query, canteens]);

  const renderItem = ({ item: row }) => {
    if (row.type === 'header') return <Text style={[type.overline, { marginTop: space.md, marginBottom: space.xs }]}>{row.title}</Text>;
    if (row.type === 'dish') {
      const { item, canteen } = row;
      return (
        <PressableScale onPress={() => navigation.navigate('FoodDetail', { item, canteen, closed: canteen.openStatus === false })} scaleTo={0.985} style={styles.row}>
          <FoodArt name={item.name} image={item.image} size={56} rounded={radius.sm} dimmed={!item.available} />
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.bodyStrong} numberOfLines={1}>{item.name}</Text>
            <Text style={type.small} numberOfLines={1}>{canteen.name}{item.available ? '' : ' · Unavailable'}</Text>
          </View>
          <Text style={type.price}>{formatPrice(item.price)}</Text>
        </PressableScale>
      );
    }
    const { canteen } = row;
    return (
      <PressableScale onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id, canteen })} scaleTo={0.985} style={styles.row}>
        <CanteenCover canteen={canteen} height={56} rounded={radius.sm} style={{ width: 56 }} />
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <Text style={type.bodyStrong} numberOfLines={1}>{canteen.name}</Text>
          <Text style={type.small} numberOfLines={1}>{canteen.location}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.faint} />
      </PressableScale>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + space.xs }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <SearchField value={query} onChangeText={setQuery} placeholder="Search dishes or canteens" autoFocus style={{ flex: 1, marginLeft: space.sm }} />
      </View>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !canteens ? (
        <View style={{ padding: space.lg }}>{[0, 1, 2].map(i => <Skeleton key={i} height={72} radius={radius.md} style={{ marginBottom: space.sm }} />)}</View>
      ) : !query.trim() ? (
        <EmptyState icon="search" title="What are you craving?" message="Search across every campus canteen by dish, canteen or location." />
      ) : results.length === 0 ? (
        <EmptyState icon="frown" title={`No results for "${query.trim()}"`} message="Check the spelling or try a broader term like “coffee”." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={r => r.key}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 120 }}
        />
      )}
      <CartBar />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm, marginBottom: space.xs, ...shadow.card },
});
