import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import CanteenScreen from '../screens/CanteenScreen';
import CartScreen from '../screens/CartScreen';
import FoodPrepScreen from '../screens/FoodPrepScreen';
import LoginScreen from '../screens/LoginScreen';
import OfferScreen from '../screens/OfferScreen';
import PaymentScreen from '../screens/PaymentScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TabNavigation from './tabNavigation';
import AIAssistantScreen from '../screens/AIAssistantScreen';

export default function navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkLoginStatus = async () => {
    try {
      const data = await AsyncStorage.getItem('isLoggedIn');
      setIsLoggedIn(!!data);
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  if (isLoading) {
    return null; // Or a loading screen
  }

  const LoginNav = () => {
    const Stack = createNativeStackNavigator();
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
         <Stack.Screen name="Login" component={LoginScreen} />
         <Stack.Screen name="Register" component={RegisterScreen} />
         <Stack.Screen name="Tab" component={TabNavigation} />
         <Stack.Screen name="Offers" component={OfferScreen} />
         <Stack.Screen name="Canteen" component={CanteenScreen} />
         <Stack.Screen name="Cart" options={{ presentation: 'modal' }} component={CartScreen} />
         <Stack.Screen name="Payment" options={{ presentation: 'fullScreenModal' }} component={PaymentScreen} />
         <Stack.Screen name="FoodPrep" options={{ presentation: 'fullScreenModal' }} component={FoodPrepScreen} />
         <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
      </Stack.Navigator>
    );
  };
  const TabNav = () => {
    const Stack = createNativeStackNavigator();
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
         <Stack.Screen name="Tab" component={TabNavigation} />
         <Stack.Screen name="Offers" component={OfferScreen} />
         <Stack.Screen name="Canteen" component={CanteenScreen} />
         <Stack.Screen name="Cart" options={{ presentation: 'modal' }} component={CartScreen} />
         <Stack.Screen name="Payment" options={{ presentation: 'fullScreenModal' }} component={PaymentScreen} />
         <Stack.Screen name="FoodPrep" options={{ presentation: 'fullScreenModal' }} component={FoodPrepScreen} />
         <Stack.Screen name="Login" component={LoginScreen} />
         <Stack.Screen name="Register" component={RegisterScreen} />
         <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
      </Stack.Navigator>
    );
  };

  return (
    <NavigationContainer>
      {isLoggedIn ? <TabNav /> : <LoginNav />}
    </NavigationContainer>
  );
}