import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space, type } from '../../constants/theme';
import { Button } from './primitives';

export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction, tone = 'brand', compact }) {
  const bg = tone === 'danger' ? colors.dangerSoft : colors.brandSoft;
  const fg = tone === 'danger' ? colors.danger : colors.brand;
  return (
    <View style={[styles.empty, compact && { paddingVertical: space.xl }]}>
      <View style={[styles.emptyIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={30} color={fg} />
      </View>
      <Text style={[type.h3, styles.center]}>{title}</Text>
      {message ? <Text style={[type.small, styles.center, { marginTop: 6, maxWidth: 280 }]}>{message}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} size="md" variant={tone === 'danger' ? 'secondary' : 'primary'} style={{ marginTop: space.lg }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry, compact }) {
  return (
    <EmptyState
      icon="wifi-off"
      tone="danger"
      title="Couldn't load this"
      message={message}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      compact={compact}
    />
  );
}

export function Banner({ tone = 'danger', icon, message, style }) {
  const tones = {
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' },
    info: { bg: colors.brandSoft, fg: colors.brandDark, icon: 'info' },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-circle' },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'check-circle' },
  };
  const t = tones[tone];
  if (!message) return null;
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }, style]} accessibilityLiveRegion="polite">
      <Feather name={icon || t.icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <Text style={[type.smallStrong, { color: t.fg, flex: 1, marginLeft: 10 }]}>{message}</Text>
    </View>
  );
}

export function Skeleton({ width = '100%', height = 16, radius: r = 10, style }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceMuted, opacity }, style]} />;
}

let toastListener = null;
export const showToast = (message, icon = 'check-circle') => toastListener && toastListener({ message, icon, id: Date.now() });

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  useEffect(() => {
    toastListener = (t) => {
      setToast(t);
      clearTimeout(timer.current);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
      }, 1800);
    };
    return () => {
      toastListener = null;
      clearTimeout(timer.current);
    };
  }, [anim]);

  if (!toast) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <Feather name={toast.icon} size={18} color={colors.accent} />
      <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxxl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  center: { textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', padding: space.sm, borderRadius: radius.sm },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    zIndex: 999,
    ...shadow.raised,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 10, flex: 1 },
});
