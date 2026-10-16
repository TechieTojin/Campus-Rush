import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from './ui/text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, shadow, space, type } from '../constants/theme';
import { imageUri } from './ui/food';
import { PressableScale } from './ui/primitives';

const TONES = { brand: [colors.brand, colors.brandDeep], saffron: [colors.accent, colors.accentDeep], dark: ['#1B2B29', '#081211'] };

// Admin-managed banners. Targets are restricted server-side to a canteen or a search query.
export function BannerCarousel({ banners }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState({});
  const [page, setPage] = useState(0);
  if (!banners?.length) return null;
  const cardWidth = width - space.lg * 2;
  const open = (b) => {
    if (b.target?.type === 'canteen' && b.target.canteen) navigation.navigate('Canteen', { canteenId: b.target.canteen });
    else if (b.target?.type === 'search' && b.target.query) navigation.navigate('Search', { query: b.target.query });
  };
  return (
    <View style={{ marginBottom: space.xl }}>
      <ScrollView
        horizontal
        pagingEnabled={banners.length > 1}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + space.sm}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + space.sm)))}
        contentContainerStyle={{ paddingHorizontal: space.lg }}
      >
        {banners.map((b, i) => {
          const uri = imageUri(b.image);
          const tappable = b.target?.type === 'canteen' || b.target?.type === 'search';
          const [bg, deep] = TONES[b.tone] || TONES.brand;
          const onLight = b.tone === 'saffron' && !(uri && !failed[b._id]);
          return (
            <PressableScale key={b._id} onPress={() => open(b)} disabled={!tappable} scaleTo={0.98}
              accessibilityRole={tappable ? 'button' : 'image'} accessibilityLabel={`${b.title}${b.subtitle ? `. ${b.subtitle}` : ''}`}
              style={[styles.banner, { width: cardWidth, marginRight: i < banners.length - 1 ? space.sm : 0, backgroundColor: bg }]}>
              {uri && !failed[b._id] ? (
                <>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed((f) => ({ ...f, [b._id]: true }))} />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.34)' }]} />
                </>
              ) : (
                <>
                  <View style={[styles.glow, { backgroundColor: deep }]} />
                  <View style={[styles.glowSmall, { borderColor: deep }]} />
                </>
              )}
              <Text style={[styles.bannerTitle, onLight && { color: colors.ink }]} numberOfLines={2}>{b.title}</Text>
              {b.subtitle ? <Text style={[styles.bannerSub, onLight && { color: 'rgba(17,28,26,0.75)' }]} numberOfLines={2}>{b.subtitle}</Text> : null}
              {tappable ? (
                <View style={styles.bannerCta}>
                  <Text style={styles.bannerCtaText}>{b.target.type === 'canteen' ? `Open ${b.target.name || 'canteen'}` : 'Explore'}</Text>
                  <Feather name="arrow-right" size={14} color={colors.ink} />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden>
          {banners.map((b, i) => <View key={b._id} style={[styles.dot, i === page && styles.dotActive]} />)}
        </View>
      ) : null}
    </View>
  );
}

const DISMISSED_KEY = 'cr.dismissedAnnouncements';
const TONE_STYLE = {
  info: { bg: colors.brandTint, fg: colors.brand, icon: 'info' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'check-circle' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-triangle' },
  critical: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-octagon' },
};

// Announcements from Campus Rush. Dismissal is remembered on this device.
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
  return visible.map((a) => <Note key={a._id} a={a} onDismiss={() => dismiss(a._id)} />);
}

function Note({ a, onDismiss }) {
  const t = TONE_STYLE[a.tone] || TONE_STYLE.info;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(enter, { toValue: 1, duration: 260, useNativeDriver: true }).start(); }, [enter]);
  return (
    <Animated.View style={[styles.note, { backgroundColor: t.bg, opacity: enter }]} accessibilityRole="summary">
      <View style={[styles.noteIcon, { backgroundColor: '#fff' }]}><Feather name={t.icon} size={16} color={t.fg} /></View>
      <View style={{ flex: 1, marginHorizontal: space.sm }}>
        <Text style={[type.bodyStrong, { color: t.fg }]}>{a.title}</Text>
        <Text style={[type.small, { color: colors.text, marginTop: 2 }]}>{a.body}</Text>
      </View>
      <PressableScale onPress={onDismiss} hitSlop={12} accessibilityLabel={`Dismiss announcement ${a.title}`}>
        <Feather name="x" size={18} color={colors.muted} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 156, borderRadius: radius.lg, padding: space.lg, justifyContent: 'flex-end', overflow: 'hidden', ...shadow.card },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, right: -70, top: -90, opacity: 0.6 },
  glowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: 40, bottom: -70, borderWidth: 18, opacity: 0.35 },
  bannerTitle: { color: '#fff', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  bannerCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: space.sm, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  bannerCtaText: { fontWeight: '800', fontSize: 12.5, color: colors.ink, marginRight: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  dotActive: { width: 18, backgroundColor: colors.brand },
  note: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: space.lg, marginBottom: space.md, padding: space.md, borderRadius: radius.md },
  noteIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
