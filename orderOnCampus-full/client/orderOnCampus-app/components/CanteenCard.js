import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default function CanteenCard({ canteen }) {
  const navigation = useNavigation();
  return (
    <>
      {
        canteen.map((canteen, index) => {
          return (
            <TouchableWithoutFeedback
              key={index}
              onPress={() => { navigation.navigate('Canteen', { ...canteen }) }}>

              <View style={styles.cardContainer}>
                <Image
                  source={require('../assets/restaurant.jpg')}
                  style={styles.cardImage}
                />
                <Text style={styles.canteenName}>{canteen.name}</Text>
              </View>

            </TouchableWithoutFeedback>
          );
        })
      }
    </>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',  // Clean white background for a modern look
    marginVertical: hp('2%'),
    marginHorizontal: wp('4%'),
    borderRadius: 20,  // Rounded corners for a soft look
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.2)',  // Subtle shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    width: wp('90%'),
    height: hp('35%'),
    borderWidth: 1,
    borderColor: '#f0f0f0',  // Soft border for definition
  },
  cardImage: {
    width: '100%',
    height: '60%',
    borderRadius: 15,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: '#e8e8e8',  // Light border around the image for definition
  },
  canteenName: {
    color: '#333',  // Dark grey for text for a modern look
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  }
});
