import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadow, space, touch, type } from '../../constants/theme';
import { formatPrice } from '../../utils/format';
import { chosenIn, isChosen, maxFor, minFor } from '../../utils/customisation';
import { PressableScale } from './primitives';
import { Text } from './text';

// One canteen-defined choice group (Size, Toppings, Spice level…) rendered as a card of options.
//
// Single-select groups use a radio mark, multi-select a checkbox, matching what a tap will do.
// The header always says what is expected — "Required · choose 1", "Optional · up to 2" — so a
// student is never left guessing why the Add button is still disabled.
export function OptionGroup({ group, selections, onToggle, disabled }) {
  const picked = chosenIn(selections, group.key);
  const max = maxFor(group);
  const min = minFor(group);
  const atLimit = group.multiple && picked.length >= max;

  const rule = group.multiple
    ? (min > 0 ? `Choose ${min === max ? min : `${min}–${max}`}` : `Up to ${max}`)
    : 'Choose 1';

  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{group.name}</Text>
          {group.description ? <Text style={[type.small, { marginTop: 1 }]}>{group.description}</Text> : null}
        </View>
        <View style={[styles.rule, group.required && styles.ruleRequired]}>
          <Text style={[styles.ruleText, group.required && { color: colors.brandDeep }]}>
            {group.required ? `Required · ${rule.toLowerCase()}` : rule}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {(group.options || []).map((option, index) => {
          const selected = isChosen(selections, group.key, option.key);
          const soldOut = option.available === false;
          // Blocked only when adding another would exceed the group's maximum.
          const blocked = disabled || soldOut || (!selected && atLimit);
          return (
            <PressableScale
              key={option.key}
              onPress={() => !blocked && onToggle(group, option)}
              disabled={blocked}
              scaleTo={0.99}
              accessibilityRole={group.multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: selected, disabled: blocked }}
              accessibilityLabel={`${option.label}${option.priceDelta ? `, plus ${formatPrice(option.priceDelta)}` : ''}${soldOut ? ', sold out' : ''}`}
              style={[styles.row, index > 0 && styles.rowDivider, selected && styles.rowSelected]}
            >
              <View style={[
                group.multiple ? styles.box : styles.radio,
                selected && { borderColor: colors.brand, backgroundColor: colors.brand },
                blocked && !selected && { borderColor: colors.border },
              ]}>
                {selected ? <Feather name="check" size={12} color="#fff" /> : null}
              </View>
              <Text
                style={[type.bodyStrong, { flex: 1, marginLeft: space.sm }, selected && { color: colors.brandDeep }, (soldOut || (blocked && !selected)) && { color: colors.faint }]}
                numberOfLines={2}
              >
                {option.label}
              </Text>
              {soldOut ? (
                <Text style={[type.caption, { color: colors.faint }]}>Sold out</Text>
              ) : option.priceDelta ? (
                <Text style={[type.smallStrong, { color: selected ? colors.brand : colors.text }]}>+{formatPrice(option.priceDelta)}</Text>
              ) : (
                <Text style={[type.caption, { color: colors.faint }]}>No extra charge</Text>
              )}
            </PressableScale>
          );
        })}
      </View>
      {atLimit ? (
        <Text style={[type.caption, { marginTop: 6 }]}>That's the most you can pick here — deselect one to change it.</Text>
      ) : null}
    </View>
  );
}

// Compact "Large · Extra onion" line used on cart rows and order history.
export function SelectionSummary({ selections = [], instructions = '', style, tone = 'muted' }) {
  if (!selections.length && !instructions) return null;
  return (
    <View style={style}>
      {selections.length ? (
        <Text style={[type.small, tone === 'strong' && { color: colors.text }]} numberOfLines={2}>
          {selections.map(s => s.label).join(' · ')}
        </Text>
      ) : null}
      {instructions ? (
        <View style={styles.note}>
          <Feather name="message-square" size={11} color={colors.accentDeep} />
          <Text style={[type.caption, { color: colors.accentDeep, marginLeft: 5, flex: 1 }]} numberOfLines={3}>{instructions}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: space.lg },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.xs },
  rule: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginLeft: space.sm },
  ruleRequired: { backgroundColor: colors.brandSoft },
  ruleText: { ...type.caption, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden', ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: 13, minHeight: touch },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  rowSelected: { backgroundColor: colors.brandTint },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4, backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 5 },
});
