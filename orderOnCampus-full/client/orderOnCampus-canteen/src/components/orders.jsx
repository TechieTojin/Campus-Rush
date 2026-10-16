import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCheck, FiClock, FiCreditCard, FiExternalLink, FiMapPin, FiMessageSquare, FiRotateCcw, FiUser } from 'react-icons/fi';
import { api, errorMessage, TRANSITIONS } from '../lib/api';
import { useToast } from './ui/useToast';
import { ACTION_LABEL, STATUS } from '../lib/constants';
import { useAsync } from '../lib/hooks';
import { useCanteenId, useSession } from '../lib/sessionContext';
import { formatDateTime, formatTime, money, orderRef } from '../lib/format';
import Button from './ui/Button';
import { Avatar, KeyValue, PaymentBadge, StatusBadge } from './ui/Display';
import { ErrorState, SkeletonRows } from './ui/Feedback';
import { Drawer } from './ui/Overlay';
import useOrderActions from './useOrderActions';

// Buttons for exactly the transitions the backend allows from the current status.
export function OrderActions({ order, actions, size = 'md', layout = 'row', showPayment = true }) {
  const next = TRANSITIONS[order.status] || [];
  const { advance, setPaid, busy } = actions;
  const primary = next.filter((s) => s !== 'Cancelled');
  const canPay = showPayment && ['Processing', 'Ready', 'Completed'].includes(order.status);
  if (!next.length && !canPay) return null;
  return (
    <div className={`flex gap-2 ${layout === 'column' ? 'flex-col' : 'flex-wrap'}`}>
      {primary.map((s, i) => (
        <Button
          key={s}
          size={size}
          variant={i === 0 ? (s === 'Ready' ? 'accent' : 'primary') : 'secondary'}
          loading={busy === `${order._id}:${s}`}
          disabled={!!busy && busy.startsWith(order._id)}
          onClick={() => advance(order, s)}
          icon={FiCheck}
          className={layout === 'column' ? 'w-full' : ''}
        >
          {order.status === 'Processing' && s === 'Completed' ? 'Collected (skip ready)' : ACTION_LABEL[s]}
        </Button>
      ))}
      {canPay ? (
        order.paymentStatus === 'paid' ? (
          <Button size={size} variant="ghost" icon={FiRotateCcw} loading={busy === `${order._id}:pay`} disabled={!!busy && busy.startsWith(order._id)} onClick={() => setPaid(order, false)} className={layout === 'column' ? 'w-full' : ''}>
            Undo payment record
          </Button>
        ) : (
          <Button size={size} variant="secondary" icon={FiCreditCard} loading={busy === `${order._id}:pay`} disabled={!!busy && busy.startsWith(order._id)} onClick={() => setPaid(order, true)} className={layout === 'column' ? 'w-full' : ''}>
            Record payment · {money(order.totalPrice)}
          </Button>
        )
      ) : null}
      {next.includes('Cancelled') ? (
        <Button size={size} variant="danger-soft" loading={busy === `${order._id}:Cancelled`} disabled={!!busy && busy.startsWith(order._id)} onClick={() => advance(order, 'Cancelled')} className={layout === 'column' ? 'w-full' : ''}>
          Reject
        </Button>
      ) : null}
    </div>
  );
}

