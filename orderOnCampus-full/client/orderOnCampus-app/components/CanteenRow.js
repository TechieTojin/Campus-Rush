import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default function CanteenRow({ canteen }) {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('Canteen', { ...canteen })}
    >
      <Image
        source={require('../assets/restaurant.jpg')}
        style={styles.image}
      />
      <View style={styles.textContainer}>
        <Text style={styles.canteenName}>{canteen.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    width: wp('90%'),
  },
  image: {
    width: wp('90%'),
    height: hp('20%'),
    borderRadius: 15,
    resizeMode: 'cover',
  },
  textContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  canteenName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});
