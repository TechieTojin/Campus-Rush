import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/api';
import { colors, DIETARY, radius, space, type } from '../../constants/theme';
import { canteenVisual, foodVisual } from '../../utils/format';
import { IconButton, PressableScale } from './primitives';

// Uploaded images are stored as API-relative paths (/uploads/...).
export const imageUri = (path) => (path ? (/^https?:\/\//.test(path) ? path : `${API_URL}${path}`) : null);

// Real photo when the canteen uploaded one; otherwise a consistent illustrated tile (never a broken image).
export function FoodArt({ name, image, size = 72, height, rounded = radius.md, style, dimmed }) {
  const v = foodVisual(name);
  const [failed, setFailed] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const uri = imageUri(image);
  const h = height || size;
  const iconSize = Math.min((typeof size === 'number' ? Math.min(size, h) : h) * 0.44, 120);
  useEffect(() => { setFailed(false); fade.setValue(0); }, [uri, fade]);
  return (
    <View
      style={[styles.art, { width: size, height: h, borderRadius: rounded, backgroundColor: v.tint, opacity: dimmed ? 0.5 : 1 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.artGlow, { width: h * 1.1, height: h * 1.1, borderRadius: h, backgroundColor: v.color }]} />
      <MaterialCommunityIcons name={v.icon} size={iconSize} color={v.color} />
      {uri && !failed ? (
        <Animated.Image
          source={{ uri }}
          onError={() => setFailed(true)}
          onLoad={() => Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start()}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={[StyleSheet.absoluteFill, { opacity: fade }]}
        />
      ) : null}
    </View>
  );
}

export function CanteenCover({ canteen, height = 140, rounded = radius.lg, children, style, dim = 0.18 }) {
  const v = canteenVisual(canteen);
  const [failed, setFailed] = useState(false);
  const uri = imageUri(canteen?.coverImage);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={[styles.cover, { height, borderRadius: rounded, backgroundColor: v.bg }, style]}>
      {uri && !failed ? (
        <>
          <Image source={{ uri }} onError={() => setFailed(true)} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(17,28,26,${dim})` }]} />
        </>
      ) : (
        <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.coverDisc, { width: height * 1.5, height: height * 1.5, borderRadius: height, backgroundColor: v.fg, right: -height * 0.45, top: -height * 0.55 }]} />
          <View style={[styles.coverRing, { width: height * 1.1, height: height * 1.1, borderRadius: height, borderColor: v.fg, left: -height * 0.35, bottom: -height * 0.6 }]} />
          <MaterialCommunityIcons name={v.icon} size={height * 0.62} color={v.fg} style={[styles.coverIcon, { right: height * 0.12, top: height * 0.1 }]} />
        </View>
      )}
      {children}
    </View>
  );
}

// Standard Indian food-marking symbols (square outline + dot / triangle), only when the canteen set it.
export function DietMark({ dietary, size = 14, showLabel }) {
  const meta = DIETARY[dietary];
  if (!meta) return null;
  const mark = (
    <View style={[styles.mark, { width: size, height: size, borderColor: meta.color }]}>
      {meta.shape === 'triangle' ? (
        <View style={[styles.tri, { borderLeftWidth: size * 0.26, borderRightWidth: size * 0.26, borderBottomWidth: size * 0.44, borderBottomColor: meta.color }]} />
      ) : meta.shape === 'leaf' ? (
        <MaterialCommunityIcons name="leaf" size={size * 0.7} color={meta.color} />
      ) : (
        <View style={{ width: size * 0.46, height: size * 0.46, borderRadius: size, backgroundColor: meta.color }} />
      )}
    </View>
  );
  if (!showLabel) return <View accessibilityLabel={meta.label}>{mark}</View>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel={meta.label}>
      {mark}
      <Text style={[type.caption, { marginLeft: 6, color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function PrepTime({ minutes, light }) {
  if (!minutes) return null;
  return (
    <View style={[styles.prep, light && { backgroundColor: 'rgba(255,255,255,0.92)' }]} accessibilityLabel={`About ${minutes} minutes to prepare`}>
      <Feather name="clock" size={11} color={colors.muted} />
      <Text style={styles.prepText}>{minutes} min</Text>
    </View>
  );
}

export function QuantityStepper({ quantity, onIncrease, onDecrease, disabled, maxReached, compact, name, size = 'md' }) {
  const h = compact ? 36 : size === 'lg' ? 48 : 40;
  const bump = useRef(new Animated.Value(1)).current;
  const prev = useRef(quantity);
  useEffect(() => {
    if (quantity && prev.current && quantity !== prev.current) {
      bump.setValue(0.8);
      Animated.spring(bump, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 12 }).start();
    }
    prev.current = quantity;
  }, [quantity, bump]);
  if (!quantity) {
    return (
      <PressableScale
        onPress={onIncrease}
        disabled={disabled}
        scaleTo={0.9}
        hitSlop={6}
        accessibilityLabel={disabled ? `${name || 'Item'} unavailable` : `Add ${name || 'item'} to cart`}
        style={[styles.addBtn, { height: h }, disabled && styles.addDisabled]}
      >
        {!disabled ? <Feather name="plus" size={15} color={colors.brand} style={{ marginRight: 4 }} /> : null}
        <Text style={[styles.addText, disabled && { color: colors.faint }]}>{disabled ? 'Unavailable' : 'Add'}</Text>
      </PressableScale>
    );
  }
  return (
    <View style={[styles.stepper, { height: h }]}>
      <PressableScale onPress={onDecrease} scaleTo={0.82} hitSlop={8} accessibilityLabel={quantity === 1 ? `Remove ${name || 'item'}` : `Remove one ${name || 'item'}`} style={[styles.stepBtn, { height: h - 6, width: h - 6 }]}>
        <Feather name={quantity === 1 ? 'trash-2' : 'minus'} size={15} color={colors.onBrand} />
      </PressableScale>
      <Animated.Text style={[styles.stepQty, { transform: [{ scale: bump }] }]} accessibilityLabel={`Quantity ${quantity}`}>{quantity}</Animated.Text>
      <PressableScale onPress={onIncrease} disabled={disabled || maxReached} scaleTo={0.82} hitSlop={8} accessibilityLabel={`Add one more ${name || 'item'}`} style={[styles.stepBtn, { height: h - 6, width: h - 6, opacity: disabled || maxReached ? 0.4 : 1 }]}>
        <Feather name="plus" size={15} color={colors.onBrand} />
      </PressableScale>
    </View>
  );
}

export function ScreenHeader({ title, subtitle, onBack, right, transparent, large }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.xs }, transparent && { backgroundColor: 'transparent' }]}>
      <IconButton icon="arrow-left" onPress={onBack || (() => navigation.goBack())} accessibilityLabel="Go back" />
      <View style={{ flex: 1, marginHorizontal: space.sm }}>
        {title ? <Text style={large ? type.h1 : type.h2} numberOfLines={1} accessibilityRole="header">{title}</Text> : null}
        {subtitle ? <Text style={type.small} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right || <View style={{ width: 44 }} />}
    </View>
  );
}

export function SectionHeader({ title, subtitle, action, onAction, style, icon }) {
  return (
    <View style={[styles.section, style]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {icon ? <View style={styles.sectionIcon}>{icon}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={type.h2} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={[type.small, { marginTop: 1 }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {action ? (
        <PressableScale onPress={onAction} hitSlop={10} scaleTo={0.94} style={styles.sectionAction} accessibilityLabel={`${action}: ${title}`}>
          <Text style={[type.smallStrong, { color: colors.brand }]}>{action}</Text>
          <Feather name="chevron-right" size={15} color={colors.brand} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artGlow: { position: 'absolute', opacity: 0.07, bottom: '-35%', right: '-35%' },
  cover: { overflow: 'hidden', justifyContent: 'flex-end' },
  coverDisc: { position: 'absolute', opacity: 0.14 },
  coverRing: { position: 'absolute', borderWidth: 2, opacity: 0.22 },
  coverIcon: { position: 'absolute', opacity: 0.5 },
  mark: { borderWidth: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  tri: { width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  prep: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  prepText: { fontSize: 11, fontWeight: '700', color: colors.muted, marginLeft: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.surface },
  addDisabled: { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt, paddingHorizontal: 12 },
  addText: { fontSize: 13.5, fontWeight: '800', color: colors.brand, letterSpacing: 0.3 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.brand, paddingHorizontal: 3 },
  stepBtn: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepQty: { minWidth: 24, textAlign: 'center', color: colors.onBrand, fontWeight: '800', fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: colors.bg },
  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.sm },
  sectionIcon: { marginRight: space.xs },
  sectionAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
});
