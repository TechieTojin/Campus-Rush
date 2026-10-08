import { Feather } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, ORDER_STATUS, radius, shadow, space, type } from '../../constants/theme';

// Layout props must sit on the outer Pressable, otherwise flex/width collapse to zero inside it.
const OUTER_KEYS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth', 'position', 'top', 'left', 'right', 'bottom', 'zIndex',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical'];

export function PressableScale({ children, style, onPress, disabled, scaleTo = 0.97, hitSlop, accessibilityLabel, accessibilityRole = 'button', accessibilityState }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const flat = StyleSheet.flatten(style) || {};
  const outer = {};
  const inner = {};
  Object.keys(flat).forEach((k) => { (OUTER_KEYS.includes(k) ? outer : inner)[k] = flat[k]; });
  if (outer.flex != null || outer.flexGrow != null) inner.flexGrow = 1;
  if (outer.width != null) inner.width = '100%';
  return (
    <Pressable
      style={outer}
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const BUTTON_VARIANTS = {
  primary: { bg: colors.brand, fg: colors.onBrand, border: colors.brand },
  accent: { bg: colors.accent, fg: colors.ink, border: colors.accent },
  secondary: { bg: colors.surface, fg: colors.brand, border: colors.border },
  soft: { bg: colors.brandSoft, fg: colors.brandDark, border: colors.brandSoft },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
  onDark: { bg: 'transparent', fg: colors.onBrand, border: 'rgba(255,255,255,0.4)' },
};

export function Button({ title, onPress, variant = 'primary', icon, iconRight, loading, disabled, size = 'lg', style, trailing }) {
  const v = BUTTON_VARIANTS[variant];
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 54 : size === 'md' ? 46 : 38;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={title}
      style={[
        styles.button,
        { height, backgroundColor: v.bg, borderColor: v.border, opacity: isDisabled && !loading ? 0.5 : 1 },
        size === 'sm' && { paddingHorizontal: space.sm },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={size === 'sm' ? 16 : 18} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text numberOfLines={1} style={[styles.buttonText, { color: v.fg, fontSize: size === 'sm' ? 14 : 16 }, trailing && { flex: 1 }]}>{title}</Text>
          {trailing ? <Text style={[styles.buttonText, { color: v.fg, fontSize: 16 }]}>{trailing}</Text> : null}
          {iconRight ? <Feather name={iconRight} size={18} color={v.fg} style={{ marginLeft: 8 }} /> : null}
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, badge, tone = 'surface', size = 44, color, accessibilityLabel, style }) {
  const tones = {
    surface: { bg: colors.surface, fg: colors.ink },
    brand: { bg: colors.brand, fg: colors.onBrand },
    glass: { bg: 'rgba(255,255,255,0.92)', fg: colors.ink },
    soft: { bg: colors.surfaceMuted, fg: colors.ink },
  };
  const t = tones[tone];
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconButton, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg }, tone !== 'brand' && shadow.card, style]}
    >
      {typeof icon === 'string' ? <Feather name={icon} size={20} color={color || t.fg} /> : icon}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

export function Chip({ label, active, onPress, icon }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      {icon ? <Feather name={icon} size={14} color={active ? colors.onBrand : colors.text} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, active && { color: colors.onBrand }]}>{label}</Text>
    </PressableScale>
  );
}

export function StatusBadge({ status, size = 'md' }) {
  const meta = ORDER_STATUS[status] || { label: status, color: colors.muted, soft: colors.surfaceMuted };
  return (
    <View style={[styles.status, { backgroundColor: meta.soft }, size === 'sm' && { paddingVertical: 3, paddingHorizontal: 8 }]}>
      <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function Tag({ label, tone = 'neutral', icon }) {
  const tones = {
    neutral: { bg: colors.surfaceMuted, fg: colors.text },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    accent: { bg: colors.accentSoft, fg: colors.accentDark },
    brand: { bg: colors.brandSoft, fg: colors.brandDark },
    glass: { bg: 'rgba(255,255,255,0.9)', fg: colors.ink },
  };
  const t = tones[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      {icon ? <Feather name={icon} size={12} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.tagText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style, onPress }) {
  if (onPress) {
    return <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.card, style]}>{children}</PressableScale>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    borderWidth: 1,
  },
  buttonText: { fontWeight: '700', letterSpacing: 0.1 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: space.xs,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...type.smallStrong },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.pill },
  tagText: { fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
});
