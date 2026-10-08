import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { PressableScale } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, space } from '../constants/theme';
import FavoritesScreen from '../screens/FavoritesScreen';
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import UserScreen from '../screens/UserScreen';
import { selectUser } from '../slices/AuthSlice';

const Tab = createBottomTabNavigator();

const TABS = {
  Home: { icon: 'home', label: 'Home' },
  Orders: { icon: 'package', label: 'Orders' },
  Favorites: { icon: 'heart', label: 'Favorites' },
  User: { icon: 'user', label: 'Profile' },
};

function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUser);
  const activeOrders = (user?.orders || []).filter(o => ACTIVE_STATUSES.includes(o?.status)).length;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TABS[route.name];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            scaleTo={0.9}
            accessibilityRole="tab"
            accessibilityLabel={meta.label}
            accessibilityState={{ selected: focused }}
            style={styles.item}
          >
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Feather name={meta.icon} size={20} color={focused ? colors.brand : colors.faint} />
              {route.name === 'Orders' && activeOrders > 0 ? (
                <View style={styles.dot}><Text style={styles.dotText}>{activeOrders}</Text></View>
              ) : null}
            </View>
            <Text style={[styles.label, focused && { color: colors.brand, fontWeight: '700' }]}>{meta.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function TabNavigation() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="User" component={UserScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: space.xs,
    paddingHorizontal: space.xs,
  },
  item: { flex: 1, alignItems: 'center' },
  pill: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.brandSoft },
  label: { fontSize: 11, marginTop: 3, color: colors.faint, fontWeight: '600' },
  dot: {
    position: 'absolute',
    top: -2,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  dotText: { fontSize: 10, fontWeight: '800', color: colors.ink },
});
