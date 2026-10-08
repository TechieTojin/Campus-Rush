import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity, FiAlertCircle, FiArrowRight, FiBookOpen, FiCheckCircle, FiClock, FiCoffee, FiCreditCard, FiEdit3, FiPackage,
  FiPlusCircle, FiRefreshCw, FiShoppingBag, FiTrendingUp, FiXCircle,
} from 'react-icons/fi';
import { TrendChart } from '../components/charts';
import { OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { Badge, Card, CardHeader, PageHeader, StatCard, StatusBadge, Thumb } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle, usePolling } from '../lib/hooks';
import { money, number, relativeTime, summarizeLines, weekday } from '../lib/format';
import { useSession } from '../lib/sessionContext';

function greeting() {
  const h = Number(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const QUICK = [
  { to: '/menu/new', label: 'Add menu item', text: 'Create a dish with photo and price', icon: FiPlusCircle },
  { to: '/live', label: 'Incoming orders', text: 'Open the live kitchen board', icon: FiActivity },
  { to: '/menu', label: 'Manage menu', text: 'Prices, photos and availability', icon: FiBookOpen },
  { to: '/profile', label: 'Canteen info', text: 'Hours, description and images', icon: FiEdit3 },
];

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { canteen, staff } = useSession();
  const { data, error, loading, reload } = useAsync(() => api.dashboard(canteen._id), [canteen._id]);
  const [openOrder, setOpenOrder] = useState(null);
  usePolling(() => reload({ silent: true }), 30000);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  const d = data;
  const t = d?.today;
  const queueTotal = d ? d.queue.placed + d.queue.processing + d.queue.ready : 0;

  return (
    <div className="animate-rise-in">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${greeting()}, ${staff?.username?.split(' ')[0] || 'there'}`}
        description={`Here's how ${canteen.name} is doing today.`}
        actions={
          <>
            <Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()} loading={loading && !!data}>Refresh</Button>
            <Button icon={FiPlusCircle} to="/menu/new">Add menu item</Button>
          </>
        }
      />

      {d && !d.canteen.openStatus ? (
        <Banner tone="warning" title="Ordering is paused" className="mb-6" action={<Button size="sm" variant="secondary" to="/profile">Open canteen</Button>}>
          Students can browse your menu but can’t place orders. Use the switch in the top bar or the Canteen profile page to open.
        </Banner>
      ) : null}

      {/* Live queue */}
      <section aria-labelledby="queue-h" className="mb-6">
        <div className="card overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="p-5 md:w-64 bg-gradient-to-br from-brand-700 to-brand-800 text-white flex flex-col justify-between">
              <div>
                <h2 id="queue-h" className="text-white font-bold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse2" />Live queue</h2>
                <p className="text-brand-100/80 text-[13px] mt-1">Orders that still need action</p>
              </div>
              {loading && !d ? <Skeleton className="h-10 w-16 mt-4 bg-white/10" /> : <p className="text-[40px] font-extrabold tabular mt-4 leading-none">{queueTotal}</p>}
              <Link to="/live" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-saffron-200 hover:text-white">Open live board <FiArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <div className="flex-1 grid grid-cols-3 divide-x divide-divider">
              {[
                { k: 'placed', label: 'New — awaiting acceptance', icon: FiPackage, color: 'text-saffron-600 bg-saffron-100' },
                { k: 'processing', label: 'Preparing', icon: FiCoffee, color: 'text-sky-600 bg-sky-50' },
                { k: 'ready', label: 'Ready for pickup', icon: FiCheckCircle, color: 'text-emerald-600 bg-emerald-50' },
              ].map((q) => (
                <Link key={q.k} to="/live" className="p-5 hover:bg-canvas transition-colors">
                  <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${q.color}`}><q.icon className="h-[18px] w-[18px]" aria-hidden /></span>
                  {loading && !d ? <Skeleton className="h-8 w-12 mt-3" /> : <p className="text-[28px] font-extrabold text-ink tabular mt-2 leading-tight">{d.queue[q.k]}</p>}
                  <p className="text-[13px] text-muted font-medium">{q.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Today */}
      <section aria-label="Today's numbers" className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <StatCard loading={loading && !d} label="Orders today" value={t ? number(t.orders) : ''} icon={FiShoppingBag} hint={t ? `${t.completed} completed · ${t.cancelled} cancelled` : ''} />
        <StatCard loading={loading && !d} label="Order value today" value={t ? money(t.grossValue) : ''} icon={FiTrendingUp} tone="saffron" hint="Non-cancelled orders, paid or not" />
        <StatCard loading={loading && !d} label="Collected today" value={t ? money(t.collectedRevenue) : ''} icon={FiCreditCard} tone="success" hint="Payments recorded at the counter" />
        <StatCard loading={loading && !d} label="Avg. order value" value={d ? money(d.allTime.averageOrderValue) : ''} icon={FiActivity} tone="info" hint="All time, excluding cancelled" />
      </section>
      <section aria-label="Status today" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'New', v: t?.placed, icon: FiPackage },
          { label: 'Preparing', v: t?.processing, icon: FiCoffee },
          { label: 'Ready', v: t?.ready, icon: FiCheckCircle },
          { label: 'Completed', v: t?.completed, icon: FiCheckCircle },
          { label: 'Cancelled', v: t?.cancelled, icon: FiXCircle },
          { label: 'Collected all time', v: d ? money(d.allTime.collectedRevenue) : undefined, icon: FiCreditCard },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-line/70 px-4 py-3">
            <p className="text-[12px] font-semibold text-muted flex items-center gap-1.5"><s.icon className="h-3.5 w-3.5" aria-hidden />{s.label}{s.label !== 'Collected all time' ? ' today' : ''}</p>
            {s.v === undefined ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-[20px] font-extrabold text-ink tabular">{s.v}</p>}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Last 7 days" subtitle="Orders placed and order value (excluding cancelled)" action={<Link to="/analytics" className="text-[13px] font-semibold text-brand-700 hover:underline">Full analytics</Link>} />
          <div className="px-5 pb-5">
            {loading && !d ? <Skeleton className="h-[260px] w-full" /> : (
              <TrendChart
                caption="Orders and order value per day for the last 7 days"
                labels={d.week.map((w) => weekday(w.date))}
                series={[
                  { label: 'Order value', data: d.week.map((w) => w.grossValue), type: 'bar', color: '#0E6B6B', format: money },
                  { label: 'Orders', data: d.week.map((w) => w.orders), color: '#F29E38', axis: 'y1' },
                ]}
                money
              />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Quick actions" />
          <div className="px-3 pb-3 grid gap-1">
            {QUICK.map((q) => (
              <Link key={q.to} to={q.to} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-canvas group">
                <span className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors"><q.icon className="h-[18px] w-[18px]" aria-hidden /></span>
                <span className="flex-1 min-w-0"><span className="block font-semibold text-ink">{q.label}</span><span className="block text-[12.5px] text-muted truncate">{q.text}</span></span>
                <FiArrowRight className="h-4 w-4 text-faint group-hover:text-brand-600" aria-hidden />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent orders" action={<Link to="/orders" className="text-[13px] font-semibold text-brand-700 hover:underline">View all</Link>} />
          {loading && !d ? <div className="px-5 pb-5 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : d.recent.length ? (
            <ul className="divide-y divide-divider">
              {d.recent.map((o) => (
                <li key={o._id}>
                  <button type="button" onClick={() => setOpenOrder(o._id)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-canvas">
                    <span className="font-mono text-[13px] font-bold text-ink w-[72px]">{o.ref}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-ink font-medium truncate">{summarizeLines(o.lines)}</span>
                      <span className="block text-[12.5px] text-muted">{o.customer.name} · {relativeTime(o.timestamp)}</span>
                    </span>
                    <span className="hidden sm:block font-bold tabular text-ink">{money(o.totalPrice)}</span>
                    <StatusBadge status={o.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={FiShoppingBag} title="No orders yet" message="Orders placed in the student app will show up here." />}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Best sellers" subtitle="All time, by quantity" />
            {loading && !d ? <div className="px-5 pb-5 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : d.popular.length ? (
              <ol className="px-5 pb-4 space-y-3">
                {d.popular.map((p, i) => {
                  const max = d.popular[0].quantity || 1;
                  return (
                    <li key={p.itemId}>
                      <div className="flex items-center justify-between gap-2 text-[13.5px]">
                        <span className="font-semibold text-ink truncate"><span className="text-faint tabular mr-2">{i + 1}</span>{p.name}{!p.onMenu ? <span className="text-faint font-normal"> (removed)</span> : null}</span>
                        <span className="tabular text-muted shrink-0">{p.quantity} sold</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-sunken overflow-hidden"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.quantity / max) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ol>
            ) : <EmptyState icon={FiTrendingUp} title="No sales yet" className="py-8" />}
          </Card>
          <Card>
            <CardHeader title="Unavailable items" subtitle={d ? `${d.menu.unavailable.length} of ${d.menu.total} menu items` : ''} action={<Link to="/availability" className="text-[13px] font-semibold text-brand-700 hover:underline">Manage</Link>} />
            {loading && !d ? <div className="px-5 pb-5"><Skeleton className="h-10 w-full" /></div> : d.menu.unavailable.length ? (
              <ul className="px-5 pb-4 space-y-2">
                {d.menu.unavailable.slice(0, 6).map((i) => (
                  <li key={i._id} className="flex items-center gap-3">
                    <Thumb name={i.name} className="h-8 w-8" rounded="rounded-lg" dimmed />
                    <span className="flex-1 truncate text-ink font-medium">{i.name}</span>
                    <Badge tone="danger">Sold out</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 text-[13.5px] text-muted flex items-center gap-2"><FiCheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />{d.menu.total ? 'Everything on the menu is available.' : 'Your menu is empty — add your first item.'}</p>
            )}
            <p className="px-5 pb-4 -mt-1 text-[12px] text-faint flex gap-1.5"><FiAlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />Campus Rush tracks availability, not stock quantities.</p>
          </Card>
        </div>
      </div>
      {d?.legacyOrders ? <p className="text-[12px] text-faint mt-4 flex gap-1.5"><FiClock className="h-3.5 w-3.5 mt-0.5" aria-hidden />{d.legacyOrders} older order(s) predate per-order price records; best-seller quantities include them.</p> : null}

      <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
