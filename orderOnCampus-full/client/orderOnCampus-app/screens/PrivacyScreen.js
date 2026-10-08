import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ui/food';
import { Card } from '../components/ui/primitives';
import { colors, space, type } from '../constants/theme';

const SECTIONS = [
  { title: 'What we store', body: 'Your name, email address, a securely hashed password, the canteens you save as favorites, and the orders you place (items, total, canteen, time and status).' },
  { title: 'Who can see your orders', body: 'You can see your own orders. Staff of the canteen you ordered from can see that order so they can prepare it. Other students cannot see your orders.' },
  { title: 'Payments', body: 'Campus Rush does not collect or store card, UPI or bank details. Orders are paid at the canteen counter.' },
  { title: 'Sign-in', body: 'When you sign in, a session token is stored on this device so you stay signed in. It expires after 24 hours. Logging out removes it from the device.' },
  { title: 'Your choices', body: 'You can update your name and email from Edit profile, change your password at any time, and remove favorites whenever you like. To delete your account, contact support from Help & support.' },
];

export default function PrivacyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Privacy policy" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>A plain-language summary of how Campus Rush handles your information.</Text>
        {SECTIONS.map(s => (
          <Card key={s.title} style={{ marginBottom: space.sm }}>
            <Text style={[type.h3, { marginBottom: 4 }]}>{s.title}</Text>
            <Text style={type.body}>{s.body}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
