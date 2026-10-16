import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop, Wordmark } from '../components/ui/brand';
import { Button, PressableScale } from '../components/ui/primitives';
import { Text } from '../components/ui/text';
import { colors, radius, space, type } from '../constants/theme';

export const ONBOARDED_KEY = 'cr.onboarded.v1';

// One-screen first-run introduction. Shown only before the first sign-in on this device.
const STEPS = [
  { icon: 'book-open', title: 'Browse every canteen', body: 'Live menus, prices and what’s available right now.' },
  { icon: 'send', title: 'Order ahead from class', body: 'Place your order before you even get there.' },
  { icon: 'hash', title: 'Collect with your code', body: 'We tell you when it’s ready. Pay at the counter.' },
];

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // Short phones (e.g. 720×1280): a smaller headline and tighter steps keep the hero clear of the sheet.
  const short = useWindowDimensions().height < 700;
  const anims = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const hero = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(hero, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.stagger(110, anims.map(a => Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }))),
    ]).start();
  }, [anims, hero]);

  const go = (route) => {
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: 'Login' }, ...(route === 'Register' ? [{ name: 'Register' }] : [])] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand }}>
      <BrandBackdrop />
      <View style={[styles.top, { paddingTop: insets.top + space.lg }]}>
        <Wordmark size={17} />
        <PressableScale onPress={() => go('Login')} hitSlop={10} accessibilityLabel="Skip introduction" style={styles.skip}>
          <Text style={[type.smallStrong, { color: '#fff' }]}>Skip</Text>
        </PressableScale>
      </View>

      <Animated.View style={[styles.hero, { opacity: hero, transform: [{ translateY: hero.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <Text style={styles.kicker}>CAMPUS FOOD, SORTED</Text>
        <Text style={[styles.title, short && styles.titleShort]}>Skip the queue.{'\n'}<Text style={{ color: colors.accent }}>Not the meal.</Text></Text>
      </Animated.View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) + space.sm }]}>
        {STEPS.map((s, i) => (
          <Animated.View key={s.title} style={[styles.step, short && { paddingVertical: 6 }, { opacity: anims[i], transform: [{ translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
            <View style={styles.stepNo}><Text style={styles.stepNoText}>{i + 1}</Text></View>
            <View style={{ flex: 1, marginLeft: space.md }}>
              <Text style={type.h3}>{s.title}</Text>
              <Text style={[type.small, { marginTop: 2 }]}>{s.body}</Text>
            </View>
            <Feather name={s.icon} size={20} color={colors.brand} />
          </Animated.View>
        ))}
        <Button title="Create your account" iconRight="arrow-right" onPress={() => go('Register')} style={{ marginTop: short ? space.md : space.lg }} />
        <Button title="I already have an account" variant="ghost" onPress={() => go('Login')} style={{ marginTop: space.xs }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl },
  skip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
  hero: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  kicker: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1.4, marginTop: space.sm },
  titleShort: { fontSize: 31, lineHeight: 36, letterSpacing: -1 },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space.xl, paddingTop: space.xl },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stepNo: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontWeight: '800', color: colors.brand, fontSize: 15 },
});
