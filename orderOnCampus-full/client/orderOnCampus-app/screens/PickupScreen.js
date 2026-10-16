import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandBackdrop, Wordmark } from '../components/ui/brand';
import { ErrorState } from '../components/ui/feedback';
import { Button, Card, IconButton } from '../components/ui/primitives';
import { Text } from '../components/ui/text';
import { colors, ORDER_STATUS, radius, shadow, space, type } from '../constants/theme';
import { useRealtime } from '../hooks/useRealtime';
import { errorMessage, getMyOrders, getPickupToken, isNetworkError } from '../services/api';
import { formatPrice, orderRef } from '../utils/format';

// The pickup ticket: a short-lived QR the counter scans to verify and release an order.
//
// The QR arrives from the server as a PNG data URI, so the app needs no QR library (see
// server/lib/qr.js). The credential lasts five minutes and is refreshed automatically a little
// before it lapses, and again whenever the screen is returned to.
const REFRESH_MARGIN_MS = 20000;

export default function PickupScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute();
  const orderId = params?.orderId;

  const [order, setOrder] = useState(params?.order || null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!params?.order);
  const [remaining, setRemaining] = useState(0);
  const timer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; clearTimeout(timer.current); }, []);

  const loadOrder = useCallback(async () => {
    try {
      const list = await getMyOrders();
      const found = list.find(o => String(o._id) === String(orderId));
      if (mounted.current && found) setOrder(found);
      return found;
    } catch {
      return null;
    }
  }, [orderId]);

  // Fetches a credential. Only ever called for an order that is Ready; any other state is
  // reported by the server and shown as a plain explanation rather than an error.
  const issue = useCallback(async () => {
    setError(null);
    try {
      const data = await getPickupToken(orderId);
      if (!mounted.current) return;
      setToken(data);
      clearTimeout(timer.current);
      const ttl = Math.max(5000, new Date(data.expiresAt).getTime() - Date.now() - REFRESH_MARGIN_MS);
      timer.current = setTimeout(() => { if (mounted.current) issue(); }, ttl);
    } catch (e) {
      if (!mounted.current) return;
      setToken(null);
      const code = e?.response?.data?.code;
      setError({ code, message: errorMessage(e, 'Could not get your pickup code just now.'), offline: isNetworkError(e) });
      if (code) loadOrder();
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [orderId, loadOrder]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const found = await loadOrder();
    const status = found?.status || order?.status;
    if (status === 'Ready') await issue();
    else if (mounted.current) { setToken(null); setLoading(false); }
  }, [loadOrder, issue, order?.status]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Coming back from the lock screen with a lapsed code is the common case, so re-issue then too.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  // The counter completing the order should close the ticket immediately.
  useRealtime('order.updated', (e) => { if (e.type === 'resync' || String(e.orderId) === String(orderId)) refresh(); }, { debounceMs: 150 });

  // Countdown, so the student can see the code is still live.
  useEffect(() => {
    if (!token) return undefined;
    const tick = () => setRemaining(Math.max(0, new Date(token.expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [token]);

  const status = order?.status;
  const meta = ORDER_STATUS[status] || null;
  const seconds = Math.ceil(remaining / 1000);
  const expired = token && remaining <= 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand }}>
      <BrandBackdrop />
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <IconButton icon="arrow-left" tone="glass" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <View style={{ flex: 1, alignItems: 'center' }}><Wordmark size={15} /></View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: insets.bottom + space.xl }}>
        <Text style={styles.heading}>Collect your order</Text>
        <Text style={styles.sub}>
          {order?.canteen?.name ? `Show this at ${order.canteen.name}` : 'Show this at the counter'}
        </Text>

        {loading && !token ? (
          <Card style={styles.ticket}>
            <ActivityIndicator color={colors.brand} />
            <Text style={[type.small, { marginTop: space.sm }]}>Getting your pickup code…</Text>
          </Card>
        ) : status === 'Completed' ? (
          <Card style={styles.ticket}>
            <View style={[styles.state, { backgroundColor: colors.successSoft }]}><Feather name="check" size={26} color={colors.success} /></View>
            <Text style={[type.h2, { marginTop: space.md, textAlign: 'center' }]}>Collected</Text>
            <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>This order has been handed over. Enjoy your meal.</Text>
            <Button title="Back to my orders" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
          </Card>
        ) : status === 'Cancelled' ? (
          <Card style={styles.ticket}>
            <View style={[styles.state, { backgroundColor: colors.dangerSoft }]}><Feather name="x" size={26} color={colors.danger} /></View>
            <Text style={[type.h2, { marginTop: space.md, textAlign: 'center' }]}>Order cancelled</Text>
            <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>There is nothing to collect. Speak to the counter if this looks wrong.</Text>
          </Card>
        ) : status && status !== 'Ready' ? (
          <Card style={styles.ticket}>
            <View style={[styles.state, { backgroundColor: meta?.soft || colors.surfaceAlt }]}>
              <Feather name={meta?.icon || 'clock'} size={24} color={meta?.color || colors.muted} />
            </View>
            <Text style={[type.h2, { marginTop: space.md, textAlign: 'center' }]}>{meta?.title || 'Not ready yet'}</Text>
            <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>
              Your pickup code appears here as soon as the canteen marks this order ready.
            </Text>
            <Button title="Check again" variant="secondary" icon="refresh-cw" onPress={refresh} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
          </Card>
        ) : error && !token ? (
          <Card style={styles.ticket}>
            <ErrorState
              compact
              offline={error.offline}
              message={error.message}
              onRetry={refresh}
            />
          </Card>
        ) : token ? (
          <Card style={styles.ticket}>
            {/* Plain white surround and no decoration over the code itself — scanners need the
                quiet zone and the contrast more than the ticket needs styling. */}
            <View style={styles.qrFrame}>
              <Image
                source={{ uri: token.qr }}
                style={styles.qr}
                resizeMode="contain"
                accessibilityLabel="Your pickup QR code"
              />
              {expired ? (
                <View style={styles.expired}>
                  <Feather name="refresh-cw" size={20} color={colors.ink} />
                  <Text style={[type.smallStrong, { marginTop: 6 }]}>Code expired</Text>
                </View>
              ) : null}
            </View>

            <Text style={[type.overline, { marginTop: space.md }]}>Order</Text>
            <Text style={styles.ref} accessibilityLabel={`Order ${token.ref}`}>{token.ref}</Text>

            {expired ? (
              <Button title="Get a new code" icon="refresh-cw" onPress={issue} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
            ) : (
              <View style={styles.countdown} accessibilityLiveRegion="polite">
                <Feather name="clock" size={13} color={colors.muted} />
                <Text style={[type.caption, { marginLeft: 5 }]}>
                  Refreshes automatically · valid for {seconds > 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds}s`}
                </Text>
              </View>
            )}
          </Card>
        ) : (
          <Card style={styles.ticket}>
            <Text style={[type.small, { textAlign: 'center' }]}>This order is not available for pickup.</Text>
            <Button title="Try again" variant="secondary" onPress={refresh} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
          </Card>
        )}

        {order ? (
          <View style={styles.summary}>
            <Row label="Order" value={orderRef(order._id)} />
            <Row label="Items" value={String((order.lineItems || []).reduce((n, l) => n + (l.quantity || 0), 0) || (order.items || []).length)} />
            <Row label="Payment" value={order.paymentStatus === 'paid' ? 'Paid at the counter' : 'Pay at the counter'} />
            <Row label="Total" value={formatPrice(order.totalPrice)} strong />
          </View>
        ) : null}

        <View style={styles.help}>
          <Feather name="info" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.helpText}>
            Can't scan? The counter can look your order up by its number instead.
            {order?.paymentStatus !== 'paid' ? ' Payment is collected at the counter before your order is handed over.' : ''}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontWeight: '800', fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm },
  heading: { ...type.h1, color: '#fff', textAlign: 'center' },
  sub: { ...type.body, color: colors.onBrandMuted, textAlign: 'center', marginTop: 4, marginBottom: space.lg },
  ticket: { alignItems: 'center', padding: space.lg, borderRadius: radius.xl, ...shadow.raised },
  qrFrame: { backgroundColor: '#fff', borderRadius: radius.md, padding: space.sm, alignItems: 'center', justifyContent: 'center' },
  qr: { width: 232, height: 232 },
  expired: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248,245,239,0.94)', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  ref: { ...type.code, fontSize: 30, letterSpacing: 5, marginTop: 2 },
  countdown: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  state: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summary: { marginTop: space.lg, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  rowLabel: { ...type.small, color: colors.onBrandMuted },
  rowValue: { ...type.bodyStrong, color: '#fff' },
  help: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.lg, paddingHorizontal: space.xs },
  helpText: { ...type.caption, color: 'rgba(255,255,255,0.8)', marginLeft: 8, flex: 1, lineHeight: 17 },
});
