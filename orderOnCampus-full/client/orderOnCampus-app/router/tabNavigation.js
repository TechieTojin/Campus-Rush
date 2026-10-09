import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { ACTIVE_STATUSES, colors, shadow } from '../constants/theme';
import { refreshUser } from '../hooks/useSession';
import { useRealtime } from '../hooks/useRealtime';
import FavoritesScreen from '../screens/FavoritesScreen';
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import SearchScreen from '../screens/SearchScreen';
import UserScreen from '../screens/UserScreen';
import { connectRealtime, disconnectRealtime } from '../services/realtime';
import { selectUser } from '../slices/AuthSlice';

const Tab = createBottomTabNavigator();

const TABS = {
  Home: { icon: 'home', label: 'Home' },
  Discover: { icon: 'compass', label: 'Discover' },
  Orders: { icon: 'package', label: 'Orders' },
  Favorites: { icon: 'heart', label: 'Saved' },
  User: { icon: 'user', label: 'Profile' },
};

function TabItem({ route, focused, onPress, badge }) {
  const meta = TABS[route.name];
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => { Animated.spring(anim, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 8 }).start(); }, [focused, anim]);
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${meta.label}, ${badge} active` : meta.label}
      accessibilityState={{ selected: focused }}
    >
      <View style={styles.pillWrap}>
        <Animated.View style={[styles.pill, { opacity: anim, transform: [{ scaleX: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]} />
        <Animated.View style={{ transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }] }}>
          <Feather name={meta.icon} size={21} color={focused ? colors.brand : colors.faint} />
        </Animated.View>
        {badge ? (
          <View style={styles.dot}><Text style={styles.dotText}>{badge}</Text></View>
        ) : null}
      </View>
      <Text style={[styles.label, focused && { color: colors.brand, fontWeight: '800' }]}>{meta.label}</Text>
    </Pressable>
  );
}

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const activeOrders = (user?.orders || []).filter(o => ACTIVE_STATUSES.includes(o?.status)).length;
  // Step out of the way while typing (search, forms) instead of riding on top of the keyboard.
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboard) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return <TabItem key={route.key} route={route} focused={focused} onPress={onPress} badge={route.name === 'Orders' && activeOrders > 0 ? activeOrders : 0} />;
      })}
    </View>
  );
}

export default function TabNavigation() {
  // Realtime connection lives as long as the signed-in area (signing out resets to Login and unmounts this).
  useEffect(() => {
    connectRealtime();
    return () => disconnectRealtime();
  }, []);
  // Suspension or reactivation by an admin: reload the account so banners and checkout reflect it.
  useRealtime('account.updated', () => { refreshUser().catch(() => {}); });
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={SearchScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="User" component={UserScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, paddingHorizontal: 4, ...shadow.card },
  item: { flex: 1, alignItems: 'center', minHeight: 52 },
  pillWrap: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: 60, height: 32, borderRadius: 16, backgroundColor: colors.brandSoft },
  label: { fontSize: 11, marginTop: 3, color: colors.faint, fontWeight: '600' },
  dot: {
    position: 'absolute', top: -3, right: 8, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  dotText: { fontSize: 10, fontWeight: '800', color: colors.ink },
});
