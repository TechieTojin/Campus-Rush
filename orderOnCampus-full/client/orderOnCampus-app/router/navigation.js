import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, getFocusedRouteNameFromRoute, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
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
import PickupScreen from '../screens/PickupScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WelcomeScreen, { ONBOARDED_KEY } from '../screens/WelcomeScreen';
import { clearSession, getToken, isNetworkError, onUnauthorized } from '../services/api';
import { loadCart } from '../services/storage';
import { setCart } from '../slices/CartSlice';
import { enableCartPersistence, store } from '../store';
import TabNavigation from './tabNavigation';

const Stack = createNativeStackNavigator();
const LIGHT_BAR = { statusBarStyle: 'light' };
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.brand } };

export default function Navigation() {
  const [initialRoute, setInitialRoute] = useState(null);

  // The native splash (same artwork) stays visible while the session is restored, so there is
  // no second boot screen and no flash of the wrong screen.
  useEffect(() => {
    onUnauthorized(handleSessionExpired);
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
      } else if (!(await AsyncStorage.getItem(ONBOARDED_KEY).catch(() => null))) {
        route = 'Welcome';
      }
      if (route === 'Main') {
        // Bring back the cart from the last session; it's re-checked against live menus before checkout.
        const saved = await loadCart();
        if (saved?.canteen && saved.items?.length) store.dispatch(setCart(saved));
      }
      enableCartPersistence();
      setInitialRoute(route);
    })();
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer ref={navigationRef} theme={theme} onReady={() => SplashScreen.hideAsync().catch(() => {})}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg }, statusBarStyle: 'dark', statusBarTranslucent: true, statusBarColor: 'transparent' }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade', ...LIGHT_BAR }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade', ...LIGHT_BAR }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={LIGHT_BAR} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Main" component={TabNavigation} options={({ route }) => ({ animation: 'fade', statusBarStyle: (getFocusedRouteNameFromRoute(route) ?? 'Home') === 'Home' ? 'light' : 'dark' })} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="Canteen" component={CanteenScreen} options={LIGHT_BAR} />
        <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ animation: 'slide_from_bottom', ...LIGHT_BAR }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ animation: 'fade', gestureEnabled: false, ...LIGHT_BAR }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="Pickup" component={PickupScreen} options={{ animation: 'slide_from_bottom', ...LIGHT_BAR }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
