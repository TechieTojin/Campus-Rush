import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Icon from 'react-native-feather';
import { API_URL } from '../config/api';

export default function OrderItems({ food }) {
  const [itemName, setItemName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItemData = async () => {
    try {
      const response = await axios.get(`${API_URL}/canteens/${food.id}/get-item`);
      setItemName(response.data.data.name);
    } catch (err) {
      console.error('Error fetching item data:', err);
      setError('Failed to load item data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemData();
  }, [food.id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.itemContainer}>
      <View style={styles.itemRow}>
        <Icon.Coffee stroke="rgb(20 83 45)" width={24} height={24} />
        <Text style={styles.itemCount}>{food.count}X</Text>
        <Text style={styles.itemName}>{itemName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'gray',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
  },
  itemContainer: {
    backgroundColor: '#E5E7EB',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCount: {
    paddingLeft: 10,
    fontWeight: 'bold',
    fontSize: 18,
    color: '#16A34A',
  },
  itemName: {
    fontSize: 18,
    color: '#16A34A',
  },
});
