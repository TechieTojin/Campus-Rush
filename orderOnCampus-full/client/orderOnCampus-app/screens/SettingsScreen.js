import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { confirm } from '../components/ui/sheet';
import { Text } from '../components/ui/text';
import { useSelector } from 'react-redux';
import { showToast } from '../components/ui/feedback';
import { ScreenHeader } from '../components/ui/food';
import { Card, ListRow } from '../components/ui/primitives';
import { colors, space, type } from '../constants/theme';
import { API_URL } from '../config/api';
import { useAppConfig } from '../hooks/useAppConfig';
import { useRealtimeStatus } from '../hooks/useRealtime';
import { clearRecent, useRecent } from '../hooks/useRecent';
import { selectCartCount } from '../slices/CartSlice';

const STATUS = {
  live: ['Connected', 'Order and menu updates arrive instantly', colors.success],
  connecting: ['Connecting…', 'Setting up live updates', colors.warning],
  offline: ['Reconnecting', 'Showing the last loaded data; pull down on any screen to refresh', colors.danger],
  off: ['Off', 'Live updates start when you sign in', colors.faint],
};

export default function SettingsScreen() {
  const realtime = useRealtimeStatus();
  const recent = useRecent();
  const cartCount = useSelector(selectCartCount);
  const config = useAppConfig();
  const [label, hint, color] = STATUS[realtime] || STATUS.off;
  const history = recent.items.length + recent.searches.length;

  const clearHistory = async () => {
    const ok = await confirm({ title: 'Clear history on this phone?', message: 'Removes recently viewed dishes and recent searches. Your orders and saved canteens are not affected.', confirmLabel: 'Clear history', tone: 'danger', icon: 'clock' });
    if (ok) { clearRecent(); showToast('History cleared', 'trash-2'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <Text style={styles.section}>Live updates</Text>
        <Card style={styles.status}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={{ flex: 1, marginLeft: space.sm }}>
            <Text style={type.bodyStrong}>{label}</Text>
            <Text style={type.small}>{hint}</Text>
          </View>
        </Card>

        <Text style={styles.section}>On this phone</Text>
        <Card style={styles.group}>
          <ListRow icon="clock" iconTone="neutral" label="Clear recent history" hint={history ? `${recent.items.length} viewed dish${recent.items.length === 1 ? '' : 'es'} · ${recent.searches.length} search${recent.searches.length === 1 ? '' : 'es'}` : 'Nothing saved yet'} onPress={history ? clearHistory : undefined} right={history ? undefined : null} />
          <ListRow icon="shopping-bag" iconTone="neutral" label="Saved cart" hint={cartCount ? `${cartCount} item${cartCount === 1 ? '' : 's'} kept for your next visit` : 'Your cart is empty'} right={null} last />
        </Card>
        <Text style={[type.small, { marginTop: space.xs }]}>Your cart, recently viewed dishes and searches are stored only on this phone and are cleared when you sign out.</Text>

        <Text style={styles.section}>Ordering on Campus Rush</Text>
        <Card style={styles.group}>
          <Info icon="credit-card" label="Payment" value="Pay at the canteen counter" />
          <Info icon="layers" label="Per order" value={`Up to ${config.ordering?.maxItemsPerOrder || 20} items · ${config.ordering?.maxQuantityPerItem || 10} of one dish`} />
          <Info icon="map-pin" label="Collection" value="Self pickup at the counter" last />
        </Card>

        <Text style={styles.section}>About</Text>
        <Card style={styles.group}>
          <Info icon="smartphone" label="App version" value={Constants.expoConfig?.version || '1.0.0'} last={!__DEV__} />
          {__DEV__ ? <Info icon="server" label="Development server" value={API_URL.replace(/^https?:\/\//, '')} last /> : null}
        </Card>
      </ScrollView>
    </View>
  );
}

function Info({ icon, label, value, last }) {
  return (
    <View style={[styles.info, !last && styles.border]}>
      <Feather name={icon} size={16} color={colors.muted} />
      <Text style={[type.body, { marginLeft: space.sm, flex: 1 }]}>{label}</Text>
      <Text style={[type.smallStrong, { maxWidth: '58%', textAlign: 'right' }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...type.overline, marginTop: space.lg, marginBottom: space.xs },
  status: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  group: { paddingVertical: 0, paddingHorizontal: space.md },
  info: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.divider },
});
