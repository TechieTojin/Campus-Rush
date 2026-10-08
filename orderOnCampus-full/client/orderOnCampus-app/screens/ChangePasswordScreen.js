import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, showToast } from '../components/ui/feedback';
import { ScreenHeader } from '../components/ui/food';
import { TextField } from '../components/ui/forms';
import { Button } from '../components/ui/primitives';
import { colors, space } from '../constants/theme';
import { changePassword, errorMessage } from '../services/api';
import { isStrongPassword } from '../utils/format';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (v) => {
    setForm(f => ({ ...f, [key]: v }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const save = async () => {
    if (saving) return;
    const next = {};
    if (!form.current) next.current = 'Enter your current password';
    if (!isStrongPassword(form.next)) next.next = 'Use at least 8 characters with a letter and a number';
    else if (form.next === form.current) next.next = 'Choose a password different from your current one';
    if (form.confirm !== form.next) next.confirm = "Passwords don't match";
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next });
      showToast('Password updated', 'shield');
      navigation.goBack();
    } catch (e) {
      setFormError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Change password" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <Banner message={formError} style={{ marginBottom: space.md }} />
        <TextField label="Current password" icon="lock" secure value={form.current} onChangeText={set('current')} error={errors.current} autoCapitalize="none" />
        <TextField label="New password" icon="key" secure value={form.next} onChangeText={set('next')} error={errors.next} autoCapitalize="none"
          hint="At least 8 characters, including a letter and a number" />
        <TextField label="Confirm new password" icon="key" secure value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} autoCapitalize="none" />
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: Math.max(insets.bottom, space.lg) }}>
        <Button title="Update password" onPress={save} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}
