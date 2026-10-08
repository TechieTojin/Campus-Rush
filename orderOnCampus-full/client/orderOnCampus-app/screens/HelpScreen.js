import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ui/food';
import { Button, Card, PressableScale } from '../components/ui/primitives';
import { colors, space, type } from '../constants/theme';

export const SUPPORT_EMAILS = ['support1@example.com', 'support2@example.com'];

const FAQ = [
  { q: 'How does ordering work?', a: 'Pick a canteen, add items to your cart and place your order. The canteen sees it instantly on their dashboard and updates the status as they prepare it.' },
  { q: 'How do I pay?', a: 'Online payment is not set up yet. Pay the canteen at the counter when you collect your order.' },
  { q: 'What do the order statuses mean?', a: 'Placed: the canteen has received it. Processing: it is being prepared. Ready: collect it at the counter. Completed: collected. Cancelled: the canteen cancelled it.' },
  { q: 'Can I cancel an order?', a: 'Only canteen staff can cancel orders. If you need to change or cancel, speak to the counter as soon as possible — ideally before it is being prepared.' },
  { q: 'Can I order from two canteens at once?', a: 'Each order goes to one canteen. Place separate orders if you want food from different canteens.' },
  { q: 'An item says "Unavailable". Why?', a: 'The canteen has marked it as sold out or not being served right now. Check back later.' },
];

export default function HelpScreen() {
  const [open, setOpen] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <Text style={[type.overline, { marginBottom: space.xs }]}>FREQUENTLY ASKED</Text>
        <Card style={{ paddingVertical: 0 }}>
          {FAQ.map((f, i) => (
            <PressableScale
              key={f.q}
              onPress={() => setOpen(open === i ? -1 : i)}
              scaleTo={0.99}
              accessibilityState={{ expanded: open === i }}
              style={[styles.faq, i < FAQ.length - 1 && styles.border]}
            >
              <View style={styles.faqHead}>
                <Text style={[type.bodyStrong, { flex: 1 }]}>{f.q}</Text>
                <Feather name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </View>
              {open === i ? <Text style={[type.body, { color: colors.muted, marginTop: 6 }]}>{f.a}</Text> : null}
            </PressableScale>
          ))}
        </Card>

        <Text style={[type.overline, { marginTop: space.lg, marginBottom: space.xs }]}>CONTACT US</Text>
        <Card>
          <Text style={[type.body, { marginBottom: space.sm }]}>Something not working? Email the Campus Rush team and include your order number if it's about an order.</Text>
          {SUPPORT_EMAILS.map((email) => (
            <Button key={email} title={email} icon="mail" variant="soft" size="md" style={{ marginBottom: space.xs }}
              onPress={() => Linking.openURL(`mailto:${email}?subject=Campus%20Rush%20support`)} />
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  faq: { paddingVertical: space.md },
  faqHead: { flexDirection: 'row', alignItems: 'center' },
  border: { borderBottomWidth: 1, borderBottomColor: colors.divider },
});
