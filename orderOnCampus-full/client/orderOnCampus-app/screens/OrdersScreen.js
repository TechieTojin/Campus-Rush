import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import OrderCard from '../components/OrderCard';
import { selectToken, setToken } from '../slices/AuthSlice';
import { API_URL } from '../config/api';

export default function OrdersScreen() {
  const user = useSelector(selectToken); // Retrieve token from Redux
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]); // Local state for orders

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No token found in AsyncStorage.');

      const res = await axios.post(`${API_URL}/users/get-user`, { token });
      if (res.data && res.data.data) {
        dispatch(setToken({ data: res.data.data }));
        setOrders(res.data.data.orders || []); // Update orders state
      } else {
        console.error('Unexpected response format:', res.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchOrders();
    const intervalId = setInterval(() => {
      fetchOrders();
    }, 5000); // Refresh orders every 5 seconds

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>My Orders</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3E7A38" style={styles.loader} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You have no orders yet.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {orders
            .slice()
            .reverse()
            .map((order, index) => (
              <OrderCard key={index} data={order} />
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3E7A38',
    marginVertical: 15,
  },
  loader: {
    marginTop: 20,
  },
  scrollView: {
    paddingBottom: wp('20%'),
    paddingHorizontal: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});
