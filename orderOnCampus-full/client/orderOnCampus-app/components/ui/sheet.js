import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space, type } from '../../constants/theme';
import { Text } from './text';

// Modal bottom sheet with a scrim; slides up, dismisses on scrim tap or Android back.
export function BottomSheet({ visible, onClose, title, subtitle, children, footer, dismissable = true }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 3 }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 170, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, anim, mounted]);
  if (!mounted) return null;
  const close = dismissable ? onClose : undefined;
  return (
    <Modal transparent visible animationType="none" onRequestClose={close || (() => {})} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) + space.xs, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.grabber} />
        {title ? (
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={type.h2} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={[type.small, { marginTop: 2 }]}>{subtitle}</Text> : null}
            </View>
            {close ? (
              <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
                <Feather name="x" size={18} color={colors.ink} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {children}
        {footer ? <View style={{ marginTop: space.md }}>{footer}</View> : null}
      </Animated.View>
    </Modal>
  );
}

export function SheetButton({ label, onPress, tone = 'primary', style, icon }) {
  const t = {
    primary: [colors.brand, colors.onBrand, colors.brand],
    danger: [colors.danger, '#fff', colors.danger],
    secondary: [colors.surface, colors.ink, colors.border],
  }[tone];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, { backgroundColor: t[0], borderColor: t[2], opacity: pressed ? 0.85 : 1 }, style]}>
      {icon ? <Feather name={icon} size={17} color={t[1]} style={{ marginRight: 8 }} /> : null}
      <Text style={[type.bodyStrong, { color: t[1] }]}>{label}</Text>
    </Pressable>
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

// ---------------------------------------------------------------- confirm()
// Promise-based confirmation sheet that replaces the stock Android alert dialogs:
//   if (await confirm({ title, message, confirmLabel, tone: 'danger' })) { ... }
let confirmListener = null;
export const confirm = (opts) => new Promise((resolve) => {
  if (!confirmListener) { resolve(false); return; }
  confirmListener({ ...opts, resolve });
});
export const notify = (opts) => confirm({ ...opts, single: true });

export function ConfirmHost() {
  const [req, setReq] = useState(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    confirmListener = (r) => { setReq(r); setVisible(true); };
    return () => { confirmListener = null; };
  }, []);
  const done = (result) => { setVisible(false); req?.resolve(result); };
  const icon = req?.icon || (req?.tone === 'danger' ? 'alert-triangle' : 'info');
  const tint = req?.tone === 'danger' ? [colors.dangerSoft, colors.danger] : [colors.brandTint, colors.brand];
  return (
    <BottomSheet visible={visible} onClose={() => done(false)}>
      {req ? (
        <View style={{ paddingTop: space.xs }}>
          <View style={[styles.confirmIcon, { backgroundColor: tint[0] }]}><Feather name={icon} size={24} color={tint[1]} /></View>
          <Text style={[type.h2, { marginTop: space.md }]} accessibilityRole="header">{req.title}</Text>
          {req.message ? <Text style={[type.body, { color: colors.muted, marginTop: 6 }]}>{req.message}</Text> : null}
          <View style={{ flexDirection: 'row', marginTop: space.xl }}>
            {!req.single ? <SheetButton label={req.cancelLabel || 'Cancel'} tone="secondary" onPress={() => done(false)} style={{ flex: 1, marginRight: space.sm }} /> : null}
            <SheetButton label={req.confirmLabel || 'OK'} tone={req.tone === 'danger' ? 'danger' : 'primary'} onPress={() => done(true)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space.lg, ...shadow.raised },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 10, marginBottom: space.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.xs },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider, minHeight: 56 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  track: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 3 },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', ...shadow.card },
  btn: { height: 52, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: space.lg },
  confirmIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
