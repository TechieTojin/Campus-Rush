import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import * as Icon from 'react-native-feather';
import { widthPercentageToDP } from 'react-native-responsive-screen';

export default function OfferScreen() {
    const navigation = useNavigation();
    const [offersVisible, setOffersVisible] = useState(false); // State to toggle offer visibility

    // Offers Data
    const offers = [
        {
            cafeName: "Christ Barkey",
            offerDetails: "Get 20% off on your first order",
            cafeImage: require('../assets/christ_barkey.jpg'), // Example image, replace with actual
        },
        {
            cafeName: "Michael Cafe",
            offerDetails: "Buy 1 Get 1 Free on selected items",
            cafeImage: require('../assets/michael_cafe.jpg'), // Example image, replace with actual
        },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}>
            {/* Back Button */}
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ position: 'absolute', top: 40, left: 20, backgroundColor: '#fff', padding: 12, borderRadius: 50, elevation: 4 }}
            >
                <Icon.ArrowLeft height="20" width="20" stroke="#2A4834" strokeWidth={3} />
            </TouchableOpacity>

            {/* Icon */}
            <Icon.ShoppingBag stroke="gray" width={widthPercentageToDP('40%')} height={widthPercentageToDP('40%')} />
            <Text style={{ fontSize: 18, color: '#333', marginTop: 20 }}>Check Out the Latest Offers</Text>

            {/* Toggle Button */}
            <TouchableOpacity
                onPress={() => setOffersVisible(!offersVisible)}
                style={{
                    marginTop: 20,
                    backgroundColor: '#FF6347',
                    paddingVertical: 12,
                    paddingHorizontal: 30,
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                }}
            >
                <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                    {offersVisible ? 'Hide Offers' : 'Show Offers'}
                </Text>
            </TouchableOpacity>

            {/* Display Offers if Visible */}
            {offersVisible && (
                <View style={{ marginTop: 20, width: '90%', padding: 20 }}>
                    {offers.map((offer, index) => (
                        <View key={index} style={styles.offerCard}>
                            <Image source={offer.cafeImage} style={styles.cafeImage} />
                            <View style={styles.offerDetails}>
                                <Text style={styles.cafeName}>{offer.cafeName}</Text>
                                <Text style={styles.offerText}>{offer.offerDetails}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = {
    offerCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
    },
    cafeImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
        marginRight: 15,
    },
    offerDetails: {
        flex: 1,
    },
    cafeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    offerText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
};
