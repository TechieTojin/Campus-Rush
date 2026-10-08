import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useSelector } from 'react-redux';
import { selectCartItems, selectCartTotal } from '../slices/CartSlice';

export default function CartIcon() {
  const navigation = useNavigation();
  const cartItems = useSelector(selectCartItems);
  const cartTotal = useSelector(selectCartTotal);

  if (!cartItems.length) return null;

  return (
    <View style={[styles.container, { bottom: hp('2%') }]}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Cart')}
        style={styles.cartButton}
      >
        <View style={styles.cartItemCountContainer}>
          <Text style={styles.cartItemCountText}>{cartItems.length}</Text>
        </View>

        <Text style={styles.cartText}>View Cart</Text>

        <Text style={styles.cartTotalText}>₹{cartTotal}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: wp('100%'),
    zIndex: 50,
  },
  cartButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D6A4F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cartItemCountContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cartItemCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  cartTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
