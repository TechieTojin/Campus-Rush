import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { selectToken } from '../slices/AuthSlice';
import OrderItems from './OrderItems';
import { API_URL } from '../config/api';

export default function OrderCard({ data }) {
    const [canteenName, setCanteenName] = useState("");
    const [canteenLoc, setCanteenLoc] = useState("");
    const [commonItems, setCommonItems] = useState([]);
    const dispatch = useDispatch();
    const userData = useSelector(selectToken);
    const navigation = useNavigation();

    const getData = async () => {
        try {
            const response = await axios.get(`${API_URL}/canteens/${data.canteen}/get-canteen`);
            const menu = response.data.data.menu;
            setCanteenName(response.data.data.name);
            setCanteenLoc(response.data.data.location);

            const common = menu.filter(item => data.items.includes(item));
            const itemCounts = data.items.reduce((acc, item) => {
                acc[item] = (acc[item] || 0) + 1;
                return acc;
            }, {});

            setCommonItems(common.map(item => ({ id: item, count: itemCounts[item] })));
        } catch (err) {
            console.error('Error fetching canteen data:', err);
        }
    };

    useEffect(() => {
        getData();
    }, [data.canteen]);

    useFocusEffect(
        useCallback(() => {
            // Trigger re-fetch when screen gains focus
            getData();
        }, [])
    );

    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <View style={styles.canteenInfo}>
                    <Image
                        source={require('../assets/restaurant.jpg')}
                        style={styles.canteenImage}
                    />
                    <View style={styles.canteenText}>
                        <Text style={styles.canteenName}>{canteenName}</Text>
                        <Text style={styles.canteenLocation}>{canteenLoc}</Text>
                    </View>
                </View>
                <Text style={styles.totalPrice}>₹ {data.totalPrice}</Text>
            </View>

            {commonItems.map((item, index) => (
                <OrderItems key={index} food={item} />
            ))}

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>{data.status}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginVertical: wp('2%'),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        width: wp('90%'),
    },
    cardHeader: {
        padding: wp('5%'),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    canteenInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    canteenImage: {
        width: hp('10%'),
        height: hp('10%'),
        borderRadius: 8,
    },
    canteenText: {
        marginLeft: wp('3%'),
    },
    canteenName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    canteenLocation: {
        fontSize: 14,
        color: '#777',
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: '#16A34A',
    },
    statusContainer: {
        padding: wp('5%'),
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    statusText: {
        backgroundColor: '#16A34A',
        color: 'white',
        paddingHorizontal: wp('4%'),
        paddingVertical: wp('2%'),
        borderRadius: 20,
        fontSize: 14,
        fontWeight: '600',
    },
});
