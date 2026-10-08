import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import * as Icon from "react-native-feather";
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import FavoritesScreen from '../screens/FavoritesScreen';
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import UserScreen from '../screens/UserScreen';

// Reusable Icon Component
const TabBarIcon = ({ focused, onPress, icon, iconColor }) => (
  <TouchableOpacity
    onPress={onPress}
    style={focused ? { backgroundColor: 'rgba(42, 72, 52, 0.5)' } : { backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
    className="p-0 rounded-xl"
  >
    <View className="p-2 rounded-xl">
      {React.createElement(icon, { stroke: focused ? "#2A4834" : "#000" })}
    </View>
  </TouchableOpacity>
);

const TabNavigation = () => {
  const Tab = createBottomTabNavigator();
  const navigation = useNavigation();

  const screenOptions = {
    tabBarShowLabel: false,
    headerShown: false,
    tabBarStyle: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: wp('20%'),
      elevation: 0,
      backgroundColor: '#abdb44', // Corrected from 'bckground' to 'backgroundColor'
    },
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              onPress={() => navigation.navigate('Home')}
              icon={Icon.Home}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              onPress={() => navigation.navigate('Favorites')}
              icon={Icon.Heart}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              onPress={() => navigation.navigate('Orders')}
              icon={Icon.RotateCcw}
            />
          ),
        }}
      />
      <Tab.Screen
        name="User"
        component={UserScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              onPress={() => navigation.navigate('User')}
              icon={Icon.User}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigation;
