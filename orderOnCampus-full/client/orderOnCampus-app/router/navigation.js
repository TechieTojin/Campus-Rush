import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { handleSessionExpired, navigationRef, refreshUser } from '../hooks/useSession';
import CanteenScreen from '../screens/CanteenScreen';
import CartScreen from '../screens/CartScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HelpScreen from '../screens/HelpScreen';
import LoginScreen from '../screens/LoginScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SearchScreen from '../screens/SearchScreen';
import { clearSession, getToken, isNetworkError, onUnauthorized } from '../services/api';
import TabNavigation from './tabNavigation';

const Stack = createNativeStackNavigator();

const LIGHT_BAR = { statusBarStyle: 'light' };

const theme ={ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.brand } };

function BootScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 10 }),
    ]).start();
  }, [fade, scale]);
  return (
    <View style={styles.boot}>
      <StatusBar style="light" />
      <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ scale }] }}>
        <View style={styles.bootMark}>
          <MaterialCommunityIcons name="coffee" size={44} color={colors.brand} />
        </View>
        <Text style={styles.bootTitle}>CAMPUS RUSH</Text>
        <Text style={styles.bootTag}>Order ahead. Skip the queue.</Text>
      </Animated.View>
    </View>
  );
}

export default function Navigation() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    onUnauthorized(handleSessionExpired);
    const minDelay = new Promise(r => setTimeout(r, 900));
    (async () => {
      let route = 'Login';
      const token = await getToken();
      if (token) {
        try {
          await refreshUser();
          route = 'Main';
        } catch (e) {
          if (isNetworkError(e)) route = 'Main';
          else await clearSession();
        }
      }
      await minDelay;
      setInitialRoute(route);
    })();
  }, []);

  if (!initialRoute) return <BootScreen />;

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg }, statusBarStyle: 'dark', statusBarTranslucent: true, statusBarColor: 'transparent' }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade', ...LIGHT_BAR }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={LIGHT_BAR} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Main" component={TabNavigation} options={{ animation: 'fade' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="Canteen" component={CanteenScreen} options={LIGHT_BAR} />
        <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ animation: 'fade', gestureEnabled: false, ...LIGHT_BAR }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  bootMark: { width: 92, height: 92, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 20, transform: [{ rotate: '-6deg' }] },
  bootTitle: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 4 },
  bootTag: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 8, fontWeight: '500' },
});
