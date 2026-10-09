import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiHome, FiShield, FiUser } from 'react-icons/fi';
import { api, errorMessage, TRANSITIONS } from '../lib/api';
import { ACTION_LABEL, ORDER_STATUS } from '../lib/constants';
import { formatDateTime, money, orderRef } from '../lib/format';
import { useAsync } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';
import Button from './ui/Button';
import { Avatar, KeyValue, OrderStatusBadge, PaymentBadge } from './ui/Display';
import { ErrorState, SkeletonRows } from './ui/Feedback';
import { useToast } from './ui/useToast';
import { Select, TextArea } from './ui/Form';
import { Dialog, Drawer } from './ui/Overlay';

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
              <td className="py-2.5 text-right tabular font-semibold text-ink">{l.price != null ? money(l.price * l.quantity) : '—'}</td>
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
        <p className="mt-3 text-[12.5px] text-muted flex gap-1.5"><FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />Placed before per-order prices were recorded — item prices shown are today’s menu prices. The total is what was charged.</p>
      ) : null}
    </div>
  );
}

function Timeline({ order }) {
  const history = order.statusHistory?.length ? order.statusHistory : [{ status: 'Placed', at: order.timestamp }];
  const steps = history.some((h) => h.status === 'Placed') ? history : [{ status: 'Placed', at: order.timestamp }, ...history];
  return (
    <ol className="relative ml-1.5">
      {steps.map((h, i) => (
        <li key={`${h.status}-${i}`} className="relative pl-6 pb-4 last:pb-0">
          {i < steps.length - 1 ? <span className="absolute left-[5px] top-3 bottom-0 w-px bg-line" aria-hidden /> : null}
          <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-surface ${ORDER_STATUS[h.status]?.dot || 'bg-faint'}`} aria-hidden />
          <p className="font-semibold text-ink leading-5">{ORDER_STATUS[h.status]?.long || h.status}</p>
          <p className="text-[12.5px] text-muted">{formatDateTime(h.at)}</p>
        </li>
      ))}
      {!order.statusHistory?.length && order.status !== 'Placed' ? (
        <li className="relative pl-6"><span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ${ORDER_STATUS[order.status]?.dot}`} aria-hidden /><p className="font-semibold text-ink">{ORDER_STATUS[order.status]?.long}</p><p className="text-[12.5px] text-muted">Time not recorded for older orders</p></li>
      ) : null}
    </ol>
  );
}

// Admin override: same transitions as the canteen, but every change needs a reason and is audited.
export function OverrideDialog({ order, open, onClose, onDone }) {
  const toast = useToast();
  const next = TRANSITIONS[order?.status] || [];
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!status) { setError('Choose the new status'); return; }
    if (reason.trim().length < 5) { setError('Give a reason of at least 5 characters'); return; }
    setBusy(true);
    setError('');
    try {
      await api.setOrderStatus(order._id, status, reason.trim());
      toast.success(`${orderRef(order._id)} → ${ORDER_STATUS[status].long}. The canteen and student see this change.`, { title: 'Order updated' });
      setStatus('');
      setReason('');
      onDone?.();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title={`Change status of ${order ? orderRef(order._id) : ''}`} size="sm"
      description="Use this only to resolve problems. The canteen normally updates its own orders."
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} loading={busy} variant={status === 'Cancelled' ? 'danger' : 'primary'}>Apply change</Button></>}>
      {next.length ? (
        <div className="space-y-4">
          <Select label="New status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Choose…</option>
            {next.map((s) => <option key={s} value={s}>{ACTION_LABEL[s]}</option>)}
          </Select>
          <TextArea label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} hint="Recorded in the audit log and shown in the canteen’s activity feed." />
          {error ? <p className="text-danger text-[13px]" role="alert">{error}</p> : null}
        </div>
      ) : <p>This order is {order?.status?.toLowerCase()}; its status can’t change any more.</p>}
    </Dialog>
  );
}

