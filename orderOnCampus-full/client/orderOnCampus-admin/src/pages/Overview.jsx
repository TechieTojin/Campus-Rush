import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle, FiBookOpen, FiCheckCircle, FiClipboard, FiCoffee, FiCreditCard, FiHome, FiPackage, FiRefreshCw,
  FiShoppingBag, FiTrendingUp, FiUserCheck, FiUsers, FiXCircle,
} from 'react-icons/fi';
import { TrendChart } from '../components/charts';
import DateRange from '../components/DateRange';
import { resolveRange } from '../lib/range';
import Button from '../components/ui/Button';
import { Card, CardHeader, PageHeader, StatCard, TableWrap } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { api } from '../lib/api';
import { dayKeyOffset, formatDate, money, number, relativeTime, shortDay, todayKey } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';
import { useSession } from '../lib/sessionContext';

export default function Overview() {
  useDocumentTitle('Overview');
  const { admin } = useSession();
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: dayKeyOffset(todayKey(), -13), to: todayKey() });
  const range = resolveRange(preset, custom);
  const { data: d, error, loading, reload } = useAsync(() => (range.invalid ? Promise.resolve(null) : api.overview({ from: range.from, to: range.to })), [range.from, range.to, range.invalid]);
  useRealtime(['order.created', 'order.updated', 'canteen.updated', 'menu.updated', 'student.updated', 'staff.updated', 'account.updated'], useCallback(() => reload({ silent: true }), [reload]), { debounceMs: 800 });

  if (error && !d) return <ErrorState message={error} onRetry={reload} />;
  const s = d?.orders.byStatus;
  const p = d?.period;

  return (
    <div className="animate-rise-in">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}
        title={`Welcome back, ${admin?.name?.split(' ')[0] || 'admin'}`}
        description="Platform-wide view of canteens, students and orders. Everything here is live data from the Campus Rush database."
        actions={<Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()} loading={loading && !!d}>Refresh</Button>}
      />

      {d?.canteens.pending ? (
        <Banner tone="warning" className="mb-5" title={`${d.canteens.pending} canteen${d.canteens.pending === 1 ? ' is' : 's are'} waiting for approval`} action={<Button size="sm" variant="secondary" to="/canteens?status=pending">Review</Button>}>
          New canteens stay hidden from students until approved.
        </Banner>
      ) : null}

      <section aria-label="Platform totals" className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <StatCard loading={!d} to="/students" label="Students" icon={FiUsers} value={d ? number(d.students.total) : ''} hint={d ? `${d.students.active} active · ${d.students.suspended} suspended` : ''} />
        <StatCard loading={!d} to="/canteens" label="Canteens" icon={FiHome} tone="accent" value={d ? number(d.canteens.active) : ''} hint={d ? `active of ${d.canteens.total} · ${d.canteens.pending} pending · ${d.canteens.suspended} suspended` : ''} />
        <StatCard loading={!d} to="/staff" label="Staff accounts" icon={FiUserCheck} tone="info" value={d ? number(d.staff.total) : ''} hint={d ? `${d.staff.active} active · ${d.staff.invited} invited · ${d.staff.suspended} suspended` : ''} />
        <StatCard loading={!d} to="/menu" label="Menu items" icon={FiBookOpen} tone="success" value={d ? number(d.menu.total) : ''} hint={d ? `${d.menu.available} available right now` : ''} />
      </section>
      {d ? <p className="text-[12px] text-faint -mt-2 mb-5">Active students: {d.definitions.activeStudents.toLowerCase()}.</p> : null}

      <section aria-label="Orders by status" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'All orders', v: d?.orders.total, icon: FiClipboard, to: '/orders' },
          { label: 'New', v: s?.Placed, icon: FiPackage, to: '/orders?status=Placed' },
          { label: 'Preparing', v: s?.Processing, icon: FiCoffee, to: '/orders?status=Processing' },
          { label: 'Ready', v: s?.Ready, icon: FiCheckCircle, to: '/orders?status=Ready' },
          { label: 'Completed', v: s?.Completed, icon: FiCheckCircle, to: '/orders?status=Completed' },
          { label: 'Cancelled', v: s?.Cancelled, icon: FiXCircle, to: '/orders?status=Cancelled' },
        ].map((x) => (
          <Link key={x.label} to={x.to} className="rounded-xl bg-surface border border-line/80 px-4 py-3 hover:border-brand/40">
            <p className="text-[12px] font-semibold text-muted flex items-center gap-1.5"><x.icon className="h-3.5 w-3.5" aria-hidden />{x.label}</p>
            {x.v === undefined ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-[20px] font-extrabold text-ink tabular">{number(x.v)}</p>}
          </Link>
        ))}
      </section>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[18px] font-bold">Sales and orders</h2>
          <p className="text-muted text-[13px]">{range.invalid ? 'Choose a valid date range' : `${formatDate(`${range.from}T12:00:00+05:30`)} – ${formatDate(`${range.to}T12:00:00+05:30`)} · India time`}</p>
        </div>
        <DateRange preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom} />
      </div>

      <section aria-label="Money" className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
        <StatCard loading={!d} label="Orders today" icon={FiShoppingBag} value={d ? number(d.today.orders) : ''} hint={d ? `${money(d.today.grossValue)} order value` : ''} />
        <StatCard loading={!d || loading} label="Orders in period" icon={FiClipboard} tone="info" value={p ? number(p.orders) : ''} hint={p ? `${p.completed} completed · ${p.cancelled} cancelled` : ''} />
        <StatCard loading={!d || loading} label="Order value" icon={FiTrendingUp} tone="accent" value={p ? money(p.grossValue) : ''} hint="Non-cancelled orders, paid or not" />
        <StatCard loading={!d || loading} label="Completed order value" icon={FiCheckCircle} tone="success" value={p ? money(p.completedValue) : ''} hint="Orders handed over to students" />
        <StatCard loading={!d || loading} label="Payments recorded" icon={FiCreditCard} tone="brand" value={p ? money(p.collectedRevenue) : ''} hint={p ? `${p.payments.paidCount} paid · ${p.payments.unpaidCount} not recorded` : ''} />
      </section>
      {p?.payments.completedUnpaidCount ? (
        <p className="text-[13px] text-warning mb-5 flex items-center gap-1.5"><FiAlertTriangle className="h-4 w-4" aria-hidden />{p.payments.completedUnpaidCount} completed order{p.payments.completedUnpaidCount === 1 ? '' : 's'} ({money(p.payments.completedUnpaidValue)}) have no payment recorded by the canteen.</p>
      ) : <div className="mb-5" />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Daily trend" subtitle="Order value excludes cancelled orders. Recorded = payments staff recorded at the counter." action={<Link to="/analytics" className="text-[13px] font-semibold text-brand hover:underline">Analytics</Link>} />
          <div className="px-5 pb-5">
            {!d || loading ? <Skeleton className="h-[280px] w-full" /> : (
              <TrendChart height={280} caption="Daily order value, recorded payments and order count" labels={d.daily.map((x) => shortDay(x.date))} money
                series={[
                  { label: 'Order value', data: d.daily.map((x) => x.grossValue), format: money, color: '#0E6B6B' },
                  { label: 'Payments recorded', data: d.daily.map((x) => x.collectedRevenue), format: money, color: '#1F8A5B' },
                  { label: 'Orders', data: d.daily.map((x) => x.orders), type: 'bar', axis: 'y1', color: '#F29E38' },
                ]} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Popular items" subtitle="By quantity in this period" action={<Link to="/menu" className="text-[13px] font-semibold text-brand hover:underline">Menu</Link>} />
          {!d ? <div className="px-5 pb-5 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : d.popular.length ? (
            <ol className="px-5 pb-5 space-y-3">
              {d.popular.map((it, i) => (
                <li key={it.itemId}>
                  <div className="flex items-center justify-between gap-2 text-[13.5px]">
                    <span className="min-w-0"><span className="text-faint tabular mr-2">{i + 1}</span><span className="font-semibold text-ink">{it.name}</span><span className="block text-[12px] text-muted ml-5 truncate">{it.canteen}{!it.onMenu ? ' · removed' : ''}</span></span>
                    <span className="tabular text-muted shrink-0">{it.quantity} sold</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-sunken overflow-hidden"><div className="h-full rounded-full bg-brand" style={{ width: `${(it.quantity / (d.popular[0].quantity || 1)) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          ) : <EmptyState title="No sales in this period" className="py-8" />}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader title="Top canteens" subtitle="Ranked by order value in this period" action={<Link to="/canteens" className="text-[13px] font-semibold text-brand hover:underline">All canteens</Link>} />
          {!d ? <div className="px-5 pb-5"><Skeleton className="h-32 w-full" /></div> : d.topCanteens.length ? (
            <TableWrap minWidth={560} caption="Top canteens">
              <thead className="bg-sunken/60 border-y border-line"><tr><th className="th">Canteen</th><th className="th text-right">Orders</th><th className="th text-right">Completed</th><th className="th text-right">Order value</th><th className="th text-right">Recorded</th></tr></thead>
              <tbody className="divide-y divide-divider">
                {d.topCanteens.map((c) => (
                  <tr key={c.canteenId} className="hover:bg-sunken/50">
                    <td className="td"><Link to={`/canteens/${c.canteenId}`} className="font-semibold text-ink hover:text-brand">{c.name}</Link></td>
                    <td className="td text-right tabular">{c.orders}</td>
                    <td className="td text-right tabular text-muted">{c.completed}</td>
                    <td className="td text-right tabular font-semibold text-ink">{money(c.grossValue)}</td>
                    <td className="td text-right tabular text-muted">{money(c.collectedRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : <EmptyState title="No orders in this period" className="py-8" />}
        </Card>
        <Card>
          <CardHeader title="Recent activity" subtitle="Across all canteens" />
          {!d ? <div className="px-5 pb-5 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : d.activity.length ? (
            <ul className="px-5 pb-5 space-y-3">
              {d.activity.map((a) => (
                <li key={a._id} className="text-[13.5px]">
                  <p className="text-ink">{a.message}</p>
                  <p className="text-[12px] text-muted">{a.canteenName ? `${a.canteenName} · ` : ''}{a.actor === 'admin' ? 'admin · ' : a.actor === 'student' ? 'student · ' : ''}{relativeTime(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No activity yet" className="py-8" />}
        </Card>
      </div>
    </div>
  );
}
