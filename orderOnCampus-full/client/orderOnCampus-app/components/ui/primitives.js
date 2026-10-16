import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { Text } from './text';
import { colors, ORDER_STATUS, radius, shadow, space, touch, type } from '../../constants/theme';
import { initials } from '../../utils/format';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Gentle layout transition for list insert/remove (cart rows, expanding sections).
export const animateLayout = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

// Layout props must sit on the outer Pressable, otherwise flex/width collapse to zero inside it.
const OUTER_KEYS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth', 'position', 'top', 'left', 'right', 'bottom', 'zIndex',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical'];

export function PressableScale({ children, style, onPress, onLongPress, disabled, scaleTo = 0.97, hitSlop, accessibilityLabel, accessibilityHint, accessibilityRole = 'button', accessibilityState, testID }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 5 }).start();
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
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      testID={testID}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const BUTTON_VARIANTS = {
  primary: { bg: colors.brand, fg: colors.onBrand, border: colors.brand },
  accent: { bg: colors.accent, fg: colors.ink, border: colors.accent },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.border },
  soft: { bg: colors.brandSoft, fg: colors.brandDeep, border: colors.brandSoft },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
  onDark: { bg: 'rgba(255,255,255,0.12)', fg: colors.onBrand, border: 'rgba(255,255,255,0.28)' },
  light: { bg: colors.surface, fg: colors.brandDeep, border: colors.surface },
};

export function Button({ title, onPress, variant = 'primary', icon, iconRight, loading, disabled, size = 'lg', style, trailing, accessibilityLabel, testID }) {
  const v = BUTTON_VARIANTS[variant];
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 40;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel || (trailing ? `${title}, ${trailing}` : title)}
      accessibilityState={{ busy: !!loading }}
      testID={testID}
      style={[
        styles.button,
        { height, backgroundColor: v.bg, borderColor: v.border, opacity: isDisabled && !loading ? 0.45 : 1 },
        size === 'sm' && { paddingHorizontal: space.md },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={size === 'sm' ? 15 : 18} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text numberOfLines={1} style={[styles.buttonText, { color: v.fg, fontSize: size === 'sm' ? 13.5 : 16 }, trailing && { flex: 1 }]}>{title}</Text>
          {trailing ? (
            <View style={[styles.trailing, { backgroundColor: variant === 'primary' ? 'rgba(255,255,255,0.14)' : 'rgba(17,28,26,0.06)' }]}>
              <Text style={[styles.buttonText, { color: v.fg, fontSize: 15 }]}>{trailing}</Text>
            </View>
          ) : null}
          {iconRight ? <Feather name={iconRight} size={18} color={v.fg} style={{ marginLeft: 8 }} /> : null}
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, badge, tone = 'surface', size = 44, color, accessibilityLabel, style, disabled }) {
  const tones = {
    surface: { bg: colors.surface, fg: colors.ink, border: colors.border },
    brand: { bg: colors.brand, fg: colors.onBrand, border: colors.brand },
    glass: { bg: 'rgba(255,255,255,0.94)', fg: colors.ink, border: 'transparent' },
    soft: { bg: colors.surfaceAlt, fg: colors.ink, border: 'transparent' },
    clear: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
  };
  const t = tones[tone];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.88}
      hitSlop={Math.max(0, (touch - size) / 2)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconButton, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, borderColor: t.border }, tone === 'glass' && shadow.card, style]}
    >
      {typeof icon === 'string' ? <Feather name={icon} size={Math.round(size * 0.43)} color={color || t.fg} /> : icon}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

export function Chip({ label, active, onPress, icon, count, tone = 'default', leading }) {
  const activeBg = tone === 'veg' ? '#178A3A' : colors.ink;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && { backgroundColor: activeBg, borderColor: activeBg }]}
    >
      {leading || null}
      {icon ? <Feather name={icon} size={14} color={active ? colors.onBrand : colors.text} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, active && { color: colors.onBrand }]}>{label}</Text>
      {count != null ? <Text style={[styles.chipCount, active && { color: 'rgba(255,255,255,0.75)' }]}> {count}</Text> : null}
    </PressableScale>
  );
}

