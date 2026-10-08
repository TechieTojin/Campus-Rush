import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Icon from "react-native-feather";
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart, selectCartItems } from '../slices/CartSlice';

export default function DishRow({ item }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const totalItems = cartItems.filter(cartItem => cartItem._id === item._id);

  const handleIncrease = () => {
    dispatch(addToCart({ ...item }));
  };

  const handleDecrease = () => {
    dispatch(removeFromCart({ _id: item._id }));
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/restaurant.jpg')}
        style={styles.itemImage}
      />
      <View style={styles.detailsContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemPrice}>₹ {item.price}</Text>
      </View>

      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={[styles.button, !totalItems.length && styles.disabledButton]}
          onPress={handleDecrease}
          disabled={!totalItems.length}
        >
          <Icon.Minus height="20" width="20" stroke="white" strokeWidth={3} />
        </TouchableOpacity>
        <View style={styles.quantityDisplay}>
          <Text style={styles.quantityText}>{totalItems.length}</Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={handleIncrease}
        >
          <Icon.Plus height="20" width="20" stroke="white" strokeWidth={3} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
    elevation: 4,  // Subtle shadow for a floating effect
  },
  itemImage: {
    width: hp('12%'),
    height: hp('12%'),
    borderRadius: 10,
    marginRight: 16,
  },
  detailsContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  itemDescription: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D6A4F',
    marginTop: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1E7D5', // Disabled button with lighter shade
  },
  quantityDisplay: {
    backgroundColor: '#F1F3F5',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
