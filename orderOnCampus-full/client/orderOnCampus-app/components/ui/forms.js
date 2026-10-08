import { Feather } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space, type } from '../../constants/theme';

export const TextField = forwardRef(function TextField(
  { label, icon, error, hint, secure, value, onChangeText, style, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.danger : focused ? colors.brand : colors.border;
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, { borderColor }, focused && styles.focused]}>
        {icon ? <Feather name={icon} size={18} color={focused ? colors.brand : colors.faint} style={{ marginRight: 10 }} /> : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure && hidden}
          placeholderTextColor={colors.faint}
          style={styles.input}
          accessibilityLabel={label}
          {...rest}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[type.small, { marginTop: 6 }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

export function SearchField({ value, onChangeText, placeholder, autoFocus, onSubmitEditing, editable = true, style }) {
  return (
    <View style={[styles.search, style]} pointerEvents={editable ? 'auto' : 'none'}>
      <Feather name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        style={styles.searchInput}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        editable={editable}
        autoCorrect={false}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Feather name="x" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.smallStrong, marginBottom: 8, color: colors.ink },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
  },
  focused: { backgroundColor: colors.brandTint },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  error: { fontSize: 13, color: colors.danger, marginLeft: 6, flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, marginLeft: 10, paddingVertical: 0 },
});
