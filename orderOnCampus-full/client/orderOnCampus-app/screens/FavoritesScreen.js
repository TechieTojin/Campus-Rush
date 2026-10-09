import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanteenCard, CartBar, DishTile } from '../components/cards';
import { EmptyState, StatusBarScrim } from '../components/ui/feedback';
import { SectionHeader } from '../components/ui/food';
import { colors, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCatalog } from '../hooks/useCatalog';
import { clearRecent, useRecent } from '../hooks/useRecent';
import { refreshUser, useUser } from '../hooks/useSession';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const catalog = useCatalog();
  const recent = useRecent();
  const config = useAppConfig();
  const [refreshing, setRefreshing] = useState(false);
  const favoritesOn = config.studentApp?.enableFavorites !== false;
  // Prefer the live catalogue copy (current menu/status); fall back to the saved snapshot.
  const favorites = (user?.favoriteCanteens || []).filter(c => c && c._id).map(c => catalog.canteenById(c._id) || c);
  const viewed = useMemo(() => recent.items.map(r => catalog.findItem(r.itemId)).filter(Boolean), [recent.items, catalog]);

  useFocusEffect(useCallback(() => { refreshUser().catch(() => {}); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser().catch(() => {}), catalog.reload()]);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: 120, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} progressViewOffset={insets.top} />}
      >
        <View style={{ paddingHorizontal: space.lg, marginBottom: space.lg }}>
          <Text style={type.h1}>Saved</Text>
          <Text style={type.small}>Your go-to canteens and the dishes you've looked at</Text>
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <SectionHeader title="Favourite canteens" subtitle={favorites.length ? `${favorites.length} saved · tap the heart to remove` : undefined} />
          {!favoritesOn ? (
            <Text style={[type.small, styles.box]}>Favourites are turned off by Campus Rush right now.</Text>
          ) : favorites.length ? (
            favorites.map(c => <CanteenCard key={c._id} canteen={c} />)
          ) : (
            <EmptyState
              icon="heart"
              tone="heart"
              compact
              title="No favourites yet"
              message="Tap the heart on any canteen to keep it one tap away."
              actionLabel="Explore canteens"
              onAction={() => navigation.navigate('Home')}
            />
          )}
        </View>

        {viewed.length ? (
          <View style={{ marginTop: space.lg }}>
            <SectionHeader title="Recently viewed" subtitle="Stored on this phone only" action="Clear" onAction={clearRecent} style={{ paddingHorizontal: space.lg }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
              {viewed.map(d => <DishTile key={d.item._id} item={d.item} canteen={d.canteen} width={156} />)}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
      <StatusBarScrim />
      <CartBar bottomOffset={space.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: space.md, backgroundColor: colors.surfaceAlt, borderRadius: 12 },
});
