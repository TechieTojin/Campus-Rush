import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiClock, FiMaximize2, FiPauseCircle, FiRefreshCw, FiUser, FiXCircle } from 'react-icons/fi';
import { OrderActions, OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { PageHeader, PaymentBadge } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle, useNow, usePolling } from '../lib/hooks';
import { formatTime, minutesSince, money } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import useOrderActions from '../components/useOrderActions';
import { STATUS } from '../lib/constants';

const COLUMNS = [
  { status: 'Placed', title: 'New orders', empty: 'No new orders. New ones appear here automatically.' },
  { status: 'Processing', title: 'Preparing', empty: 'Accept a new order to start preparing it.' },
  { status: 'Ready', title: 'Ready for pickup', empty: 'Orders marked ready wait here for the student.' },
  { status: 'Completed', title: 'Collected today', empty: 'Completed orders from today.' },
];

function OrderCard({ order, actions, now, onOpen }) {
  const waited = minutesSince(order.timestamp, now);
  const late = order.status === 'Placed' ? waited >= 5 : order.status === 'Processing' ? waited >= 20 : false;
  return (
    <article className={`bg-white rounded-xl border shadow-card p-3.5 animate-rise-in ${late ? 'border-saffron-400 ring-1 ring-saffron-200' : 'border-line/80'}`} aria-label={`Order ${order.ref}, ${STATUS[order.status].long}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="text-left group">
          <p className="font-mono font-extrabold text-ink text-[15px] group-hover:text-brand-700 flex items-center gap-1.5">{order.ref}<FiMaximize2 className="h-3 w-3 text-faint opacity-0 group-hover:opacity-100" aria-hidden /></p>
          <p className="text-[12.5px] text-muted flex items-center gap-1"><FiUser className="h-3 w-3" aria-hidden />{order.customer.name}</p>
        </button>
        <div className="text-right">
          <p className={`text-[12.5px] font-semibold flex items-center gap-1 justify-end ${late ? 'text-saffron-700' : 'text-muted'}`}>
            {late ? <FiAlertTriangle className="h-3.5 w-3.5" aria-hidden /> : <FiClock className="h-3.5 w-3.5" aria-hidden />}
            {order.status === 'Completed' ? formatTime(order.timestamp) : waited < 1 ? 'Just now' : `${waited} min`}
          </p>
          <p className="text-[11.5px] text-faint">{order.status === 'Completed' ? 'placed' : `since ${formatTime(order.timestamp)}`}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1 border-t border-dashed border-line pt-3">
        {order.lines.map((l) => (
          <li key={String(l.item)} className="flex gap-2 text-[14px]">
            <span className="font-extrabold text-brand-700 tabular w-7 shrink-0">{l.quantity}×</span>
            <span className="text-ink font-medium">{l.name}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-extrabold text-ink tabular">{money(order.totalPrice)}</span>
        <PaymentBadge order={order} />
      </div>
      {order.status !== 'Completed' ? (
        <div className="mt-3">
          <OrderActions order={order} actions={actions} size="sm" layout="column" showPayment={order.status === 'Ready'} />
        </div>
      ) : order.paymentStatus !== 'paid' ? (
        <div className="mt-3"><OrderActions order={order} actions={actions} size="sm" layout="column" /></div>
      ) : null}
    </article>
  );
}

export default function LiveOrders() {
  useDocumentTitle('Live orders');
  const { canteen, staff } = useSession();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);
  const now = useNow(15000);
  const interval = (staff?.preferences?.liveRefreshSeconds || 10) * 1000;

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.liveOrders(canteen._id);
      setOrders(res.data);
      setUpdatedAt(Date.now());
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [canteen._id]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, interval);
  const actions = useOrderActions(load);

  const grouped = useMemo(() => {
    const g = { Placed: [], Processing: [], Ready: [], Completed: [], Cancelled: [] };
    (orders || []).forEach((o) => g[o.status]?.push(o));
    g.Completed.reverse();
    g.Cancelled.reverse();
    return g;
  }, [orders]);

  const stale = updatedAt && now - updatedAt > interval * 3;

  if (error && !orders) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Live orders"
        description="Your kitchen board. New orders appear automatically — accept, prepare, then hand over at the counter."
        actions={
          <>
            <span className="text-[12.5px] text-muted flex items-center gap-1.5" aria-live="polite">
              <span className={`h-2 w-2 rounded-full ${error || stale ? 'bg-saffron-500' : 'bg-emerald-500 animate-pulse2'}`} />
              {updatedAt ? `Updated ${formatTime(updatedAt)} · every ${interval / 1000}s` : 'Connecting…'}
            </span>
            <Button variant="secondary" icon={FiRefreshCw} onClick={load} loading={refreshing}>Refresh</Button>
          </>
        }
      />

      {!canteen.openStatus ? (
        <Banner tone="warning" className="mb-4" title="Ordering is paused"><span className="inline-flex items-center gap-1"><FiPauseCircle className="h-4 w-4" aria-hidden />Students can’t place new orders. Existing orders below still need to be completed.</span></Banner>
      ) : null}
      {error && orders ? <Banner tone="danger" className="mb-4" title="Live updates interrupted">{error} Showing the last loaded orders — retrying automatically.</Banner> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
        {COLUMNS.map((col) => {
          const list = grouped[col.status];
          return (
            <section key={col.status} aria-labelledby={`col-${col.status}`} className={`rounded-2xl bg-sunken/70 border-t-4 ${STATUS[col.status].column} p-3 min-h-[200px]`}>
              <header className="flex items-center justify-between px-1 pb-3">
                <h2 id={`col-${col.status}`} className="font-bold text-ink flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS[col.status].dot}`} aria-hidden />{col.title}
                </h2>
                <span className="h-6 min-w-[24px] px-2 rounded-full bg-white text-[12px] font-bold tabular flex items-center justify-center border border-line">{orders ? list.length : '–'}</span>
              </header>
              <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto scroll-thin pr-0.5">
                {!orders ? [0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />) : list.length ? (
                  list.map((o) => <OrderCard key={o._id} order={o} actions={actions} now={now} onOpen={() => setOpenOrder(o._id)} />)
                ) : (
                  <p className="text-[13px] text-muted text-center px-4 py-10">{col.empty}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-6 card">
        <button type="button" onClick={() => setShowCancelled((s) => !s)} aria-expanded={showCancelled} className="w-full flex items-center justify-between px-5 py-4 text-left">
          <span className="font-bold text-ink flex items-center gap-2"><FiXCircle className="h-4 w-4 text-red-600" aria-hidden />Cancelled today <span className="text-muted font-semibold tabular">({grouped.Cancelled.length})</span></span>
          <span className="text-[13px] font-semibold text-brand-700">{showCancelled ? 'Hide' : 'Show'}</span>
        </button>
        {showCancelled ? (
          grouped.Cancelled.length ? (
            <ul className="divide-y divide-divider border-t border-divider">
              {grouped.Cancelled.map((o) => (
                <li key={o._id}>
                  <button type="button" onClick={() => setOpenOrder(o._id)} className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-canvas">
                    <span className="font-mono font-bold text-ink">{o.ref}</span>
                    <span className="flex-1 text-muted truncate">{o.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ')}</span>
                    <span className="text-[12.5px] text-muted">{formatTime(o.timestamp)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={FiXCircle} title="No cancelled orders today" className="py-6 border-t border-divider" />
        ) : null}
      </section>

      {actions.cancelDialog}
      <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={load} />
    </div>
  );
}
