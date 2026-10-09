import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from '../constants/theme';
import { useRealtimeStatus } from '../hooks/useRealtime';

// Shown on every screen when the live connection has been down for a few seconds, so students know
// what they see may be out of date. It disappears once the app reconnects and refreshes.
export default function ConnectionPill() {
  const status = useRealtimeStatus();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (status !== 'offline') { setShow(false); return undefined; }
    const t = setTimeout(() => setShow(true), 3000); // ignore brief blips
    return () => clearTimeout(t);
  }, [status]);
  if (!show) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + space.xs }]} accessibilityLiveRegion="polite">
      <View style={styles.pill}>
        <Feather name="wifi-off" size={14} color="#fff" />
        <Text style={styles.text}>Reconnecting… showing the last update</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50, elevation: 50 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, opacity: 0.94 },
  text: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 8 },
});
