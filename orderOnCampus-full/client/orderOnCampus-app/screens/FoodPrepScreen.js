import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { selectCanteen } from '../slices/canteenSlice';
import { emptyCart, selectCartItems } from '../slices/CartSlice';
import { API_URL } from '../config/api';

export default function FoodPrepScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const canteen = useSelector(selectCanteen);
  const items = useSelector(selectCartItems);

  const itemIds = items.map(item => item._id);

  const postData = async () => {
    const jwtToken = await AsyncStorage.getItem('token');
    const orderData = {
      canteen: canteen._id,
      items: itemIds,
    };
    try {
      await axios.post(`${API_URL}/users/place-order`, orderData, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
    } catch (err) {
      console.log("Order placement failed:", err);
    }
  };

  useEffect(() => {
    postData();
    setTimeout(() => {
      navigation.navigate('Tab');
      dispatch(emptyCart());
    }, 1500);
  }, []);

  return (
    <View style={styles.container}>
      {/* Semi-transparent Overlay */}
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.successText}>Wohoo! 🎉</Text>
        <Text style={styles.message}>
          Your order has been placed! We'll notify you once it's ready.
        </Text>
        <Image
          source={require('../assets/foodPrep.gif')}
          style={styles.image}
        />
      </View>

      {/* Back to Home Button */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate('Tab')}>
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E7A38', // Greenish background
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dark overlay
    padding: 20,
    borderRadius: 10,
    width: wp('90%'),
  },
  successText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  message: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginVertical: 15,
  },
  image: {
    width: wp('50%'),
    height: wp('50%'),
    marginVertical: 20,
  },
  homeButton: {
    marginTop: 20,
    backgroundColor: '#F4A261', // Orange button
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  homeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