export function StatusBadge({ status, size = 'md' }) {
  const meta = ORDER_STATUS[status] || { label: status, color: colors.muted, soft: colors.surfaceAlt };
  return (
    <View style={[styles.status, { backgroundColor: meta.soft }, size === 'sm' && { paddingVertical: 3, paddingHorizontal: 9 }]} accessibilityLabel={`Status: ${meta.label}`}>
      <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function Tag({ label, tone = 'neutral', icon, style }) {
  const tones = {
    neutral: { bg: colors.surfaceAlt, fg: colors.text },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    accent: { bg: colors.accentSoft, fg: colors.accentDeep },
    brand: { bg: colors.brandSoft, fg: colors.brandDeep },
    glass: { bg: 'rgba(255,255,255,0.94)', fg: colors.ink },
    dark: { bg: 'rgba(17,28,26,0.72)', fg: '#fff' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, style]}>
      {icon ? <Feather name={icon} size={11} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.tagText, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }) {
  if (onPress) {
    return <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>{children}</PressableScale>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

export function Avatar({ name, size = 48, tone = 'accent' }) {
  const bg = tone === 'light' ? 'rgba(255,255,255,0.2)' : colors.accent;
  const fg = tone === 'light' ? '#fff' : colors.ink;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ color: fg, fontWeight: '800', fontSize: size * 0.36, letterSpacing: 0.5 }}>{initials(name)}</Text>
    </View>
  );
}

// Animated pill segmented control (Active / Past, etc.).
export function Segmented({ options, value, onChange, style }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => { Animated.spring(x, { toValue: index, useNativeDriver: true, speed: 22, bounciness: 4 }).start(); }, [index, x]);
  const seg = width ? (width - 8) / options.length : 0;
  return (
    <View style={[styles.segment, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {seg ? <Animated.View style={[styles.segmentThumb, { width: seg, transform: [{ translateX: Animated.multiply(x, seg) }] }]} /> : null}
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={styles.segmentItem} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={o.a11y || o.label}>
            <Text style={[styles.segmentText, selected && { color: colors.ink }]}>{o.label}</Text>
            {o.count != null ? (
              <View style={[styles.segmentCount, selected && { backgroundColor: colors.brand }]}>
                <Text style={[styles.segmentCountText, selected && { color: '#fff' }]}>{o.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({ icon, iconTone = 'brand', label, hint, onPress, last, right, danger, accessibilityLabel }) {
  const tones = { brand: [colors.brandSoft, colors.brand], accent: [colors.accentSoft, colors.accentDeep], danger: [colors.dangerSoft, colors.danger], neutral: [colors.surfaceAlt, colors.text] };
  const [bg, fg] = tones[danger ? 'danger' : iconTone];
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={accessibilityLabel || label} style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, { backgroundColor: bg }]}><Feather name={icon} size={18} color={fg} /></View>
      <View style={{ flex: 1, marginLeft: space.sm }}>
        <Text style={[type.bodyStrong, danger && { color: colors.danger }]}>{label}</Text>
        {hint ? <Text style={type.small} numberOfLines={1}>{hint}</Text> : null}
      </View>
      {right !== undefined ? right : !danger ? <Feather name="chevron-right" size={18} color={colors.faint} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: space.xl, borderWidth: 1 },
  buttonText: { fontWeight: '700', letterSpacing: 0.1 },
  trailing: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginRight: -10 },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: {
    position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.ink },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 38, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: space.xs,
  },
  chipText: { ...type.smallStrong },
  chipCount: { ...type.small, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.1 },
  tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.pill },
  tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  divider: { height: 1, backgroundColor: colors.divider },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 },
  segmentThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.pill, backgroundColor: colors.surface, ...shadow.card },
  segmentItem: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  segmentText: { ...type.smallStrong, color: colors.muted, fontSize: 14 },
  segmentCount: { marginLeft: 6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  segmentCountText: { fontSize: 11, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, minHeight: touch + 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
