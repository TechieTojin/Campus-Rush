import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ui/food';
import { Button, Card } from '../components/ui/primitives';
import { colors, radius, space, type } from '../constants/theme';
import { SUPPORT_EMAILS } from './HelpScreen';

export default function ForgotPasswordScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Reset password" />
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <View style={styles.icon}>
          <Feather name="key" size={30} color={colors.accentDark} />
        </View>
        <Text style={[type.h1, { textAlign: 'center' }]}>Self-service reset isn't available yet</Text>
        <Text style={[type.body, styles.center]}>
          Campus Rush can't email password reset links at the moment. Contact support from your registered college email and
          we'll help you get back into your account.
        </Text>
        <Card style={{ marginTop: space.xl }}>
          {SUPPORT_EMAILS.map((email) => (
            <Button key={email} title={email} variant="soft" icon="mail" size="md" onPress={() => Linking.openURL(`mailto:${email}?subject=Campus%20Rush%20password%20help`)} style={{ marginBottom: space.xs }} />
          ))}
          <Text style={[type.small, { marginTop: space.xs }]}>
            Already signed in? You can change your password any time from Profile → Change password.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignSelf: 'center', width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginVertical: space.lg },
  center: { textAlign: 'center', marginTop: space.sm, color: colors.muted },
});
