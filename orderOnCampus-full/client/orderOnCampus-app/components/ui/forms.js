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
        {icon ? <Feather name={icon} size={18} color={error ? colors.danger : focused ? colors.brand : colors.faint} style={{ marginRight: 10 }} /> : null}
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
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={12} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[type.small, { marginTop: 6 }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

export const SearchField = forwardRef(function SearchField(
  { value, onChangeText, placeholder, autoFocus, onSubmitEditing, editable = true, style, onFilter, filterActive, onFocus, onBlur },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && { borderColor: colors.brand, backgroundColor: colors.surface }, style]} pointerEvents={editable ? 'auto' : 'none'}>
      <Feather name="search" size={18} color={focused ? colors.brand : colors.muted} />
      <TextInput
        ref={ref}
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
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Clear search" style={styles.clear}>
          <Feather name="x" size={14} color={colors.surface} />
        </Pressable>
      ) : null}
      {onFilter ? (
        <Pressable onPress={onFilter} hitSlop={8} accessibilityRole="button" accessibilityLabel="Sort and filter" style={[styles.filterBtn, filterActive && { backgroundColor: colors.brand }]}>
          <Feather name="sliders" size={16} color={filterActive ? colors.onBrand : colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { ...type.smallStrong, marginBottom: 8, color: colors.ink },
  field: { flexDirection: 'row', alignItems: 'center', height: 56, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, backgroundColor: colors.surface },
  focused: { backgroundColor: colors.brandTint },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  error: { fontSize: 13, color: colors.danger, marginLeft: 6, flex: 1 },
  search: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: radius.pill, paddingLeft: space.md, paddingRight: 6, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, marginLeft: 10, paddingVertical: 0 },
  clear: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.faint, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  filterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
