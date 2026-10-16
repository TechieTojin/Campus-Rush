import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop, Wordmark } from '../components/ui/brand';
import { Banner } from '../components/ui/feedback';
import { TextField } from '../components/ui/forms';
import { Button, PressableScale } from '../components/ui/primitives';
import { Text } from '../components/ui/text';
import { colors, radius, space, type } from '../constants/theme';
import { refreshUser, resetTo } from '../hooks/useSession';
import { errorMessage, login } from '../services/api';
import { isValidEmail } from '../utils/format';

export function AuthHero({ kicker, title, subtitle, compact, dense }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space.lg }, compact && { paddingBottom: 64 }]}>
      <BrandBackdrop />
      <Wordmark size={17} />
      <View style={{ marginTop: compact ? space.xl : space.xxl }}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={[styles.heroTitle, dense && styles.heroTitleDense]}>{title}</Text>
        {subtitle && !dense ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function TrustStrip() {
  const items = [['clock', 'Order ahead'], ['map-pin', 'Pick up on campus'], ['credit-card', 'Pay at the counter']];
  return (
    <View style={styles.trust}>
      {items.map(([icon, label]) => (
        <View key={label} style={styles.trustItem}>
          <View style={styles.trustIcon}><Feather name={icon} size={15} color={colors.brand} /></View>
          <Text style={[type.caption, { color: colors.text, textAlign: 'center', marginTop: 6 }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
  // Short phones (e.g. 720×1280): a compact hero keeps the Sign in button above the fold.
  const short = useWindowDimensions().height < 700;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;
    const next = {};
    if (!isValidEmail(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await login(email, password);
      await refreshUser();
      resetTo('Main');
    } catch (e) {
      setFormError(e.response ? errorMessage(e) : e.message || errorMessage(e));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <AuthHero kicker="WELCOME BACK" title="Hungry between classes?" subtitle="Your campus canteens, one tap away." compact={short} dense={short} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Text style={type.h1}>Sign in</Text>
          <Text style={[type.small, { marginTop: 4, marginBottom: space.lg }]}>Use your Campus Rush student account</Text>

          <Banner message={formError} style={{ marginBottom: space.md }} />

          <TextField
            label="Email"
            icon="mail"
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors(e => ({ ...e, email: undefined })); }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="you@college.edu"
          />
          <TextField
            ref={passwordRef}
            label="Password"
            icon="lock"
            secure
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
            error={errors.password}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            placeholder="Your password"
            style={{ marginBottom: space.xs }}
          />

          <PressableScale onPress={() => navigation.navigate('ForgotPassword')} hitSlop={10} style={{ alignSelf: 'flex-end', paddingVertical: 6, marginBottom: space.md }}>
            <Text style={[type.smallStrong, { color: colors.brand }]}>Forgot password?</Text>
          </PressableScale>

          <Button title="Sign in" iconRight="arrow-right" onPress={submit} loading={loading} />

          <View style={styles.switchRow}>
            <Text style={type.small}>New to Campus Rush? </Text>
            <PressableScale onPress={() => navigation.navigate('Register')} hitSlop={10}>
              <Text style={[type.smallStrong, { color: colors.brand }]}>Create an account</Text>
            </PressableScale>
          </View>

          <View style={{ flex: 1, minHeight: space.lg }} />
          <TrustStrip />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.xl, paddingBottom: 76, overflow: 'hidden' },
  kicker: { color: colors.accent, fontSize: 11.5, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 33, lineHeight: 39, fontWeight: '800', letterSpacing: -1, maxWidth: 320 },
  heroTitleDense: { fontSize: 28, lineHeight: 33 },
  heroSub: { color: colors.onBrandMuted, fontSize: 15, lineHeight: 22, marginTop: space.xs, maxWidth: 300 },
  sheet: { flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -44, paddingHorizontal: space.xl, paddingTop: space.xl },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: space.lg, flexWrap: 'wrap' },
  trust: { flexDirection: 'row', marginTop: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.divider },
  trustItem: { flex: 1, alignItems: 'center' },
  trustIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
});
