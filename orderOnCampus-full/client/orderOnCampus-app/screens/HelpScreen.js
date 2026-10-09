import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SupportContact from '../components/SupportContact';
import { Banner } from '../components/ui/feedback';
import { ScreenHeader } from '../components/ui/food';
import { Button, Card, Chip, PressableScale } from '../components/ui/primitives';
import { colors, radius, space, type } from '../constants/theme';
import { useRealtime } from '../hooks/useRealtime';
import { createSupportTicket, errorMessage, getSupportTickets } from '../services/api';
import { formatDate } from '../utils/format';

const FAQ = [
  { q: 'How does ordering work?', a: 'Pick a canteen, add items to your cart and place your order. The canteen sees it instantly and updates the status as they prepare it.' },
  { q: 'How do I pay?', a: 'Online payment is not set up yet. Pay the canteen at the counter when you collect your order.' },
  { q: 'What do the order statuses mean?', a: 'Placed: the canteen has received it. Being prepared: it’s being made. Ready: collect it at the counter. Collected: done. Cancelled: the canteen cancelled it.' },
  { q: 'Can I cancel an order?', a: 'Only canteen staff can cancel orders. If you need to change or cancel, speak to the counter as soon as possible — ideally before it is being prepared.' },
  { q: 'Can I order from two canteens at once?', a: 'Each order goes to one canteen. Place separate orders if you want food from different canteens.' },
  { q: 'An item says "Unavailable". Why?', a: 'The canteen has marked it as sold out or not being served right now. Check back later.' },
];

const TOPICS = [['order', 'An order'], ['payment', 'Payment'], ['account', 'My account'], ['app', 'App problem'], ['other', 'Other']];
const STATUS = { open: ['Open', colors.warning], in_progress: ['In progress', colors.brand], resolved: ['Resolved', colors.success], closed: ['Closed', colors.muted] };

export default function HelpScreen() {
  const [open, setOpen] = useState(0);
  const [topic, setTopic] = useState('order');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [tickets, setTickets] = useState(null);

  const loadTickets = useCallback(() => getSupportTickets().then(setTickets).catch(() => setTickets((t) => t || [])), []);
  useEffect(() => { loadTickets(); }, [loadTickets]);
  // An admin replied: show it straight away.
  useRealtime('support.updated', loadTickets);

  const send = async () => {
    if (sending) return;
    if (subject.trim().length < 4) { setError('Add a short subject (at least 4 characters).'); return; }
    if (message.trim().length < 10) { setError('Describe the problem in a little more detail (at least 10 characters).'); return; }
    setSending(true);
    setError('');
    try {
      const t = await createSupportTicket({ category: topic, subject: subject.trim(), message: message.trim() });
      setSent(`Request ${t.ref} sent. Replies from Campus Rush appear below.`);
      setSubject('');
      setMessage('');
      loadTickets();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <Text style={[type.overline, { marginBottom: space.xs }]}>FREQUENTLY ASKED</Text>
        <Card style={{ paddingVertical: 0 }}>
          {FAQ.map((f, i) => (
            <PressableScale key={f.q} onPress={() => setOpen(open === i ? -1 : i)} scaleTo={0.99} accessibilityState={{ expanded: open === i }} style={[styles.faq, i < FAQ.length - 1 && styles.border]}>
              <View style={styles.faqHead}>
                <Text style={[type.bodyStrong, { flex: 1 }]}>{f.q}</Text>
                <Feather name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </View>
              {open === i ? <Text style={[type.body, { color: colors.muted, marginTop: 6 }]}>{f.a}</Text> : null}
            </PressableScale>
          ))}
        </Card>

        <Text style={[type.overline, { marginTop: space.lg, marginBottom: space.xs }]}>ASK CAMPUS RUSH</Text>
        <Card>
          <Text style={[type.small, { marginBottom: space.sm }]}>Your request goes to the Campus Rush team. Replies appear here in the app.</Text>
          <Banner message={error} style={{ marginBottom: space.sm }} />
          {sent ? <Banner tone="success" message={sent} style={{ marginBottom: space.sm }} /> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm }}>
            {TOPICS.map(([k, label]) => <Chip key={k} label={label} active={topic === k} onPress={() => setTopic(k)} />)}
          </View>
          <TextInput value={subject} onChangeText={(v) => { setSubject(v); setSent(''); }} placeholder="Subject" placeholderTextColor={colors.faint} maxLength={120} style={styles.input} accessibilityLabel="Subject" />
          <TextInput value={message} onChangeText={(v) => { setMessage(v); setSent(''); }} placeholder="What happened? Include the order number if it’s about an order." placeholderTextColor={colors.faint} maxLength={2000} multiline style={[styles.input, { height: 110, textAlignVertical: 'top', paddingTop: 12 }]} accessibilityLabel="Message" />
          <Button title={sending ? 'Sending…' : 'Send request'} onPress={send} loading={sending} />
        </Card>

        {tickets && tickets.length ? (
          <>
            <Text style={[type.overline, { marginTop: space.lg, marginBottom: space.xs }]}>YOUR REQUESTS</Text>
            {tickets.map((t) => (
              <Card key={t._id} style={{ marginBottom: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[type.bodyStrong, { flex: 1 }]} numberOfLines={2}>{t.subject}</Text>
                  <Text style={[type.caption, { color: STATUS[t.status]?.[1] }]}>{STATUS[t.status]?.[0]}</Text>
                </View>
                <Text style={type.small}>{t.ref} · {formatDate(t.createdAt)}</Text>
                {t.replies.map((r, i) => (
                  <View key={i} style={styles.reply}>
                    <Text style={[type.caption, { color: colors.brand }]}>{r.by} · {formatDate(r.at)}</Text>
                    <Text style={[type.body, { marginTop: 2 }]}>{r.text}</Text>
                  </View>
                ))}
              </Card>
            ))}
          </>
        ) : null}

        <Text style={[type.overline, { marginTop: space.lg, marginBottom: space.xs }]}>CONTACT</Text>
        <Card><SupportContact /></Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  faq: { paddingVertical: space.md },
  faqHead: { flexDirection: 'row', alignItems: 'center' },
  border: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, height: 48, color: colors.ink, fontSize: 15, marginBottom: space.sm, backgroundColor: colors.surface },
  reply: { marginTop: space.sm, padding: space.sm, borderRadius: radius.sm, backgroundColor: colors.brandTint },
});
