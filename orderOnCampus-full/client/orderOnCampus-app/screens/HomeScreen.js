import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Icon from "react-native-feather";
import { useDispatch, useSelector } from 'react-redux';
import Categories from '../components/Categories';
import { selectToken, setToken } from '../slices/AuthSlice';

const BASE_URL = 'http://100.127.255.249:5001'; // Update with your server IP

export default function HomeScreen() {
    const dispatch = useDispatch();
    const [name, setName] = useState("");
    const userData = useSelector(selectToken);
    const navigation = useNavigation();

    const triggerRender = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (token) {
                const res = await axios.post(`${BASE_URL}/users/get-user`, { token });
                if (res.data && res.data.data) {
                    setName(res.data.data.name);
                    dispatch(setToken({ data: res.data.data }));
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    }, [dispatch]);

    useEffect(() => {
        triggerRender();
    }, [triggerRender]);

    useFocusEffect(
        useCallback(() => {
            triggerRender();
        }, [triggerRender])
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Background Image */}
            <ImageBackground
                source={require('../assets/home.png')} // Ensure this path is correct
                style={styles.background}
                imageStyle={styles.backgroundImage}
                resizeMode="cover" // Ensure the background image covers the screen properly
            >
                <View style={styles.header}>
                    <Text style={styles.greeting}>Hi, {name}</Text>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity 
                            style={styles.aiButton} 
                            onPress={() => navigation.navigate('AIAssistant')}
                        >
                            <Icon.MessageSquare stroke="#fff" strokeWidth={2} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.cartButton} 
                            onPress={() => navigation.navigate('Cart')}
                        >
                            <Icon.ShoppingCart stroke="#fff" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Title with Special Styling */}
                <Text style={styles.mainText}>
                    Order Now, <Text style={styles.specialText}>Eat Soon!</Text>
                </Text>

                {/* Categories Component */}
                <Categories />
            </ImageBackground>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    background: {
        flex: 1,
        padding: 16,
    },
    backgroundImage: {
        borderRadius: 20,
        opacity: 0.5, // Adjust the opacity for better readability
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D6A4F',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    aiButton: {
        backgroundColor: '#2D6A4F',
        padding: 10,
        borderRadius: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    cartButton: {
        backgroundColor: '#2D6A4F',
        padding: 10,
        borderRadius: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    mainText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 10,
        marginBottom: 10,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
        letterSpacing: 1.5, // Add spacing between letters for modern look
    },
    specialText: {
        color: '#FF6F61', // A bright color for a modern, attention-grabbing look
        textDecorationLine: 'underline', // Underline effect
        textShadowColor: 'rgba(0, 0, 0, 0.2)', // Added shadow for special text
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },
});
