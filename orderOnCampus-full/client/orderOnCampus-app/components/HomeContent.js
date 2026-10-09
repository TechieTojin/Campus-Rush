import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { imageUri } from './ui/food';
import { PressableScale } from './ui/primitives';

const TONES = { brand: [colors.brand, colors.brandDark], saffron: [colors.accent, colors.accentDark], dark: ['#1b2b2a', '#081211'] };

// Admin-managed banners. Targets are restricted server-side to a canteen or a search query.
export function BannerCarousel({ banners }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState({});
  if (!banners?.length) return null;
  const cardWidth = width - space.lg * 2;
  const open = (b) => {
    if (b.target?.type === 'canteen' && b.target.canteen) navigation.navigate('Canteen', { canteenId: b.target.canteen });
    else if (b.target?.type === 'search' && b.target.query) navigation.navigate('Search', { query: b.target.query });
  };
  return (
    <ScrollView horizontal pagingEnabled={banners.length > 1} showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + space.sm} decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: space.lg }} style={{ marginBottom: space.lg }}>
      {banners.map((b, i) => {
        const uri = imageUri(b.image);
        const tappable = b.target?.type === 'canteen' || b.target?.type === 'search';
        return (
          <PressableScale key={b._id} onPress={() => open(b)} disabled={!tappable} scaleTo={0.98}
            accessibilityRole={tappable ? 'button' : 'image'} accessibilityLabel={`${b.title}${b.subtitle ? `. ${b.subtitle}` : ''}`}
            style={[styles.banner, { width: cardWidth, marginRight: i < banners.length - 1 ? space.sm : 0, backgroundColor: (TONES[b.tone] || TONES.brand)[0] }]}>
            {uri && !failed[b._id] ? (
              <>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed((f) => ({ ...f, [b._id]: true }))} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} />
              </>
            ) : <View style={[styles.bannerGlow, { backgroundColor: (TONES[b.tone] || TONES.brand)[1] }]} />}
            <Text style={styles.bannerTitle} numberOfLines={2}>{b.title}</Text>
            {b.subtitle ? <Text style={styles.bannerSub} numberOfLines={2}>{b.subtitle}</Text> : null}
            {tappable ? <View style={styles.bannerCta}><Text style={styles.bannerCtaText}>{b.target.type === 'canteen' ? `Open ${b.target.name || 'canteen'}` : 'Explore'}</Text><Feather name="arrow-right" size={14} color={colors.ink} /></View> : null}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const DISMISSED_KEY = 'cr.dismissedAnnouncements';
const TONE_STYLE = {
  info: { bg: colors.brandTint, fg: colors.brand, icon: 'info' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'check-circle' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-triangle' },
  critical: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-octagon' },
};

// Announcements from Campus Rush. Read state is kept on this device.
export function Announcements({ items }) {
  const [dismissed, setDismissed] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((v) => setDismissed(v ? JSON.parse(v) : [])).catch(() => setDismissed([]));
  }, []);
  if (!items?.length || !dismissed) return null;
  const visible = items.filter((a) => !dismissed.includes(a._id)).slice(0, 2);
  const dismiss = (id) => {
    const next = [id, ...dismissed].slice(0, 100);
    setDismissed(next);
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => {});
  };
  return visible.map((a) => {
    const t = TONE_STYLE[a.tone] || TONE_STYLE.info;
    return (
      <View key={a._id} style={[styles.note, { backgroundColor: t.bg }]} accessibilityRole="summary">
        <Feather name={t.icon} size={18} color={t.fg} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, marginHorizontal: space.sm }}>
          <Text style={[type.bodyStrong, { color: t.fg }]}>{a.title}</Text>
          <Text style={[type.small, { color: colors.text, marginTop: 2 }]}>{a.body}</Text>
        </View>
        <PressableScale onPress={() => dismiss(a._id)} hitSlop={10} accessibilityLabel={`Dismiss announcement ${a.title}`}>
          <Feather name="x" size={18} color={colors.muted} />
        </PressableScale>
      </View>
    );
  });
}

const styles = StyleSheet.create({
  banner: { height: 150, borderRadius: radius.lg, padding: space.lg, justifyContent: 'flex-end', overflow: 'hidden', ...shadow.card },
  bannerGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -60, top: -80, opacity: 0.55 },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6 },
  bannerSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 2 },
  bannerCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  bannerCtaText: { fontWeight: '800', fontSize: 12.5, color: colors.ink, marginRight: 4 },
  note: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: space.lg, marginBottom: space.md, padding: space.md, borderRadius: radius.md },
});
