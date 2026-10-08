import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner } from '../components/ui/feedback';
import { TextField } from '../components/ui/forms';
import { Button, IconButton, PressableScale } from '../components/ui/primitives';
import { colors, radius, space, type } from '../constants/theme';
import { refreshUser, resetTo } from '../hooks/useSession';
import { errorMessage, login, register } from '../services/api';
import { isStrongPassword, isValidEmail } from '../utils/format';
import { AuthHero } from './LoginScreen';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const refs = { email: useRef(null), password: useRef(null), confirm: useRef(null) };
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (v) => {
    setForm(f => ({ ...f, [key]: v }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    if (loading) return;
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address';
    if (!isStrongPassword(form.password)) next.password = 'Use at least 8 characters with a letter and a number';
    if (form.confirm !== form.password || !form.confirm) next.confirm = "Passwords don't match";
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await register(form);
      await login(form.email, form.password);
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
        <AuthHero title="Create your account" subtitle="Takes less than a minute." compact />
        <IconButton icon="arrow-left" tone="glass" onPress={() => navigation.goBack()} accessibilityLabel="Go back" style={[styles.back, { top: insets.top + 8 }]} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }]}>
          <Banner message={formError} style={{ marginBottom: space.md }} />

          <TextField label="Full name" icon="user" value={form.name} onChangeText={set('name')} error={errors.name}
            autoCapitalize="words" autoComplete="name" returnKeyType="next" onSubmitEditing={() => refs.email.current?.focus()} placeholder="Your name" />
          <TextField ref={refs.email} label="College email" icon="mail" value={form.email} onChangeText={set('email')} error={errors.email}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next"
            onSubmitEditing={() => refs.password.current?.focus()} placeholder="you@college.edu" />
          <TextField ref={refs.password} label="Password" icon="lock" secure value={form.password} onChangeText={set('password')} error={errors.password}
            hint="At least 8 characters, including a letter and a number" autoCapitalize="none" returnKeyType="next"
            onSubmitEditing={() => refs.confirm.current?.focus()} placeholder="Create a password" />
          <TextField ref={refs.confirm} label="Confirm password" icon="lock" secure value={form.confirm} onChangeText={set('confirm')} error={errors.confirm}
            autoCapitalize="none" returnKeyType="go" onSubmitEditing={submit} placeholder="Repeat your password" />

          <Button title="Create account" onPress={submit} loading={loading} style={{ marginTop: space.xs }} />

          <View style={styles.switchRow}>
            <Text style={type.small}>Already have an account? </Text>
            <PressableScale onPress={() => navigation.navigate('Login')} hitSlop={8}>
              <Text style={[type.smallStrong, { color: colors.brand }]}>Sign in</Text>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', right: space.lg },
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
