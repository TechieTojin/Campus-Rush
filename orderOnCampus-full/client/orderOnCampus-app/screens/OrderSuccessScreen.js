import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card } from '../components/ui/primitives';
import { colors, radius, space, type } from '../constants/theme';
import { formatPrice, orderRef } from '../utils/format';

export default function OrderSuccessScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute();
  const { order, canteen } = params;
  const pop = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }),
      Animated.timing(rise, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('Main', { screen: 'Orders' });
      return true;
    });
    return () => sub.remove();
  }, [pop, rise, navigation]);

  const itemCount = order.items?.length || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + space.xxxl, paddingBottom: Math.max(insets.bottom, space.lg) }]}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View style={[styles.check, { transform: [{ scale: pop }] }]}>
          <Feather name="check" size={52} color={colors.brand} />
        </Animated.View>
        <Text style={styles.title}>Order placed!</Text>
        <Text style={styles.sub}>{canteen.name} has received your order. We'll update the status as it's prepared.</Text>
      </View>

      <Animated.View style={{ opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
        <Card style={{ borderRadius: radius.xl }}>
          <Row label="Order" value={orderRef(order._id)} />
          <Row label="Items" value={`${itemCount}`} />
          <Row label="Pickup" value={canteen.name} />
          <Row label="Payment" value="Pay at counter" />
          <View style={styles.divider} />
          <Row label="Total" value={formatPrice(order.totalPrice)} strong />
        </Card>
      </Animated.View>

      <View>
        <Button title="Track order" icon="map" variant="accent" onPress={() => navigation.replace('OrderDetail', { orderId: order._id })} />
        <Button title="Back to home" variant="onDark" onPress={() => navigation.navigate('Main', { screen: 'Home' })} style={{ marginTop: space.xs }} />
      </View>
    </View>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={strong ? type.h3 : type.body}>{label}</Text>
      <Text style={[strong ? type.h2 : type.bodyStrong, { flexShrink: 1, textAlign: 'right', marginLeft: space.md }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand, paddingHorizontal: space.lg, justifyContent: 'space-between' },
  check: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: space.xs, maxWidth: 300 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: space.xs },
});
