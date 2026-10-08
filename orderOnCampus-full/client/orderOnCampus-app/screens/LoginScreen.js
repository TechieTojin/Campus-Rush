import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner } from '../components/ui/feedback';
import { TextField } from '../components/ui/forms';
import { Button, PressableScale } from '../components/ui/primitives';
import { colors, radius, space, type } from '../constants/theme';
import { refreshUser, resetTo } from '../hooks/useSession';
import { errorMessage, login } from '../services/api';
import { isValidEmail } from '../utils/format';

export function AuthHero({ title, subtitle, compact }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space.xl }, compact && { paddingBottom: 56 }]}>
      <MaterialCommunityIcons name="coffee" size={180} color="rgba(255,255,255,0.07)" style={styles.heroDecor1} />
      <MaterialCommunityIcons name="silverware-fork-knife" size={110} color="rgba(255,255,255,0.07)" style={styles.heroDecor2} />
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <MaterialCommunityIcons name="coffee" size={22} color={colors.brand} />
        </View>
        <Text style={styles.brandName}>CAMPUS RUSH</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
    </View>
  );
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.brand }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <AuthHero title="Hungry between classes?" subtitle="Order from campus canteens and pick up without the wait." />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]}>
          <Text style={type.h1}>Welcome back</Text>
          <Text style={[type.small, { marginTop: 4, marginBottom: space.lg }]}>Sign in with your student account</Text>

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
          />

          <PressableScale onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8} style={{ alignSelf: 'flex-end', marginBottom: space.lg }}>
            <Text style={[type.smallStrong, { color: colors.brand }]}>Forgot password?</Text>
          </PressableScale>

          <Button title="Sign in" iconRight="arrow-right" onPress={submit} loading={loading} />

          <View style={styles.switchRow}>
            <Text style={type.small}>New to Campus Rush? </Text>
            <PressableScale onPress={() => navigation.navigate('Register')} hitSlop={8}>
              <Text style={[type.smallStrong, { color: colors.brand }]}>Create an account</Text>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.brand, paddingHorizontal: space.xl, paddingBottom: 72, overflow: 'hidden' },
  heroDecor1: { position: 'absolute', right: -40, top: 10 },
  heroDecor2: { position: 'absolute', left: -20, bottom: 0, transform: [{ rotate: '-20deg' }] },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xl },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  brandName: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 2.5, marginLeft: 10 },
  heroTitle: { color: '#fff', fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6, maxWidth: 300 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 22, marginTop: space.xs, maxWidth: 300 },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -40,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: space.lg, flexWrap: 'wrap' },
});