export function OrderLines({ order }) {
  return (
    <div>
      <table className="w-full text-[14px]">
        <caption className="sr-only">Items in order {orderRef(order._id)}</caption>
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-wide text-faint">
            <th className="font-semibold pb-2">Item</th>
            <th className="font-semibold pb-2 text-center w-14">Qty</th>
            <th className="font-semibold pb-2 text-right w-24">Price</th>
            <th className="font-semibold pb-2 text-right w-24">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {order.lines.map((l, i) => (
            <tr key={`${String(l.item)}-${i}`}>
              <td className="py-2.5 pr-2 font-medium text-ink align-top">
                {l.name}
                {/* Exactly what the kitchen has to make, as chosen when the order was placed. */}
                {(l.selections || []).length ? (
                  <ul className="mt-1 space-y-0.5">
                    {l.selections.map((s, j) => (
                      <li key={`${s.groupName}-${s.label}-${j}`} className="text-[12.5px] text-muted">
                        <span className="text-faint">{s.groupName}:</span> <span className="font-medium text-body">{s.label}</span>
                        {s.priceDelta ? <span className="tabular text-faint"> +{money(s.priceDelta)}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {l.instructions ? (
                  <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-saffron-50 border border-saffron-200 px-2 py-1.5 text-[12.5px] text-ink">
                    <FiMessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-saffron-600" aria-hidden />
                    <span><span className="font-semibold">Note:</span> {l.instructions}</span>
                  </p>
                ) : null}
              </td>
              <td className="py-2.5 text-center tabular font-semibold align-top">{l.quantity}</td>
              <td className="py-2.5 text-right tabular text-muted align-top">{l.price != null ? money(l.price) : '—'}</td>
              <td className="py-2.5 text-right tabular font-semibold align-top">{l.price != null ? money(l.price * l.quantity) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-line">
            <td colSpan={3} className="pt-3 font-bold text-ink">Total charged</td>
            <td className="pt-3 text-right tabular text-[17px] font-extrabold text-ink">{money(order.totalPrice)}</td>
          </tr>
        </tfoot>
      </table>
      {order.legacyPricing ? (
        <p className="mt-3 text-[12.5px] text-muted flex gap-1.5"><FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />This order was placed before item prices were recorded per order, so item prices show today’s menu price. The total is what was charged.</p>
      ) : null}
    </div>
  );
}

function Timeline({ order }) {
  const history = order.statusHistory?.length ? order.statusHistory : [{ status: 'Placed', at: order.timestamp }];
  const hasPlaced = history.some((h) => h.status === 'Placed');
  const steps = hasPlaced ? history : [{ status: 'Placed', at: order.timestamp }, ...history];
  return (
    <ol className="relative ml-1.5">
      {steps.map((h, i) => (
        <li key={`${h.status}-${i}`} className="relative pl-6 pb-4 last:pb-0">
          {i < steps.length - 1 ? <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" aria-hidden /> : null}
          <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-white ${STATUS[h.status]?.dot || 'bg-faint'}`} aria-hidden />
          <p className="font-semibold text-ink leading-5">{STATUS[h.status]?.long || h.status}</p>
          <p className="text-[12.5px] text-muted">{formatDateTime(h.at)}</p>
        </li>
      ))}
      {!order.statusHistory?.length && order.status !== 'Placed' ? (
        <li className="relative pl-6"><span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ${STATUS[order.status]?.dot}`} aria-hidden /><p className="font-semibold text-ink">{STATUS[order.status]?.long}</p><p className="text-[12.5px] text-muted">Time not recorded for older orders</p></li>
      ) : null}
    </ol>
  );
}

// Pickup time: what the student was told, what actually happened, and the controls to change it.
// Only meaningful while the food is still being made, so the controls disappear afterwards.
export function PickupTimePanel({ order, onChanged }) {
  const canteenId = useCanteenId();
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const [custom, setCustom] = useState('');
  const editable = ['Placed', 'Processing'].includes(order.status);

  const apply = async (body, label) => {
    setBusy(label);
    try {
      await api.setEstimate(canteenId, order._id, body);
      toast.success('The student sees the new time straight away.', { title: 'Pickup time updated' });
      setCustom('');
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const estimated = order.estimatedReadyAt ? new Date(order.estimatedReadyAt) : null;
  const minutesOut = estimated ? Math.round((estimated.getTime() - Date.now()) / 60000) : null;

  return (
    <div className="rounded-xl border border-line p-4">
      <h3 className="font-bold mb-3 flex items-center gap-1.5"><FiClock className="h-4 w-4 text-muted" aria-hidden />Pickup time</h3>
      <dl className="grid grid-cols-2 gap-3">
        <KeyValue label="Told the student">
          {estimated ? `${formatTime(estimated)}${minutesOut > 0 ? ` (in ${minutesOut} min)` : ''}` : 'No estimate'}
        </KeyValue>
        <KeyValue label="Source">{order.estimateSource === 'staff' ? 'Set by your canteen' : 'Calculated'}</KeyValue>
        <KeyValue label="Actually ready">{order.readyAt ? formatTime(order.readyAt) : '—'}</KeyValue>
        <KeyValue label="Collected">{order.collectedAt ? formatTime(order.collectedAt) : '—'}</KeyValue>
      </dl>
      {order.prepDelayMinutes ? (
        <p className="text-[12.5px] text-muted mt-2">A delay of {order.prepDelayMinutes} min has been announced on this order.</p>
      ) : null}

      {editable ? (
        <div className="mt-4 space-y-3 border-t border-divider pt-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wide text-faint mb-2">Running late?</p>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15].map((n) => (
                <Button key={n} size="sm" variant="secondary" loading={busy === `d${n}`} disabled={!!busy} onClick={() => apply({ addDelay: n }, `d${n}`)}>
                  +{n} min
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wide text-faint mb-2">Or set a new time</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="3"
                max="120"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="20"
                aria-label="Ready in how many minutes"
                className="input w-24"
              />
              <span className="text-[13px] text-muted">minutes from now</span>
              <Button
                size="sm"
                loading={busy === 'set'}
                disabled={!!busy || !custom || Number(custom) < 3 || Number(custom) > 120}
                onClick={() => apply({ minutes: Number(custom) }, 'set')}
              >
                Update
              </Button>
            </div>
          </div>
          <p className="text-[12.5px] text-muted">This is an estimate shown to the student — marking the order Ready is what actually tells them to come.</p>
        </div>
      ) : null}
    </div>
  );
}

export function OrderDetail({ order, actions, compact }) {
  const { canteen } = useSession();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} long />
        <PaymentBadge order={order} />
        <span className="text-[13px] text-muted">Placed {formatDateTime(order.timestamp)}</span>
      </div>

      {actions ? <OrderActions order={order} actions={actions} /> : null}

      <div className={`grid grid-cols-1 gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <div className="rounded-xl border border-line p-4 flex items-center gap-3">
          <Avatar name={order.customer?.name} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-faint flex items-center gap-1"><FiUser className="h-3 w-3" aria-hidden />Customer</p>
            <p className="font-semibold text-ink truncate">{order.customer?.name}</p>
          </div>
        </div>
        <div className="rounded-xl border border-line p-4 flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-saffron-100 text-saffron-700 flex items-center justify-center shrink-0"><FiMapPin className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">Pickup</p>
            <p className="font-semibold text-ink truncate">Self pickup at counter</p>
            {canteen?.location ? <p className="text-[12.5px] text-muted truncate">{canteen.location}</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <OrderLines order={order} />
      </div>

      <div className={`grid grid-cols-1 gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <PickupTimePanel order={order} onChanged={actions?.refresh} />
        <div className="rounded-xl border border-line p-4">
          <h3 className="font-bold mb-3">Status history</h3>
          <Timeline order={order} />
        </div>
        <div className="rounded-xl border border-line p-4">
          <h3 className="font-bold mb-3">Payment</h3>
          <dl className="grid grid-cols-2 gap-3">
            <KeyValue label="Method">Pay at counter</KeyValue>
            <KeyValue label="Status">{order.status === 'Cancelled' ? 'Not applicable' : order.paymentStatus === 'paid' ? 'Paid' : 'Not yet collected'}</KeyValue>
            <KeyValue label="Amount">{money(order.totalPrice)}</KeyValue>
            <KeyValue label="Recorded">{order.paidAt ? formatTime(order.paidAt) : '—'}</KeyValue>
          </dl>
          <p className="text-[12.5px] text-muted mt-3">Campus Rush takes no online payments. Record payment when the student pays at the counter.</p>
        </div>
      </div>
    </div>
  );
}

// Side panel used by lists; loads the order fresh so it's never stale.
export function OrderDrawer({ orderId, onClose, onChanged }) {
  const cid = useCanteenId();
  const { data: order, error, loading, reload } = useAsync(() => (orderId ? api.order(cid, orderId) : Promise.resolve(null)), [cid, orderId]);
  const changed = useCallback(async () => { await reload({ silent: true }); onChanged?.(); }, [reload, onChanged]);
  const actions = useOrderActions(changed);
  return (
    <Drawer
      open={!!orderId}
      onClose={onClose}
      width="max-w-2xl"
      title={orderId ? `Order ${orderRef(orderId)}` : ''}
      subtitle={order ? `${order.itemCount} item${order.itemCount === 1 ? '' : 's'} · ${money(order.totalPrice)}` : null}
      footer={<Link to={`/orders/${orderId}`} className="inline-flex items-center gap-1.5 text-brand-700 font-semibold hover:underline"><FiExternalLink className="h-4 w-4" aria-hidden />Open full page</Link>}
    >
      {loading && !order ? <SkeletonRows rows={6} /> : error && !order ? <ErrorState message={error} onRetry={reload} /> : order ? <OrderDetail order={order} actions={actions} compact /> : null}
      {actions.cancelDialog}
    </Drawer>
  );
}
