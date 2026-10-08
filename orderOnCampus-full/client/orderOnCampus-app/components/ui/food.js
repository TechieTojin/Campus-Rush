import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/api';
import { colors, radius, space, type } from '../../constants/theme';
import { canteenVisual, foodVisual } from '../../utils/format';
import { IconButton, PressableScale } from './primitives';

// Uploaded images are stored as API-relative paths (/uploads/...).
export const imageUri = (path) => (path ? (/^https?:\/\//.test(path) ? path : `${API_URL}${path}`) : null);

export function FoodArt({ name, image, size = 72, rounded = radius.md, style, dimmed }) {
  const v = foodVisual(name);
  const [failed, setFailed] = useState(false);
  const uri = imageUri(image);
  useEffect(() => setFailed(false), [uri]);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={[{ width: size, height: size, borderRadius: rounded, backgroundColor: colors.surfaceMuted, opacity: dimmed ? 0.55 : 1 }, style]}
      />
    );
  }
  return (
    <View
      style={[styles.art, { width: size, height: size, borderRadius: rounded, backgroundColor: v.tint, opacity: dimmed ? 0.55 : 1 }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialCommunityIcons name={v.icon} size={size * 0.46} color={v.color} />
      <View style={[styles.artGlow, { width: size * 0.9, height: size * 0.9, borderRadius: size, backgroundColor: v.color }]} />
    </View>
  );
}

export function CanteenCover({ canteen, height = 140, rounded = radius.lg, children, style }) {
  const v = canteenVisual(canteen);
  const [failed, setFailed] = useState(false);
  const uri = imageUri(canteen?.coverImage);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={[styles.cover, { height, borderRadius: rounded, backgroundColor: v.bg }, style]}>
      {uri && !failed ? (
        <>
          <Image source={{ uri }} onError={() => setFailed(true)} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(19,32,31,0.18)' }]} />
        </>
      ) : (
        <>
          <MaterialCommunityIcons name={v.icon} size={height * 0.95} color={v.fg} style={styles.coverIconBig} />
          <MaterialCommunityIcons name="silverware-fork-knife" size={height * 0.28} color={v.fg} style={styles.coverIconSmall} />
          <View style={[styles.coverRing, { width: height * 1.4, height: height * 1.4, borderRadius: height, borderColor: v.fg }]} />
        </>
      )}
      {children}
    </View>
  );
}

export function QuantityStepper({ quantity, onIncrease, onDecrease, disabled, compact, name }) {
  if (!quantity) {
    return (
      <PressableScale
        onPress={onIncrease}
        disabled={disabled}
        scaleTo={0.92}
        accessibilityLabel={`Add ${name || 'item'} to cart`}
        style={[styles.addBtn, compact && { height: 34, paddingHorizontal: 14 }, disabled && { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted }]}
      >
        <Text style={[styles.addText, disabled && { color: colors.faint }]}>{disabled ? 'Sold out' : 'ADD'}</Text>
        {!disabled ? <Feather name="plus" size={14} color={colors.brand} style={{ marginLeft: 4 }} /> : null}
      </PressableScale>
    );
  }
  return (
    <View style={[styles.stepper, compact && { height: 34 }]}>
      <PressableScale onPress={onDecrease} scaleTo={0.85} hitSlop={6} accessibilityLabel={`Remove one ${name || 'item'}`} style={styles.stepBtn}>
        <Feather name={quantity === 1 ? 'trash-2' : 'minus'} size={15} color={colors.onBrand} />
      </PressableScale>
      <Text style={styles.stepQty} accessibilityLabel={`Quantity ${quantity}`}>{quantity}</Text>
      <PressableScale onPress={onIncrease} disabled={disabled} scaleTo={0.85} hitSlop={6} accessibilityLabel={`Add one more ${name || 'item'}`} style={styles.stepBtn}>
        <Feather name="plus" size={15} color={colors.onBrand} />
      </PressableScale>
    </View>
  );
}

export function ScreenHeader({ title, subtitle, onBack, right, transparent }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.xs }, transparent && { backgroundColor: 'transparent' }]}>
      <IconButton icon="arrow-left" onPress={onBack || (() => navigation.goBack())} accessibilityLabel="Go back" />
      <View style={{ flex: 1, marginHorizontal: space.sm }}>
        {title ? <Text style={type.h2} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text style={type.small} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right || <View style={{ width: 44 }} />}
    </View>
  );
}

export function SectionHeader({ title, action, onAction, style }) {
  return (
    <View style={[styles.section, style]}>
      <Text style={type.h2}>{title}</Text>
      {action ? (
        <PressableScale onPress={onAction} hitSlop={8} scaleTo={0.94}>
          <Text style={[type.smallStrong, { color: colors.brand }]}>{action}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artGlow: { position: 'absolute', opacity: 0.06, bottom: -20, right: -20 },
  cover: { overflow: 'hidden', justifyContent: 'flex-end' },
  coverIconBig: { position: 'absolute', right: -18, top: -10, opacity: 0.35 },
  coverIconSmall: { position: 'absolute', left: 18, top: 16, opacity: 0.5 },
  coverRing: { position: 'absolute', left: -40, bottom: -70, borderWidth: 1.5, opacity: 0.25 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  addText: { fontSize: 13, fontWeight: '800', color: colors.brand, letterSpacing: 0.6 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    paddingHorizontal: 4,
  },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepQty: { minWidth: 22, textAlign: 'center', color: colors.onBrand, fontWeight: '800', fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: colors.bg },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
});
