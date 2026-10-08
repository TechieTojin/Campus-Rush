import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanteenCard } from '../components/cards';
import { EmptyState } from '../components/ui/feedback';
import { colors, space, type } from '../constants/theme';
import { refreshUser, useUser } from '../hooks/useSession';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const favorites = (user?.favoriteCanteens || []).filter(c => c && c._id);

  useFocusEffect(useCallback(() => { refreshUser().catch(() => {}); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser().catch(() => {});
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + space.sm }}>
      <FlatList
        data={favorites}
        keyExtractor={c => c._id}
        renderItem={({ item }) => <CanteenCard canteen={item} />}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ marginBottom: space.md }}>
            <Text style={type.h1}>Favorites</Text>
            <Text style={type.small}>
              {favorites.length ? `${favorites.length} saved canteen${favorites.length === 1 ? '' : 's'} · tap the heart to remove` : 'Your go-to spots, one tap away'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart"
            title="No favorites yet"
            message="Tap the heart on any canteen to save it here for quick ordering."
            actionLabel="Explore canteens"
            onAction={() => navigation.navigate('Home')}
          />
        }
      />
    </View>
  );
}
