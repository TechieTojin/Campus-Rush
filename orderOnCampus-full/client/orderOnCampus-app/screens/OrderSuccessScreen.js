import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, BackHandler, StyleSheet, View } from 'react-native';
import { Text } from '../components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop } from '../components/ui/brand';
import { Button, Divider } from '../components/ui/primitives';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { formatPrice, orderLines, orderRef } from '../utils/format';

export default function OrderSuccessScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute();
  const { order, canteen } = params;
  const pop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 14 }),
      Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, duration: 420, delay: 220, useNativeDriver: true }),
    ]).start();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('Main', { screen: 'Orders' });
      return true;
    });
    return () => sub.remove();
  }, [pop, ring, rise, navigation]);

  const { lines } = orderLines(order);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0) || order.items?.length || 0;
  const code = orderRef(order._id).replace('#', '');

  return (
    <View style={[styles.container, { paddingTop: insets.top + space.xxl, paddingBottom: Math.max(insets.bottom, space.lg) }]}>
      <BrandBackdrop />
      <View style={{ alignItems: 'center' }}>
        <View style={styles.checkWrap}>
          <Animated.View style={[styles.ring, { opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.7] }) }] }]} />
          <Animated.View style={[styles.check, { transform: [{ scale: pop }] }]}>
            <Feather name="check" size={50} color={colors.brand} />
          </Animated.View>
        </View>
        <Text style={styles.title} accessibilityRole="header">Order placed!</Text>
        <Text style={styles.sub}>{canteen.name} has your order. We'll update you here the moment it's ready.</Text>
      </View>

      <Animated.View style={[styles.ticket, { transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }]}>
        <Text style={[type.overline, { textAlign: 'center' }]}>Your pickup code</Text>
        <Text style={styles.code} accessibilityLabel={`Pickup code ${code.split('').join(' ')}`}>{code}</Text>
        <Text style={[type.small, { textAlign: 'center' }]}>Show this at the counter when your order is ready</Text>
        <View style={styles.perforation}>
          <View style={[styles.notch, { left: -space.lg - 10 }]} />
          <View style={styles.dash} />
          <View style={[styles.notch, { right: -space.lg - 10 }]} />
        </View>
        <Row label="Items" value={`${itemCount}`} />
        <Row label="Pickup" value={canteen.name} />
        <Row label="Payment" value="Pay at the counter" />
        <Divider style={{ marginVertical: space.xs }} />
        <Row label="Total" value={formatPrice(order.totalPrice)} strong />
      </Animated.View>

      <View>
        <Button title="Track my order" icon="navigation" variant="accent" onPress={() => navigation.replace('OrderDetail', { orderId: order._id })} />
        <Button title="Back to home" variant="onDark" onPress={() => navigation.navigate('Main', { screen: 'Home' })} style={{ marginTop: space.sm }} />
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
  container: { flex: 1, backgroundColor: colors.brand, paddingHorizontal: space.lg, justifyContent: 'space-between', overflow: 'hidden' },
  decor1: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: colors.brandDeep, top: -140, right: -160, opacity: 0.6 },
  decor2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 26, borderColor: 'rgba(244,162,58,0.16)', bottom: 120, left: -110 },
  checkWrap: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  ring: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: '#fff' },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.raised },
  title: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  sub: { color: colors.onBrandMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: space.xs, maxWidth: 310 },
  ticket: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, ...shadow.raised },
  code: { fontSize: 40, fontWeight: '800', color: colors.ink, letterSpacing: 6, textAlign: 'center', marginVertical: space.xs },
  perforation: { height: 24, justifyContent: 'center', marginVertical: space.sm },
  dash: { borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.border },
  notch: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
});
