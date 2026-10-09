import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space, type } from '../../constants/theme';

// Modal bottom sheet with a scrim; slides up, dismisses on scrim tap or Android back.
export function BottomSheet({ visible, onClose, title, children, footer }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, anim, mounted]);
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) + space.xs, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.grabber} />
        <View style={styles.head}>
          <Text style={[type.h2, { flex: 1 }]} accessibilityRole="header">{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Feather name="x" size={18} color={colors.ink} />
          </Pressable>
        </View>
        {children}
        {footer ? <View style={{ marginTop: space.md }}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}

export function OptionRow({ label, hint, selected, onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={styles.option} accessibilityRole="radio" accessibilityState={{ checked: !!selected }} accessibilityLabel={label}>
      {icon || null}
      <View style={{ flex: 1, marginLeft: icon ? space.sm : 0 }}>
        <Text style={[type.bodyStrong, selected && { color: colors.brand }]}>{label}</Text>
        {hint ? <Text style={type.small}>{hint}</Text> : null}
      </View>
      <View style={[styles.radio, selected && { borderColor: colors.brand }]}>{selected ? <View style={styles.radioDot} /> : null}</View>
    </Pressable>
  );
}

export function ToggleRow({ label, hint, value, onChange, leading }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.option} accessibilityRole="switch" accessibilityState={{ checked: !!value }} accessibilityLabel={label}>
      {leading || null}
      <View style={{ flex: 1, marginLeft: leading ? space.sm : 0 }}>
        <Text style={type.bodyStrong}>{label}</Text>
        {hint ? <Text style={type.small}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, value && { backgroundColor: colors.brand }]}>
        <View style={[styles.knob, value && { transform: [{ translateX: 18 }] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space.lg, ...shadow.raised },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 10, marginBottom: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xs },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider, minHeight: 56 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  track: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 3 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', ...shadow.card },
});