export function OrderDetail({ order, onOverride }) {
  const next = TRANSITIONS[order.status] || [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} long />
        <PaymentBadge order={order} />
        <span className="text-[13px] text-muted">Placed {formatDateTime(order.timestamp)}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line p-4 flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0"><FiHome className="h-4 w-4" aria-hidden /></span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-faint">Canteen</p>
            <Link to={`/canteens/${order.canteen._id}`} className="font-semibold text-ink hover:text-brand truncate block">{order.canteen.name}</Link>
          </div>
        </div>
        <div className="rounded-xl border border-line p-4 flex items-center gap-3">
          <Avatar name={order.customer?.name} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-faint flex items-center gap-1"><FiUser className="h-3 w-3" aria-hidden />Student</p>
            <Link to={`/students?open=${order.customer?._id}`} className="font-semibold text-ink hover:text-brand truncate block">{order.customer?.name}</Link>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-line p-4"><OrderLines order={order} /></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <h3 className="font-bold mb-3">Status history</h3>
          <Timeline order={order} />
        </div>
        <div className="rounded-xl border border-line p-4">
          <h3 className="font-bold mb-3">Payment</h3>
          <dl className="grid grid-cols-2 gap-3">
            <KeyValue label="Method">Pay at counter</KeyValue>
            <KeyValue label="Recorded">{order.status === 'Cancelled' ? 'Not applicable' : order.paymentStatus === 'paid' ? 'Paid' : 'Not recorded'}</KeyValue>
            <KeyValue label="Amount">{money(order.totalPrice)}</KeyValue>
            <KeyValue label="Recorded at">{order.paidAt ? formatDateTime(order.paidAt) : '—'}</KeyValue>
          </dl>
          <p className="text-[12.5px] text-muted mt-3">Payments are taken at the canteen counter and recorded by canteen staff. Campus Rush doesn’t process payments.</p>
        </div>
      </div>
      {order.audit?.length ? (
        <div className="rounded-xl border border-line p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2"><FiShield className="h-4 w-4 text-accent" aria-hidden />Admin actions</h3>
          <ul className="space-y-1.5 text-[13.5px]">
            {order.audit.map((a, i) => <li key={i}><span className="font-semibold text-ink">{a.actor}</span> · {a.action} · {a.result}{a.reason ? ` — “${a.reason}”` : ''} <span className="text-muted">· {formatDateTime(a.at)}</span></li>)}
          </ul>
        </div>
      ) : null}
      {next.length && onOverride ? (
        <div className="flex justify-end">
          <Button variant="secondary" icon={FiShield} onClick={onOverride}>Change status as admin</Button>
        </div>
      ) : null}
    </div>
  );
}

// Side panel that loads the order fresh and refreshes when the order changes anywhere on the platform.
export function OrderDrawer({ orderId, onClose, onChanged }) {
  const { data: order, error, loading, reload } = useAsync(() => (orderId ? api.order(orderId) : Promise.resolve(null)), [orderId]);
  const [override, setOverride] = useState(false);
  useRealtime(['order.updated', 'order.created'], useCallback((e) => { if (e.type === 'resync' || e.orderId === orderId) reload({ silent: true }); }, [orderId, reload]));
  return (
    <>
      <Drawer open={!!orderId} onClose={onClose} width="max-w-2xl" title={orderId ? `Order ${orderRef(orderId)}` : ''}
        subtitle={order ? `${order.canteen.name} · ${order.itemCount} item${order.itemCount === 1 ? '' : 's'} · ${money(order.totalPrice)}` : null}>
        {loading && !order ? <SkeletonRows rows={6} /> : error && !order ? <ErrorState message={error} onRetry={reload} /> : order ? <OrderDetail order={order} onOverride={() => setOverride(true)} /> : null}
      </Drawer>
      {order ? <OverrideDialog order={order} open={override} onClose={() => setOverride(false)} onDone={() => { reload({ silent: true }); onChanged?.(); }} /> : null}
    </>
  );
}
