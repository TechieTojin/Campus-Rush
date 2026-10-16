import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/theme';
import { Text } from './text';

// The Campus Rush mark: a tilted white tile with cutlery and a marigold "rush" dot.
export function BrandMark({ size = 44, onDark = true }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: onDark ? '#fff' : colors.brand }]}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={size * 0.5} color={onDark ? colors.brand : '#fff'} />
      </View>
      <View style={[styles.dot, { width: size * 0.3, height: size * 0.3, borderRadius: size, top: -size * 0.06, right: -size * 0.06, borderWidth: Math.max(2, size * 0.05), borderColor: onDark ? colors.brand : colors.bg }]} />
    </View>
  );
}

export function Wordmark({ size = 18, onDark = true }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="header" accessibilityLabel="Campus Rush">
      <BrandMark size={size * 2} onDark={onDark} />
      <Text style={{ marginLeft: size * 0.6, fontSize: size, fontWeight: '800', letterSpacing: -0.4, color: onDark ? '#fff' : colors.ink }}>
        Campus <Text style={{ color: onDark ? colors.accent : colors.brand }}>Rush</Text>
      </Text>
    </View>
  );
}

// Layered evergreen backdrop: deep arc, marigold ring and a fine dotted grid — the brand's texture.
export function BrandBackdrop({ style, tone = 'brand' }) {
  const deep = tone === 'ink' ? '#06221E' : colors.brandDeep;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: tone === 'ink' ? '#0A2E29' : colors.brand, overflow: 'hidden' }, style]} pointerEvents="none">
      <View style={[styles.arc, { backgroundColor: deep }]} />
      <View style={styles.ring} />
      <View style={styles.grid}>
        {Array.from({ length: 30 }).map((_, i) => <View key={i} style={styles.gridDot} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  dot: { position: 'absolute', backgroundColor: colors.accent },
  arc: { position: 'absolute', width: 520, height: 520, borderRadius: 260, top: -260, right: -230, opacity: 0.85 },
  ring: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 26, borderColor: 'rgba(245,165,36,0.16)', bottom: -110, left: -90 },
  grid: { position: 'absolute', right: 18, top: 120, width: 96, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.22 },
  gridDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#fff', margin: 6.5 },
});
