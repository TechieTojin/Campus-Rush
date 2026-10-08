import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { Banner, showToast } from '../components/ui/feedback';
import { ScreenHeader } from '../components/ui/food';
import { TextField } from '../components/ui/forms';
import { Button } from '../components/ui/primitives';
import { colors, space } from '../constants/theme';
import { useUser } from '../hooks/useSession';
import { errorMessage, updateProfile } from '../services/api';
import { mergeUser } from '../slices/AuthSlice';
import { isValidEmail } from '../utils/format';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useUser();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== (user?.name || '') || email.trim() !== (user?.email || '');

  const save = async () => {
    if (saving) return;
    const next = {};
    if (name.trim().length < 2) next.name = 'Enter your full name';
    if (!isValidEmail(email)) next.email = 'Enter a valid email address';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ name: name.trim(), email: email.trim() });
      dispatch(mergeUser({ name: updated.name, email: updated.email }));
      showToast('Profile updated');
      navigation.goBack();
    } catch (e) {
      setFormError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Edit profile" />
      <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
        <Banner message={formError} style={{ marginBottom: space.md }} />
        <TextField label="Full name" icon="user" value={name} onChangeText={(v) => { setName(v); setErrors(e => ({ ...e, name: undefined })); }} error={errors.name} autoCapitalize="words" />
        <TextField label="Email" icon="mail" value={email} onChangeText={(v) => { setEmail(v); setErrors(e => ({ ...e, email: undefined })); }} error={errors.email}
          keyboardType="email-address" autoCapitalize="none" hint="You'll use this email to sign in." />
      </ScrollView>
      <View style={{ padding: space.lg, paddingBottom: Math.max(insets.bottom, space.lg) }}>
        <Button title="Save changes" onPress={save} loading={saving} disabled={!dirty} />
      </View>
    </KeyboardAvoidingView>
  );
}
