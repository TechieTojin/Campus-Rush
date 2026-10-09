import { useMemo, useState } from 'react';
import { FiBarChart2, FiCheckCircle, FiCreditCard, FiDownload, FiInfo, FiShoppingBag, FiTrendingUp, FiUsers, FiXCircle } from 'react-icons/fi';
import { DonutChart, HBarChart, TrendChart } from '../components/charts';
import DateRange from '../components/DateRange';
import Button from '../components/ui/Button';
import { Card, CardHeader, PageHeader, StatCard, TableWrap } from '../components/ui/Display';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Segmented, Select } from '../components/ui/Form';
import { api } from '../lib/api';
import { dayKeyOffset, downloadCsv, formatDate, money, number, shortDay, todayKey } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { resolveRange } from '../lib/range';

// Groups daily rows into ISO weeks or calendar months (client-side, from the server's daily series).
const bucket = (daily, mode) => {
  if (mode === 'day') return daily.map((d) => ({ ...d, label: shortDay(d.date) }));
  const map = new Map();
  daily.forEach((d) => {
    let key;
    let label;
    if (mode === 'month') { key = d.date.slice(0, 7); label = new Date(`${key}-15T12:00:00+05:30`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); }
    else {
      const dt = new Date(`${d.date}T12:00:00+05:30`);
      const monday = new Date(dt); monday.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
      key = monday.toISOString().slice(0, 10);
      label = `Wk of ${shortDay(key)}`;
    }
    const e = map.get(key) || { label, orders: 0, completed: 0, cancelled: 0, grossValue: 0, collectedRevenue: 0 };
    e.orders += d.orders; e.completed += d.completed; e.cancelled += d.cancelled; e.grossValue += d.grossValue; e.collectedRevenue += d.collectedRevenue;
    map.set(key, e);
  });
  return [...map.values()];
};

