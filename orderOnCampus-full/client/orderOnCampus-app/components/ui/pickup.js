import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space, type } from '../../constants/theme';
import { formatTime } from '../../utils/format';
import { Text } from './text';

// How the app talks about pickup time.
//
// The server sends an estimate, not a promise, so the wording stays hedged ("around", "usually")
// and the estimate disappears the moment something real is known: once an order is Ready the
// actual state replaces it, and a collected or cancelled order shows nothing at all.
export function estimateFor(order) {
  if (!order) return null;
  const status = order.status;
  if (status === 'Completed' || status === 'Cancelled') return null;
  if (status === 'Ready') return { kind: 'ready', text: 'Ready for pickup now' };

  const at = order.estimatedReadyAt ? new Date(order.estimatedReadyAt) : null;
  if (!at || Number.isNaN(at.getTime())) return null;

  const minutes = Math.round((at.getTime() - Date.now()) / 60000);
  // Once an estimate has passed there is nothing honest left to say beyond "any minute now".
  if (minutes <= 0) return { kind: 'due', text: 'Ready any minute now' };
  if (minutes <= 60) {
    // A range reads as the approximation it is; a single minute figure would not.
    const upper = minutes + 5;
    return { kind: 'soon', text: `Usually ready in ${minutes}–${upper} min`, at, minutes };
  }
  return { kind: 'later', text: `Ready around ${formatTime(at)}`, at, minutes };
}

// Inline line for cards and lists.
export function EstimateLine({ order, style, tone = 'default' }) {
  const [, tick] = useState(0);
  // Re-renders once a minute so a countdown never goes stale while a screen is open.
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const estimate = estimateFor(order);
  if (!estimate) return null;
  const onDark = tone === 'onDark';
  const colour = onDark ? 'rgba(255,255,255,0.86)' : estimate.kind === 'ready' ? colors.success : colors.muted;
  return (
    <View style={[styles.line, style]}>
      <Feather name={estimate.kind === 'ready' ? 'check-circle' : 'clock'} size={12} color={colour} />
      <Text style={[type.caption, { color: colour, marginLeft: 5 }]} numberOfLines={1}>{estimate.text}</Text>
      {order.estimateSource === 'staff' && estimate.kind !== 'ready' ? (
        <Text style={[type.caption, { color: colour, opacity: 0.75 }]}> · updated by the canteen</Text>
      ) : null}
    </View>
  );
}

// Full card for the order-detail and success screens.
export function EstimateCard({ order, style }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const estimate = estimateFor(order);
  if (!estimate) return null;
  const ready = estimate.kind === 'ready';
  const delayed = (order.prepDelayMinutes || 0) > 0 && !ready;
  return (
    <View style={[styles.card, ready && { backgroundColor: colors.successSoft, borderColor: colors.successSoft }, style]}>
      <View style={[styles.icon, ready && { backgroundColor: 'rgba(20,125,78,0.12)' }]}>
        <Feather name={ready ? 'check-circle' : 'clock'} size={18} color={ready ? colors.success : colors.brand} />
      </View>
      <View style={{ flex: 1, marginLeft: space.sm }}>
        <Text style={[type.bodyStrong, ready && { color: colors.success }]}>{estimate.text}</Text>
        <Text style={[type.small, { marginTop: 1 }]}>
          {ready ? 'Head to the counter with your pickup code.'
            : delayed ? `The canteen added ${order.prepDelayMinutes} min to this order.`
              : 'An estimate from the canteen — we\'ll tell you the moment it\'s ready.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: space.sm,
    backgroundColor: colors.brandTint, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandSoft,
  },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(15,76,66,0.08)', alignItems: 'center', justifyContent: 'center' },
});
