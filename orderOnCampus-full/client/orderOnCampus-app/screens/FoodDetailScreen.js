import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from '../components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { DishTile } from '../components/cards';
import { setStatusBarStyle } from 'expo-status-bar';
import { Banner, StatusBarScrim } from '../components/ui/feedback';
import { CanteenCover, DietMark, FoodArt } from '../components/ui/food';
import { OptionGroup } from '../components/ui/options';
import { Button, IconButton, PressableScale, Tag } from '../components/ui/primitives';
import { colors, DIETARY, radius, shadow, space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import useCart from '../hooks/useCart';
import { isOpen, useCatalog } from '../hooks/useCatalog';
import { recordView } from '../hooks/useRecent';
import { selectCartItems } from '../slices/CartSlice';
import { formatPrice } from '../utils/format';
import {
  activeGroups, addonsTotal, defaultSelections, firstProblem, INSTRUCTIONS_MAX,
  syncSelections, toggleOption, unitPriceOf,
} from '../utils/customisation';

export default function FoodDetailScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { params } = useRoute();
  const catalog = useCatalog();
  const config = useAppConfig();
  // Prefer the live catalogue copy so price/availability are current; fall back to what was tapped.
  const live = catalog.findItem(params.itemId || params.item?._id);
  const item = live?.item || params.item;
  const canteen = live?.canteen || catalog.canteenById(params.canteenId) || params.canteen;
  const lines = useSelector(selectCartItems);
  const { add, update, editLine, cartCanteen, maxQty } = useCart();

  // Opened from a cart row to change that exact line, rather than to add another one.
  const editing = params.lineKey ? lines.find(l => l.lineKey === params.lineKey) : null;
  const groups = useMemo(() => activeGroups(item), [item]);
  const myLines = lines.filter(l => l._id === item?._id);
  // Keep the old "adjust the quantity already in your cart" behaviour for plain dishes.
  const simpleLine = !editing && !groups.length && myLines.length === 1 ? myLines[0] : null;

  const [selections, setSelections] = useState(
    () => (editing ? syncSelections(item, editing.selections) : defaultSelections(item))
  );
  const [instructions, setInstructions] = useState(editing?.instructions || '');
  const [quantity, setQuantity] = useState(editing?.quantity || simpleLine?.quantity || 1);
  // Customisation makes this screen long enough to scroll the hero away. Once it does, the
  // light status-bar icons would sit on the pale sheet, so swap them and lay down a scrim.
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => { setStatusBarStyle(pastHero ? 'dark' : 'light'); }, [pastHero]);

  useEffect(() => { if (item?._id && canteen?._id) recordView(item._id, canteen._id); }, [item?._id, canteen?._id]);

  const more = useMemo(
    () => (canteen?.menu || []).filter(m => m && m._id !== item?._id && m.available).slice(0, 8),
    [canteen, item?._id]
  );

  if (!item || !canteen) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const closed = !isOpen(canteen) || !!config.maintenance?.enabled;
  const unavailable = !item.available || closed;
  const sameCanteen = !cartCanteen || cartCanteen._id === canteen._id;
  const diet = DIETARY[item.dietary];
  const heroH = Math.min(width * 0.9, 380);

  const extras = addonsTotal(selections);
  const unitPrice = unitPriceOf(item, selections);
  const total = unitPrice * quantity;
  // Blocks the button and explains itself, so nobody is left tapping a dead control.
  const problem = firstProblem(item, selections);

  const commit = () => {
    if (problem) return;
    if (editing) editLine(editing.lineKey, { item, selections, instructions, quantity });
    else if (simpleLine) update(simpleLine.lineKey, quantity);
    else add(item, canteen, quantity, { selections, instructions });
    navigation.goBack();
  };

  const actionTitle = editing ? 'Update item' : simpleLine ? 'Update cart' : 'Add to cart';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 190 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > heroH - insets.top - 40;
          if (past !== pastHero) setPastHero(past);
        }}
      >
        <FoodArt name={item.name} image={item.image} size={width} height={heroH + insets.top} rounded={0} dimmed={!item.available} />
        <View style={styles.sheet}>
          <View style={styles.badges}>
            {diet ? <View style={styles.dietChip}><DietMark dietary={item.dietary} size={14} showLabel /></View> : null}
            {item.prepTime ? <Tag label={`About ${item.prepTime} min to prepare`} icon="clock" tone="neutral" style={{ marginLeft: diet ? space.xs : 0 }} /> : null}
          </View>
          <Text style={[type.display, { letterSpacing: 0 }]}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xs }}>
            <Text style={[type.h1, { color: colors.brand }]}>{formatPrice(item.price)}</Text>
            {groups.length ? <Text style={[type.small, { marginLeft: 8 }]}>before choices</Text> : null}
            {!item.available ? <Tag label="Not available right now" tone="danger" icon="x" style={{ marginLeft: space.sm }} /> : null}
          </View>
          {item.category ? <Text style={[type.caption, { marginTop: space.xs }]}>{item.category.toUpperCase()}</Text> : null}
          {item.description ? <Text style={[type.body, { marginTop: space.md, color: colors.text, fontSize: 15.5, lineHeight: 23 }]}>{item.description}</Text> : null}

          <PressableScale onPress={() => navigation.navigate('Canteen', { canteenId: canteen._id, canteen })} scaleTo={0.985} style={styles.from} accessibilityLabel={`From ${canteen.name}. Open canteen`}>
            <CanteenCover canteen={canteen} height={48} rounded={radius.sm} style={{ width: 48 }} />
            <View style={{ flex: 1, marginLeft: space.sm }}>
              <Text style={type.bodyStrong} numberOfLines={1}>{canteen.name}</Text>
              <Text style={type.small} numberOfLines={1}>{isOpen(canteen) ? 'Open now' : 'Closed now'} · Pickup at the counter</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.faint} />
          </PressableScale>

          {config.maintenance?.enabled ? <Banner tone="warning" title="Ordering paused" message={config.maintenance.message || 'Ordering is paused for maintenance.'} style={{ marginTop: space.md }} />
            : !isOpen(canteen) ? <Banner tone="warning" message={`${canteen.name} isn't taking orders right now.`} style={{ marginTop: space.md }} /> : null}
          {!sameCanteen && !unavailable ? (
            <Banner tone="info" message={`Your cart has items from ${cartCanteen.name}. Adding this starts a new cart.`} style={{ marginTop: space.md }} />
          ) : null}

          {/* ---- customisation ---- */}
          {groups.map(group => (
            <OptionGroup
              key={group.key}
              group={group}
              selections={selections}
              disabled={unavailable}
              onToggle={(g, o) => setSelections(s => toggleOption(s, g, o))}
            />
          ))}

          {!unavailable ? (
            <View style={{ marginTop: space.lg }}>
              <View style={styles.header}>
                <Text style={type.h3}>Anything else?</Text>
                <View style={styles.rule}><Text style={styles.ruleText}>Optional</Text></View>
              </View>
              <View style={styles.noteBox}>
                <TextInput
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholder="e.g. less oil, no onion, cut in half"
                  placeholderTextColor={colors.faint}
                  multiline
                  maxLength={INSTRUCTIONS_MAX}
                  style={styles.noteInput}
                  accessibilityLabel="Special instructions for the kitchen"
                />
                <Text style={[type.caption, { textAlign: 'right', marginTop: 4 }]}>{instructions.length}/{INSTRUCTIONS_MAX}</Text>
              </View>
              <Text style={[type.caption, { marginTop: 6 }]}>
                The canteen sees this with your order. It can't change the price, and some requests may not be possible.
              </Text>
            </View>
          ) : null}
        </View>

        {more.length ? (
          <View style={{ marginTop: space.xl }}>
            <Text style={[type.h2, { paddingHorizontal: space.lg, marginBottom: space.sm }]}>More from {canteen.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: 2 }}>
              {more.map(m => <DishTile key={m._id} item={m} canteen={canteen} width={150} caption={m.category || undefined} />)}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <StatusBarScrim visible={pastHero} extra={space.xs + 48 + space.xs} />
      <IconButton icon="x" tone="glass" onPress={() => navigation.goBack()} accessibilityLabel="Close" style={[styles.close, { top: insets.top + space.xs }]} />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {problem && !unavailable ? (
          <View style={styles.problem} accessibilityLiveRegion="polite">
            <Feather name="info" size={13} color={colors.accentDeep} />
            <Text style={[type.caption, { color: colors.accentDeep, marginLeft: 6 }]}>{problem}</Text>
          </View>
        ) : extras > 0 ? (
          <View style={styles.problem}>
            <Text style={[type.caption, { color: colors.muted }]}>
              {formatPrice(item.price)} + {formatPrice(extras)} of extras{quantity > 1 ? ` × ${quantity}` : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          {unavailable ? (
            <Button title={!item.available ? 'Not available right now' : 'Canteen closed'} disabled variant="secondary" style={{ flex: 1 }} />
          ) : (
            <>
              <View style={styles.qty}>
                <IconButton icon="minus" tone="soft" size={42} disabled={quantity <= 1} onPress={() => setQuantity(q => Math.max(1, q - 1))} accessibilityLabel="Decrease quantity" />
                <Text style={styles.qtyText} accessibilityLabel={`Quantity ${quantity}`}>{quantity}</Text>
                <IconButton icon="plus" tone="soft" size={42} disabled={quantity >= maxQty} onPress={() => setQuantity(q => Math.min(maxQty, q + 1))} accessibilityLabel="Increase quantity" />
              </View>
              <Button
                title={actionTitle}
                trailing={formatPrice(total)}
                disabled={!!problem}
                onPress={commit}
                style={{ flex: 1, marginLeft: space.sm, paddingHorizontal: space.lg }}
              />
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: { marginTop: -28, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingTop: space.lg },
  badges: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm, flexWrap: 'wrap' },
  dietChip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: colors.divider },
  from: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, padding: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider, ...shadow.card },
  close: { position: 'absolute', right: space.lg, zIndex: 11, elevation: 31 },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.xs },
  rule: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginLeft: space.sm },
  ruleText: { ...type.caption, color: colors.muted },
  noteBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, padding: space.sm, ...shadow.card },
  noteInput: { minHeight: 64, maxHeight: 120, textAlignVertical: 'top', fontSize: 14.5, lineHeight: 21, color: colors.ink, padding: 0 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: space.lg, paddingTop: space.sm, backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow.raised,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.xs },
  problem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  qty: { flexDirection: 'row', alignItems: 'center' },
  qtyText: { minWidth: 34, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink },
});
