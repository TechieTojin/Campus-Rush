import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space, type } from '../../constants/theme';
import { Button } from './primitives';

const TONES = {
  brand: { bg: colors.brandSoft, ring: colors.brandTint, fg: colors.brand },
  accent: { bg: colors.accentSoft, ring: '#FFF7EC', fg: colors.accentDeep },
  danger: { bg: colors.dangerSoft, ring: '#FEF4F3', fg: colors.danger },
  heart: { bg: colors.heartSoft, ring: '#FEF4F5', fg: colors.heart },
};

// Layered "badge" illustration: soft ring, tinted disc, icon, and a small accent satellite.
export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction, secondaryLabel, onSecondary, tone = 'brand', compact }) {
  const t = TONES[tone] || TONES.brand;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start(); }, [enter]);
  return (
    <View style={[styles.empty, compact && { paddingVertical: space.xl }]}>
      <Animated.View style={[styles.illo, { backgroundColor: t.ring, opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        <View style={[styles.illoDisc, { backgroundColor: t.bg }]}>
          <Feather name={icon} size={32} color={t.fg} />
        </View>
        <View style={[styles.satellite, { backgroundColor: colors.accent }]} />
        <View style={[styles.satelliteSmall, { backgroundColor: t.fg }]} />
      </Animated.View>
      <Text style={[type.h2, styles.center]}>{title}</Text>
      {message ? <Text style={[type.body, styles.center, { color: colors.muted, marginTop: 6, maxWidth: 300 }]}>{message}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} size="md" variant={tone === 'danger' ? 'secondary' : 'primary'} style={{ marginTop: space.lg, minWidth: 180 }} /> : null}
      {secondaryLabel ? <Button title={secondaryLabel} onPress={onSecondary} size="md" variant="ghost" style={{ marginTop: space.xs }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry, compact, offline }) {
  return (
    <EmptyState
      icon={offline ? 'wifi-off' : 'alert-triangle'}
      tone="danger"
      title={offline ? "You're offline" : "Couldn't load this"}
      message={message}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      compact={compact}
    />
  );
}

export function Banner({ tone = 'danger', icon, title, message, style, action, onAction }) {
  const tones = {
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' },
    info: { bg: colors.brandTint, fg: colors.brandDeep, icon: 'info' },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-triangle' },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'check-circle' },
  };
  const t = tones[tone];
  if (!message && !title) return null;
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }, style]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Feather name={icon || t.icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        {title ? <Text style={[type.bodyStrong, { color: t.fg }]}>{title}</Text> : null}
        {message ? <Text style={[title ? type.small : type.smallStrong, { color: title ? colors.text : t.fg }]}>{message}</Text> : null}
        {action ? (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" style={{ marginTop: 6, alignSelf: 'flex-start' }}>
            <Text style={[type.smallStrong, { color: t.fg, textDecorationLine: 'underline' }]}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// Shimmering placeholder: a soft highlight sweeps across the block while content loads.
export function Skeleton({ width = '100%', height = 16, radius: r = 10, style }) {
  const sweep = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [sweep]);
  return (
    <View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityElementsHidden>
      {w ? (
        <Animated.View style={[styles.shine, { width: Math.max(60, w * 0.45), transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.5, w * 1.1] }) }] }]} />
      ) : null}
    </View>
  );
}

// Opaque strip behind the translucent Android status bar so scrolled content never collides with the clock.
// `extra` extends the strip below the status bar, for screens that float a control there and
// would otherwise let content scroll visibly underneath it.
export function StatusBarScrim({ visible = true, extra = 0 }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + extra, backgroundColor: colors.bg, zIndex: 10, elevation: 30, shadowColor: 'transparent' }} />;
}

let toastListener = null;
// showToast('Saved', 'heart', { actionLabel: 'Undo', onAction: fn, duration: 3500 })
export const showToast = (message, icon = 'check-circle', options = {}) => toastListener && toastListener({ message, icon, id: Date.now(), ...options });

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useRef(() => Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null))).current;

  useEffect(() => {
    toastListener = (t) => {
      setToast(t);
      clearTimeout(timer.current);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 7 }).start();
      timer.current = setTimeout(hide, t.duration || (t.actionLabel ? 4000 : 2000));
    };
    return () => { toastListener = null; clearTimeout(timer.current); };
  }, [anim, hide]);

  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.toastWrap, { bottom: Math.max(insets.bottom, 12) + 76, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}
    >
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Feather name={toast.icon} size={18} color={colors.accent} />
        <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
        {toast.actionLabel ? (
          <Pressable
            onPress={() => { clearTimeout(timer.current); toast.onAction?.(); hide(); }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
            style={styles.toastAction}
          >
            <Text style={styles.toastActionText}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxxl },
  illo: { width: 116, height: 116, borderRadius: 58, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  illoDisc: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  satellite: { position: 'absolute', width: 14, height: 14, borderRadius: 7, top: 14, right: 12, borderWidth: 3, borderColor: colors.bg },
  satelliteSmall: { position: 'absolute', width: 8, height: 8, borderRadius: 4, bottom: 18, left: 12, opacity: 0.35 },
  center: { textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', padding: space.sm, paddingHorizontal: space.md, borderRadius: radius.md },
  shine: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ skewX: '-18deg' }] },
  // Android stacks overlapping views by elevation, so the toast must out-rank raised footers/sheets.
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 999, elevation: 60, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.ink,
    paddingVertical: 13, paddingHorizontal: space.md, borderRadius: radius.md, ...shadow.raised,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 10, flex: 1 },
  toastAction: { marginLeft: space.sm, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  toastActionText: { color: colors.accent, fontWeight: '800', fontSize: 13.5 },
});
