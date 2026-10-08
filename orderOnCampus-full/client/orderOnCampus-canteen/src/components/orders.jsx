import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCheck, FiCreditCard, FiExternalLink, FiMapPin, FiRotateCcw, FiUser } from 'react-icons/fi';
import { api, TRANSITIONS } from '../lib/api';
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
          {order.lines.map((l) => (
            <tr key={String(l.item)}>
              <td className="py-2.5 pr-2 font-medium text-ink">{l.name}</td>
              <td className="py-2.5 text-center tabular font-semibold">{l.quantity}</td>
              <td className="py-2.5 text-right tabular text-muted">{l.price != null ? money(l.price) : '—'}</td>
              <td className="py-2.5 text-right tabular font-semibold">{l.price != null ? money(l.price * l.quantity) : '—'}</td>
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
