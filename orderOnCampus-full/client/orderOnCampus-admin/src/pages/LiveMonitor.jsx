import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle, FiClock, FiHome, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { PageHeader, PaymentBadge } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Select } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { ORDER_STATUS } from '../lib/constants';
import { formatTime, minutesSince, money } from '../lib/format';
import { useAsync, useDocumentTitle, useNow, usePolling } from '../lib/hooks';
import { useRealtime, useRealtimeStatus } from '../lib/realtimeContext';

const COLUMNS = [
  { status: 'Placed', title: 'New', border: 'border-accent' },
  { status: 'Processing', title: 'Preparing', border: 'border-info' },
  { status: 'Ready', title: 'Ready for pickup', border: 'border-success' },
  { status: 'Completed', title: 'Completed today', border: 'border-faint' },
];

export default function LiveMonitor() {
  useDocumentTitle('Live monitor');
  const [canteen, setCanteen] = useState('all');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [lagMs, setLagMs] = useState(null);
  const [flash, setFlash] = useState({});
  const [showCancelled, setShowCancelled] = useState(false);
  const [open, setOpen] = useState(null);
  const now = useNow(15000);
  const { status: rt } = useRealtimeStatus();
  const { data: canteens } = useAsync(() => api.canteens({}).then((r) => r.data), []);
  const seq = useRef(0);

  const load = useCallback(async (event) => {
    const id = ++seq.current;
    try {
      const res = await api.liveOrders({ canteen: canteen === 'all' ? undefined : canteen });
      if (id !== seq.current) return; // a newer request already won; never overwrite with stale data
      setOrders(res.data);
      setUpdatedAt(Date.now());
      setError('');
      if (event?.at && event.type !== 'resync') setLagMs(Date.now() - new Date(event.at).getTime());
      if (event?.orderId) {
        setFlash((f) => ({ ...f, [event.orderId]: Date.now() }));
        setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[event.orderId]; return n; }), 1700);
      }
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e));
    }
  }, [canteen]);

  useEffect(() => { setOrders(null); load(); }, [load]);
  useRealtime(['order.created', 'order.updated'], load, { debounceMs: 150 });
  // Safety net if the realtime connection is down.
  usePolling(load, rt === 'live' ? 60000 : 10000);

  const grouped = useMemo(() => {
    const g = { Placed: [], Processing: [], Ready: [], Completed: [], Cancelled: [] };
    (orders || []).forEach((o) => g[o.status]?.push(o));
    g.Completed.reverse();
    g.Cancelled.reverse();
    return g;
  }, [orders]);

  if (error && !orders) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-rise-in">
      <PageHeader title="Live monitor" description="Every active order on campus, updated the moment a canteen or student changes it."
        actions={
          <>
            <span className="text-[12.5px] text-muted" aria-live="polite">
              {updatedAt ? `Updated ${formatTime(updatedAt)}` : 'Loading…'}{lagMs != null ? ` · last event ${Math.max(0, Math.round(lagMs))} ms` : ''}
            </span>
            <Select aria-label="Filter by canteen" value={canteen} onChange={(e) => setCanteen(e.target.value)} className="w-56">
              <option value="all">All canteens</option>
              {(canteens || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
            <Button variant="secondary" icon={FiRefreshCw} onClick={() => load()}>Refresh</Button>
          </>
        } />
      {rt !== 'live' ? <Banner tone="warning" className="mb-4" title="Realtime connection interrupted">Checking for changes every 10 seconds until it reconnects.</Banner> : null}
      {error && orders ? <Banner tone="danger" className="mb-4">{error}</Banner> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
        {COLUMNS.map((col) => {
          const list = grouped[col.status];
          return (
            <section key={col.status} aria-labelledby={`col-${col.status}`} className={`rounded-2xl bg-sunken/60 border-t-4 ${col.border} p-3 min-h-[200px]`}>
              <header className="flex items-center justify-between px-1 pb-3">
                <h2 id={`col-${col.status}`} className="font-bold text-ink flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${ORDER_STATUS[col.status].dot}`} aria-hidden />{col.title}</h2>
                <span className="h-6 min-w-[24px] px-2 rounded-full bg-surface text-[12px] font-bold tabular flex items-center justify-center border border-line text-ink">{orders ? list.length : '–'}</span>
              </header>
              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto scroll-thin pr-0.5">
                {!orders ? [0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />) : list.length ? list.map((o) => {
                  const waited = minutesSince(o.timestamp, now);
                  const late = (o.status === 'Placed' && waited >= 5) || (o.status === 'Processing' && waited >= 20);
                  return (
                    <button key={o._id} type="button" onClick={() => setOpen(o._id)} aria-label={`Order ${o.ref} at ${o.canteen.name}, ${ORDER_STATUS[o.status].long}`}
                      className={`w-full text-left bg-surface rounded-xl border p-3 shadow-card hover:border-brand/50 transition-colors ${late ? 'border-warning/60' : 'border-line/80'} ${flash[o._id] ? 'animate-flash' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-extrabold text-ink">{o.ref}</span>
                        <span className={`text-[12px] font-semibold flex items-center gap-1 ${late ? 'text-warning' : 'text-muted'}`}>{late ? <FiAlertTriangle className="h-3.5 w-3.5" aria-hidden /> : <FiClock className="h-3.5 w-3.5" aria-hidden />}{o.status === 'Completed' ? formatTime(o.timestamp) : waited < 1 ? 'Just now' : `${waited} min`}</span>
                      </div>
                      <p className="text-[12.5px] text-muted flex items-center gap-1 mt-0.5"><FiHome className="h-3 w-3" aria-hidden />{o.canteen.name} · {o.customer.name}</p>
                      <ul className="mt-2 space-y-0.5 text-[13.5px]">{o.lines.map((l) => <li key={String(l.item)} className="text-ink"><span className="font-bold text-brand tabular mr-1.5">{l.quantity}×</span>{l.name}</li>)}</ul>
                      <div className="mt-2 flex items-center justify-between"><span className="font-extrabold tabular text-ink">{money(o.totalPrice)}</span><PaymentBadge order={o} /></div>
                    </button>
                  );
                }) : <p className="text-[13px] text-muted text-center px-4 py-10">Nothing here right now.</p>}
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-6 card">
        <button type="button" onClick={() => setShowCancelled((s) => !s)} aria-expanded={showCancelled} className="w-full flex items-center justify-between px-5 py-4 text-left">
          <span className="font-bold text-ink flex items-center gap-2"><FiXCircle className="h-4 w-4 text-danger" aria-hidden />Cancelled today <span className="text-muted tabular">({grouped.Cancelled.length})</span></span>
          <span className="text-[13px] font-semibold text-brand">{showCancelled ? 'Hide' : 'Show'}</span>
        </button>
        {showCancelled ? (grouped.Cancelled.length ? (
          <ul className="divide-y divide-divider border-t border-divider">
            {grouped.Cancelled.map((o) => <li key={o._id}><button type="button" onClick={() => setOpen(o._id)} className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-sunken/50"><span className="font-mono font-bold text-ink">{o.ref}</span><span className="text-muted">{o.canteen.name}</span><span className="flex-1" /><span className="text-[12.5px] text-muted">{formatTime(o.timestamp)}</span></button></li>)}
          </ul>
        ) : <EmptyState title="No cancelled orders today" className="py-6 border-t border-divider" />) : null}
      </section>
      <OrderDrawer orderId={open} onClose={() => setOpen(null)} onChanged={() => load()} />
    </div>
  );
}
