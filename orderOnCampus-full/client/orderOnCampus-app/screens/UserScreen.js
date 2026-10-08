import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, IconButton, PressableScale } from '../components/ui/primitives';
import { ACTIVE_STATUSES, colors, radius, shadow, space, type } from '../constants/theme';
import { refreshUser, signOut, useUser } from '../hooks/useSession';
import { initials } from '../utils/format';

function MenuRow({ icon, label, hint, onPress, last, tone }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={label} style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, tone === 'danger' && { backgroundColor: colors.dangerSoft }]}>
        <Feather name={icon} size={18} color={tone === 'danger' ? colors.danger : colors.brand} />
      </View>
      <View style={{ flex: 1, marginLeft: space.sm }}>
        <Text style={[type.bodyStrong, tone === 'danger' && { color: colors.danger }]}>{label}</Text>
        {hint ? <Text style={type.small} numberOfLines={1}>{hint}</Text> : null}
      </View>
      {tone !== 'danger' ? <Feather name="chevron-right" size={18} color={colors.faint} /> : null}
    </PressableScale>
  );
}

export default function UserScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useUser();

  useFocusEffect(useCallback(() => { refreshUser().catch(() => {}); }, []));

  const orders = user?.orders || [];
  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o?.status)).length;
  const completedCount = orders.filter(o => o?.status === 'Completed').length;
  const favCount = user?.favoriteCanteens?.length || 0;

  const confirmLogout = () =>
    Alert.alert('Log out?', "You'll need to sign in again to place orders.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.xxl }}>
      <Text style={[type.h1, { marginBottom: space.md }]}>Profile</Text>

      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(user?.name)}</Text></View>
        <View style={{ flex: 1, marginHorizontal: space.md }}>
          <Text style={[type.h2, { color: '#fff' }]} numberOfLines={1}>{user?.name || 'Student'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }} numberOfLines={1}>{user?.email}</Text>
        </View>
        <IconButton icon="edit-2" tone="glass" size={40} onPress={() => navigation.navigate('EditProfile')} accessibilityLabel="Edit profile" />
      </View>

      <View style={styles.stats}>
        <Stat value={orders.length} label="Orders" onPress={() => navigation.navigate('Orders')} />
        <Stat value={activeCount} label="Active" onPress={() => navigation.navigate('Orders')} />
        <Stat value={completedCount} label="Collected" onPress={() => navigation.navigate('Orders')} />
        <Stat value={favCount} label="Favorites" onPress={() => navigation.navigate('Favorites')} />
      </View>

      <Text style={styles.section}>ACCOUNT</Text>
      <Card style={styles.group}>
        <MenuRow icon="user" label="Edit profile" hint="Name and email" onPress={() => navigation.navigate('EditProfile')} />
        <MenuRow icon="shield" label="Change password" hint="Keep your account secure" onPress={() => navigation.navigate('ChangePassword')} last />
      </Card>

      <Text style={styles.section}>ACTIVITY</Text>
      <Card style={styles.group}>
        <MenuRow icon="package" label="My orders" hint={activeCount ? `${activeCount} in progress` : 'Order history'} onPress={() => navigation.navigate('Orders')} />
        <MenuRow icon="heart" label="Favorite canteens" hint={`${favCount} saved`} onPress={() => navigation.navigate('Favorites')} last />
      </Card>

      <Text style={styles.section}>SUPPORT</Text>
      <Card style={styles.group}>
        <MenuRow icon="help-circle" label="Help & support" hint="FAQs and contact" onPress={() => navigation.navigate('Help')} />
        <MenuRow icon="file-text" label="Privacy policy" hint="What we store and why" onPress={() => navigation.navigate('Privacy')} last />
      </Card>

      <Card style={[styles.group, { marginTop: space.lg }]}>
        <MenuRow icon="log-out" label="Log out" onPress={confirmLogout} last tone="danger" />
      </Card>

      <Text style={[type.small, { textAlign: 'center', marginTop: space.lg }]}>
        Campus Rush v{Constants.expoConfig?.version || '1.0.0'} · Made for Christ University
      </Text>
    </ScrollView>
  );
}

function Stat({ value, label, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} style={styles.stat} accessibilityLabel={`${value} ${label}`}>
      <Text style={type.h2}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brand, padding: space.lg, borderRadius: radius.lg },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.ink },
  stats: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: -14, marginHorizontal: space.sm, paddingVertical: space.sm, ...shadow.card },
  stat: { flex: 1, alignItems: 'center' },
  section: { ...type.overline, marginTop: space.lg, marginBottom: space.xs },
  group: { paddingVertical: 0, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
});
