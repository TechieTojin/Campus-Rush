import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, StatusBarScrim } from '../components/ui/feedback';
import { Avatar, Card, IconButton, ListRow, PressableScale } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, radius, shadow, space, type } from '../constants/theme';
import { refreshUser, signOut, useUser } from '../hooks/useSession';
import { formatPrice } from '../utils/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function UserScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUser();

  useFocusEffect(useCallback(() => { refreshUser().catch(() => {}); }, []));

  const orders = (user?.orders || []).filter(o => o && typeof o === 'object');
  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
  const collected = orders.filter(o => o.status === 'Completed');
  const spent = collected.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
  const favCount = user?.favoriteCanteens?.length || 0;
  const since = user?.createdAt ? new Date(user.createdAt) : null;

  const confirmLogout = () =>
    Alert.alert('Sign out?', "Your cart and recently viewed dishes will be cleared from this phone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.xxl }}>
      <Text style={[type.h1, { marginBottom: space.md }]}>Profile</Text>

      <View style={styles.profile}>
        <View style={styles.profileGlow} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={user?.name} size={62} />
          <View style={{ flex: 1, marginHorizontal: space.md }}>
            <Text style={[type.h2, { color: '#fff' }]} numberOfLines={1}>{user?.name || 'Student'}</Text>
            <Text style={{ color: colors.onBrandMuted, fontSize: 14 }} numberOfLines={1}>{user?.email}</Text>
            {since ? <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>Member since {MONTHS[since.getMonth()]} {since.getFullYear()}</Text> : null}
          </View>
          <IconButton icon="edit-2" tone="glass" size={40} onPress={() => navigation.navigate('EditProfile')} accessibilityLabel="Edit profile" />
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={orders.length} label="Orders" onPress={() => navigation.navigate('Orders', { tab: 'past' })} />
        <Stat value={activeCount} label="Active" onPress={() => navigation.navigate('Orders', { tab: 'active' })} />
        <Stat value={favCount} label="Saved" onPress={() => navigation.navigate('Favorites')} />
        <Stat value={formatPrice(spent)} label="Spent" small onPress={() => navigation.navigate('Orders', { tab: 'past' })} />
      </View>

      {user?.status === 'suspended' ? (
        <Banner tone="danger" title="Account suspended" message={`You can see your orders but can't place new ones.${user.statusReason ? ` Reason: ${user.statusReason}.` : ''}`} action="Contact support" onAction={() => navigation.navigate('Help')} style={{ marginTop: space.md }} />
      ) : null}

      <Text style={styles.section}>Account</Text>
      <Card style={styles.group}>
        <ListRow icon="user" label="Edit profile" hint="Name and email" onPress={() => navigation.navigate('EditProfile')} />
        <ListRow icon="shield" label="Change password" hint="Keep your account secure" onPress={() => navigation.navigate('ChangePassword')} last />
      </Card>

      <Text style={styles.section}>Activity</Text>
      <Card style={styles.group}>
        <ListRow icon="package" label="My orders" hint={activeCount ? `${activeCount} in progress` : `${orders.length} in your history`} onPress={() => navigation.navigate('Orders')} />
        <ListRow icon="heart" iconTone="accent" label="Saved canteens" hint={`${favCount} saved`} onPress={() => navigation.navigate('Favorites')} last />
      </Card>

      <Text style={styles.section}>App</Text>
      <Card style={styles.group}>
        <ListRow icon="settings" iconTone="neutral" label="Settings" hint="Connection, history on this phone" onPress={() => navigation.navigate('Settings')} />
        <ListRow icon="help-circle" iconTone="neutral" label="Help & support" hint="FAQs and contact Campus Rush" onPress={() => navigation.navigate('Help')} />
        <ListRow icon="file-text" iconTone="neutral" label="Privacy" hint="What we store and why" onPress={() => navigation.navigate('Privacy')} last />
      </Card>

      <Card style={[styles.group, { marginTop: space.lg }]}>
        <ListRow icon="log-out" label="Sign out" onPress={confirmLogout} last danger />
      </Card>

      <Text style={[type.caption, { textAlign: 'center', marginTop: space.lg }]}>Campus Rush · v{Constants.expoConfig?.version || '1.0.0'}</Text>
    </ScrollView>
    <StatusBarScrim />
    </View>
  );
}

function Stat({ value, label, onPress, small }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} style={styles.stat} accessibilityLabel={`${value} ${label}`}>
      <Text style={[type.h2, small && { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  profile: { backgroundColor: colors.brand, padding: space.lg, paddingBottom: space.xxl, borderRadius: radius.xl, overflow: 'hidden' },
  profileGlow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: colors.brandDeep, right: -90, top: -110, opacity: 0.7 },
  stats: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: -22, marginHorizontal: space.sm, paddingVertical: space.sm, borderWidth: 1, borderColor: colors.divider, ...shadow.raised },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  section: { ...type.overline, marginTop: space.lg, marginBottom: space.xs },
  group: { paddingVertical: 0, paddingHorizontal: space.md },
});
