import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Image, ImageBackground, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Icon from "react-native-feather";
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { selectCanteen } from '../slices/canteenSlice';
import { removeFromCart, selectCartItems, selectCartTotal } from '../slices/CartSlice';

export default function CartScreen() {
    const navigation = useNavigation();
    const canteen = useSelector(selectCanteen);
    const [groupedItems, setGroupedItems] = useState({});
    const cartItems = useSelector(selectCartItems);
    const cartTotal = useSelector(selectCartTotal);
    const dispatch = useDispatch();
    const orderTotal = cartTotal + 2;

    useEffect(() => {
        const items = cartItems.reduce((group, item) => {
            if (group[item._id]) {
                group[item._id].push(item);
            } else {
                group[item._id] = [item];
            }
            return group;
        }, {});
        setGroupedItems(items);
    }, [cartItems]);

    if (!cartItems.length)
        return (
            <ImageBackground
                source={require('../assets/cart.png')} // Update the path to your cart.png image
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'white', borderRadius: 50, padding: 10, zIndex: 50 }}
                >
                    <Icon.ArrowLeft height="20" width="20" stroke="#2A4834" strokeWidth={3} />
                </TouchableOpacity>
                <Icon.ShoppingBag stroke='white' width={wp('80%')} height={wp('80%')} strokeWidth={1} />
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Oops :(</Text>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '500' }}>Your cart is empty</Text>
            </ImageBackground>
        );

    return (
        <ImageBackground
            source={require('../assets/cart.png')} // Update the path to your cart.png image
            style={{ flex: 1 }}
        >
            <StatusBar style="light" />
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'white', borderRadius: 50, padding: 10, zIndex: 50 }}
            >
                <Icon.ArrowLeft height="20" width="20" stroke="#2A4834" strokeWidth={3} />
            </TouchableOpacity>
            <ScrollView style={{ paddingBottom: 80 }} contentContainerStyle={{ paddingHorizontal: wp('5%') }}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center', marginVertical: 20 }}>Your Cart</Text>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 20 }}>{canteen.name}</Text>
                {
                    Object.entries(groupedItems).map(([key, items]) => {
                        let dish = items[0];
                        return (
                            <View key={key} style={{
                                flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 20,
                                borderRadius: 12, marginBottom: 15, alignItems: 'center', justifyContent: 'space-between',
                                shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', marginRight: 10 }}>{items.length} X</Text>
                                    <Image source={dish.image} style={{ height: 40, width: 40, borderRadius: 10, marginRight: 10 }} />
                                    <Text style={{ fontSize: 16, fontWeight: '500' }}>{dish.name}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600' }}>₹{dish.price}</Text>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#4CAF50', borderRadius: 50, padding: 8, marginLeft: 10, justifyContent: 'center',
                                            alignItems: 'center', elevation: 5
                                        }}
                                        onPress={() => dispatch(removeFromCart({ _id: dish._id }))}>
                                        <Icon.Minus height="20" width="20" stroke="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                }
            </ScrollView>
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 30,
                borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>Subtotal</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>₹{cartTotal}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>Processing Charge</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>₹2</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#333' }}>Order Total</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#333' }}>₹{orderTotal}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Payment', { orderTotal })}
                    style={{
                        backgroundColor: '#4CAF50', paddingVertical: 15, borderRadius: 50, justifyContent: 'center',
                        alignItems: 'center', elevation: 5
                    }}
                >
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Check Out</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}
