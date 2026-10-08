import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { selectToken } from '../slices/AuthSlice';
import CanteenRow from '../components/CanteenRow';

export default function FavoritesScreen() {
  const [favoriteCanteens, setFavoriteCanteens] = useState([]);
  const token = useSelector(selectToken);

  useEffect(() => {
    if (token?.data?.favoriteCanteens) {
      setFavoriteCanteens(token.data.favoriteCanteens);
    }
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Favorite Canteens</Text>
          <Text style={styles.subtitle}>Find your favorite spots here!</Text>
        </View>

        {/* Favorites Section */}
        {favoriteCanteens && favoriteCanteens.length > 0 ? (
          favoriteCanteens.map((canteen, index) => (
            <View key={index} style={styles.card}>
              <CanteenRow canteen={canteen} />
            </View>
          ))
        ) : (
          // Empty State
          <View style={styles.emptyState}>
            <Image
              source={{
                uri: 'https://img.icons8.com/clouds/100/null/no-data.png',
              }}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>No favorite canteens added yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
  },
});