export default function Analytics() {
  useDocumentTitle('Sales & analytics');
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: dayKeyOffset(todayKey(), -13), to: todayKey() });
  const [canteen, setCanteen] = useState('all');
  const [mode, setMode] = useState('day');
  const range = resolveRange(preset, custom);
  const { data: canteens } = useAsync(() => api.canteens({}).then((r) => r.data), []);
  const { data: d, error, loading, reload } = useAsync(() => (range.invalid ? Promise.resolve(null) : api.analytics({ from: range.from, to: range.to, canteen: canteen === 'all' ? undefined : canteen })), [range.from, range.to, range.invalid, canteen]);
  const s = d?.summary;
  const rows = useMemo(() => (d ? bucket(d.daily, mode) : []), [d, mode]);

  const exportDaily = () => downloadCsv(`campus-rush-daily-${d.from}-${d.to}.csv`, [['Date', 'Orders', 'Completed', 'Cancelled', 'Order value excl. cancelled (INR)', 'Payments recorded (INR)'], ...d.daily.map((x) => [x.date, x.orders, x.completed, x.cancelled, x.grossValue, x.collectedRevenue])]);
  const exportCanteens = () => downloadCsv(`campus-rush-canteens-${d.from}-${d.to}.csv`, [['Canteen', 'Orders', 'Completed', 'Cancelled', 'Order value (INR)', 'Completed value (INR)', 'Payments recorded (INR)', 'Avg order (INR)'], ...d.canteens.map((c) => [c.name, c.orders, c.completed, c.cancelled, c.grossValue, c.completedValue, c.collectedRevenue, c.averageOrderValue])]);
  const exportItems = () => downloadCsv(`campus-rush-items-${d.from}-${d.to}.csv`, [['Item', 'Canteen', 'Category', 'Quantity', 'Sales value (INR)'], ...d.items.map((i) => [i.name, i.canteen, i.category || 'Uncategorised', i.quantity, i.revenue])]);

  return (
    <div className="animate-rise-in">
      <PageHeader title="Sales & analytics" description={d ? `${formatDate(`${d.from}T12:00:00+05:30`)} – ${formatDate(`${d.to}T12:00:00+05:30`)} · India time` : 'Platform-wide sales from real orders'}
        actions={<><Button variant="secondary" icon={FiDownload} onClick={exportDaily} disabled={!s?.orders}>Daily CSV</Button><Button variant="secondary" icon={FiDownload} onClick={exportCanteens} disabled={!d?.canteens.length}>Canteens CSV</Button><Button variant="secondary" icon={FiDownload} onClick={exportItems} disabled={!d?.items.length}>Items CSV</Button></>} />
      <div className="flex flex-col xl:flex-row xl:items-end gap-3 mb-6">
        <DateRange preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom} />
        <Select aria-label="Canteen" value={canteen} onChange={(e) => setCanteen(e.target.value)} className="xl:w-64">
          <option value="all">All canteens</option>
          {(canteens || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4" aria-label="Summary">
            <StatCard loading={loading} label="Orders placed" icon={FiShoppingBag} value={s ? number(s.orders) : ''} hint={s ? `${s.completed} completed · ${s.cancelled} cancelled` : ''} />
            <StatCard loading={loading} label="Completed order value" icon={FiCheckCircle} tone="success" value={s ? money(s.completedValue) : ''} hint="Orders handed over to students" />
            <StatCard loading={loading} label="Payments recorded" icon={FiCreditCard} tone="brand" value={s ? money(s.collectedRevenue) : ''} hint={s ? `${s.payments.paidCount} orders marked paid by staff` : ''} />
            <StatCard loading={loading} label="Cancelled value" icon={FiXCircle} tone="danger" value={s ? money(s.cancelledValue) : ''} hint="Never counted as sales" />
          </section>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6" aria-label="More metrics">
            <StatCard loading={loading} label="Order value" icon={FiTrendingUp} tone="accent" value={s ? money(s.grossValue) : ''} hint="All non-cancelled orders" />
            <StatCard loading={loading} label="Average order value" icon={FiBarChart2} tone="neutral" value={s ? money(s.averageOrderValue) : ''} hint="Excluding cancelled" />
            <StatCard loading={loading} label="Customers" icon={FiUsers} tone="neutral" value={s ? number(s.customers) : ''} hint="Distinct students who ordered" />
            <StatCard loading={loading} label="Unrecorded payments" icon={FiCreditCard} tone="warning" value={s ? money(s.payments.completedUnpaidValue) : ''} hint={s ? `${s.payments.completedUnpaidCount} completed orders with no payment recorded` : ''} />
          </section>

          {!loading && d && !s.orders ? <Card><EmptyState icon={FiBarChart2} title="No orders in this period" message="Pick a longer range or another canteen." /></Card> : (
            <div className="space-y-6">
              <Card>
                <CardHeader title="Trend" subtitle="Order value excludes cancelled orders" action={<Segmented size="sm" label="Group by" value={mode} onChange={setMode} options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]} />} />
                <div className="px-5 pb-5">
                  {loading || !d ? <Skeleton className="h-[300px] w-full" /> : (
                    <TrendChart height={300} money caption="Order value, recorded payments and orders over time" labels={rows.map((r) => r.label)}
                      series={[
                        { label: 'Order value', data: rows.map((r) => Math.round(r.grossValue * 100) / 100), format: money, color: '#0E6B6B' },
                        { label: 'Payments recorded', data: rows.map((r) => Math.round(r.collectedRevenue * 100) / 100), format: money, color: '#1F8A5B' },
                        { label: 'Orders', data: rows.map((r) => r.orders), type: 'bar', axis: 'y1', color: '#F29E38' },
                      ]} />
                  )}
                </div>
              </Card>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="overflow-hidden">
                  <CardHeader title="By canteen" subtitle="Ranked by order value" />
                  {loading || !d ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
                    <TableWrap minWidth={560} caption="Sales by canteen">
                      <thead className="bg-sunken/60 border-y border-line"><tr><th className="th">Canteen</th><th className="th text-right">Orders</th><th className="th text-right">Completed value</th><th className="th text-right">Recorded</th><th className="th text-right">Avg</th></tr></thead>
                      <tbody className="divide-y divide-divider">{d.canteens.map((c) => <tr key={c.canteenId}><td className="td font-semibold text-ink">{c.name}</td><td className="td text-right tabular">{c.orders}</td><td className="td text-right tabular text-ink">{money(c.completedValue)}</td><td className="td text-right tabular text-muted">{money(c.collectedRevenue)}</td><td className="td text-right tabular text-muted">{money(c.averageOrderValue)}</td></tr>)}</tbody>
                    </TableWrap>
                  )}
                </Card>
                <Card>
                  <CardHeader title="Popular items" subtitle="Top 8 by quantity" />
                  <div className="px-5 pb-5">{loading || !d ? <Skeleton className="h-[260px] w-full" /> : d.items.length ? <HBarChart caption="Quantity sold per item" label="Sold" labels={d.items.slice(0, 8).map((i) => `${i.name}${i.canteen ? ` · ${i.canteen}` : ''}`)} data={d.items.slice(0, 8).map((i) => i.quantity)} /> : <EmptyState title="No items sold" className="py-8" />}</div>
                </Card>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="xl:col-span-2 overflow-hidden">
                  <CardHeader title="Sales by item" subtitle="Excluding cancelled orders" />
                  {loading || !d ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
                    <TableWrap minWidth={600} caption="Sales by item">
                      <thead className="bg-sunken/60 border-y border-line"><tr><th className="th">Item</th><th className="th">Canteen</th><th className="th">Category</th><th className="th text-right">Qty</th><th className="th text-right">Sales value</th></tr></thead>
                      <tbody className="divide-y divide-divider">{d.items.map((i) => <tr key={i.itemId}><td className="td font-medium text-ink">{i.name}{!i.onMenu ? <span className="text-faint"> · removed</span> : null}</td><td className="td text-muted">{i.canteen}</td><td className="td text-muted">{i.category || 'Uncategorised'}</td><td className="td text-right tabular">{i.quantity}</td><td className="td text-right tabular font-semibold text-ink">{money(i.revenue)}</td></tr>)}</tbody>
                    </TableWrap>
                  )}
                </Card>
                <Card>
                  <CardHeader title="By category" />
                  <div className="px-5 pb-5">{loading || !d ? <Skeleton className="h-[220px] w-full" /> : d.categories.length ? <DonutChart caption="Sales value by category" labels={d.categories.map((c) => c.category)} data={d.categories.map((c) => c.revenue)} /> : <EmptyState title="No data" className="py-8" />}</div>
                </Card>
              </div>
              <Card className="p-5">
                <h2 className="font-bold mb-3 flex items-center gap-2"><FiInfo className="h-4 w-4 text-brand" aria-hidden />How these numbers are calculated</h2>
                <dl className="grid gap-4 md:grid-cols-2 text-[13.5px]">
                  <div><dt className="font-semibold text-ink">Orders placed</dt><dd className="text-muted">Every order students placed in the period, whatever happened next.</dd></div>
                  <div><dt className="font-semibold text-ink">Completed order value</dt><dd className="text-muted">Totals of orders the canteen marked as collected by the student.</dd></div>
                  <div><dt className="font-semibold text-ink">Payments recorded</dt><dd className="text-muted">Orders where canteen staff recorded the counter payment. Campus Rush doesn’t handle money, so this is the only evidence of collection — it may lag behind what was actually paid at the counter.</dd></div>
                  <div><dt className="font-semibold text-ink">No commissions or fees</dt><dd className="text-muted">Campus Rush doesn’t charge canteens, so there is no platform revenue figure. All values are order totals in rupees, India time.</dd></div>
                </dl>
                {d?.legacyOrders ? <p className="text-[12.5px] text-muted mt-3">{d.legacyOrders} older order(s) predate per-order price records; their item-level values use today’s menu prices. Order totals are always the amounts charged.</p> : null}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
