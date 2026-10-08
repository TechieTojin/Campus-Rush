import { useState } from 'react';
import { FiBarChart2, FiCheckCircle, FiCreditCard, FiDownload, FiInfo, FiShoppingBag, FiTrendingUp, FiUsers, FiXCircle } from 'react-icons/fi';
import { DonutChart, HBarChart, TrendChart } from '../components/charts';
import Button from '../components/ui/Button';
import { Card, CardHeader, PageHeader, StatCard } from '../components/ui/Display';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { Segmented, TextInput } from '../components/ui/Form';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { dayKeyOffset, downloadCsv, formatDate, money, number, shortDay, todayKey } from '../lib/format';
import { useSession } from '../lib/sessionContext';

const PRESETS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];

export default function Analytics() {
  useDocumentTitle('Sales & analytics');
  const { canteen } = useSession();
  const today = todayKey();
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: dayKeyOffset(today, -13), to: today });
  const range = preset === 'custom' ? custom : { from: dayKeyOffset(today, -(Number(preset) - 1)), to: today };
  const invalid = preset === 'custom' && (!custom.from || !custom.to || custom.from > custom.to);
  const { data, error, loading, reload } = useAsync(() => (invalid ? Promise.resolve(null) : api.analytics(canteen._id, range)), [canteen._id, range.from, range.to, invalid]);

  const s = data?.summary;
  const daily = data?.daily || [];
  const hasOrders = s && s.orders > 0;

  const exportDaily = () => downloadCsv(`campus-rush-daily-${range.from}-to-${range.to}.csv`, [
    ['Date', 'Orders', 'Completed', 'Cancelled', 'Order value excl. cancelled (INR)', 'Collected (INR)'],
    ...daily.map((d) => [d.date, d.orders, d.completed, d.cancelled, d.grossValue, d.collectedRevenue]),
  ]);
  const exportItems = () => downloadCsv(`campus-rush-items-${range.from}-to-${range.to}.csv`, [
    ['Item', 'Category', 'Quantity sold', 'Sales value (INR)', 'Still on menu'],
    ...data.items.map((i) => [i.name, i.category || 'Uncategorised', i.quantity, i.revenue, i.onMenu ? 'yes' : 'no']),
  ]);

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Sales & analytics"
        description={data ? `${formatDate(`${data.from}T12:00:00+05:30`)} – ${formatDate(`${data.to}T12:00:00+05:30`)} · India time` : 'Order and sales trends from your real orders.'}
        actions={
          <>
            <Button variant="secondary" icon={FiDownload} onClick={exportDaily} disabled={!hasOrders}>Daily CSV</Button>
            <Button variant="secondary" icon={FiDownload} onClick={exportItems} disabled={!data?.items?.length}>Items CSV</Button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-6">
        <Segmented label="Date range" value={preset} onChange={setPreset} options={PRESETS} />
        {preset === 'custom' ? (
          <div className="flex gap-3">
            <TextInput label="From" type="date" value={custom.from} max={custom.to || today} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            <TextInput label="To" type="date" value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom({ ...custom, to: e.target.value })} error={invalid ? 'Check the dates' : ''} />
          </div>
        ) : null}
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4" aria-label="Summary">
            <StatCard loading={loading} label="Orders" value={s ? number(s.orders) : ''} icon={FiShoppingBag} hint={s ? `${s.completed} completed · ${s.cancelled} cancelled` : ''} />
            <StatCard loading={loading} label="Order value" value={s ? money(s.grossValue) : ''} icon={FiTrendingUp} tone="saffron" hint="All non-cancelled orders" />
            <StatCard loading={loading} label="Completed sales" value={s ? money(s.completedValue) : ''} icon={FiCheckCircle} tone="info" hint="Orders handed over to students" />
            <StatCard loading={loading} label="Collected revenue" value={s ? money(s.collectedRevenue) : ''} icon={FiCreditCard} tone="success" hint="Payments recorded at the counter" />
          </section>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" aria-label="More metrics">
            <StatCard loading={loading} label="Average order value" value={s ? money(s.averageOrderValue) : ''} icon={FiBarChart2} tone="neutral" hint="Excludes cancelled" />
            <StatCard loading={loading} label="Customers" value={s ? number(s.customers) : ''} icon={FiUsers} tone="neutral" hint="Distinct students who ordered" />
            <StatCard loading={loading} label="Completion rate" value={s ? (s.orders ? `${Math.round((s.completed / s.orders) * 100)}%` : '—') : ''} icon={FiCheckCircle} tone="neutral" hint="Completed ÷ all orders" />
            <StatCard loading={loading} label="Cancellation rate" value={s ? (s.orders ? `${Math.round((s.cancelled / s.orders) * 100)}%` : '—') : ''} icon={FiXCircle} tone="neutral" hint="Cancelled ÷ all orders" />
          </section>

          {!loading && data && !hasOrders ? (
            <Card><EmptyState icon={FiBarChart2} title="No orders in this period" message="Pick a longer date range, or check back once students start ordering." /></Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader title="Orders & sales over time" subtitle="Order value excludes cancelled orders. Collected = payments recorded at the counter." />
                <div className="px-5 pb-5">
                  {loading || !data ? <Skeleton className="h-[300px] w-full" /> : (
                    <TrendChart
                      height={300}
                      caption="Daily order value, collected revenue and order count"
                      labels={daily.map((d) => shortDay(d.date))}
                      series={[
                        { label: 'Order value', data: daily.map((d) => d.grossValue), format: money, color: '#0E6B6B' },
                        { label: 'Collected', data: daily.map((d) => d.collectedRevenue), format: money, color: '#1F8A5B' },
                        { label: 'Orders', data: daily.map((d) => d.orders), type: 'bar', axis: 'y1', color: '#F29E38' },
                      ]}
                      money
                    />
                  )}
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader title="Popular items" subtitle="Top 8 by quantity sold (excluding cancelled orders)" />
                  <div className="px-5 pb-5">
                    {loading || !data ? <Skeleton className="h-[260px] w-full" /> : data.items.length ? (
                      <HBarChart caption="Quantity sold per item" label="Sold" labels={data.items.slice(0, 8).map((i) => i.name)} data={data.items.slice(0, 8).map((i) => i.quantity)} />
                    ) : <EmptyState title="No items sold" className="py-8" />}
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Sales by category" subtitle="Order value by the item's current category" />
                  <div className="px-5 pb-5">
                    {loading || !data ? <Skeleton className="h-[220px] w-full" /> : data.categories.length ? (
                      <DonutChart caption="Sales value by category" labels={data.categories.map((c) => c.category)} data={data.categories.map((c) => c.revenue)} />
                    ) : <EmptyState title="No category data" className="py-8" />}
                  </div>
                  {s ? (
                    <div className="px-5 pb-5 pt-1 border-t border-divider">
                      <h3 className="font-bold text-[14px] mt-4 mb-3">Completed vs cancelled</h3>
                      <div className="flex h-3 rounded-full overflow-hidden bg-sunken" role="img" aria-label={`${s.completed} completed, ${s.cancelled} cancelled, ${s.orders - s.completed - s.cancelled} still open`}>
                        <div className="bg-emerald-500" style={{ width: `${s.orders ? (s.completed / s.orders) * 100 : 0}%` }} />
                        <div className="bg-red-400" style={{ width: `${s.orders ? (s.cancelled / s.orders) * 100 : 0}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[13px] text-muted">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Completed {s.completed}</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" />Cancelled {s.cancelled}</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sunken border border-line" />Still open {s.orders - s.completed - s.cancelled}</span>
                      </div>
                    </div>
                  ) : null}
                </Card>
              </div>

              <Card className="overflow-hidden">
                <CardHeader title="Sales by item" subtitle="Quantities and sales value in the selected period" />
                {loading || !data ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
                  <div className="overflow-x-auto relative">
                    <table className="w-full text-[14px] min-w-[560px]">
                      <caption className="sr-only">Sales by item</caption>
                      <thead className="bg-canvas border-y border-line">
                        <tr className="text-left text-[12px] uppercase tracking-wide text-muted">
                          <th scope="col" className="font-semibold px-5 py-2.5">Item</th>
                          <th scope="col" className="font-semibold px-3 py-2.5">Category</th>
                          <th scope="col" className="font-semibold px-3 py-2.5 text-right">Qty sold</th>
                          <th scope="col" className="font-semibold px-5 py-2.5 text-right">Sales value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider">
                        {data.items.map((i) => (
                          <tr key={i.itemId}>
                            <td className="px-5 py-2.5 font-medium text-ink">{i.name}{!i.onMenu ? <span className="text-faint font-normal"> · removed</span> : null}</td>
                            <td className="px-3 py-2.5 text-muted">{i.category || 'Uncategorised'}</td>
                            <td className="px-3 py-2.5 text-right tabular">{i.quantity}</td>
                            <td className="px-5 py-2.5 text-right tabular font-semibold text-ink">{money(i.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {data?.legacyOrders ? <p className="px-5 py-3 text-[12.5px] text-muted border-t border-divider flex gap-1.5"><FiInfo className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />{data.legacyOrders} order(s) in this period were placed before per-order prices were recorded; their item sales value uses today’s menu price. Order totals above are always the amounts actually charged.</p> : null}
              </Card>

              <Card className="p-5">
                <h2 className="font-bold mb-3 flex items-center gap-2"><FiInfo className="h-4 w-4 text-brand-600" aria-hidden />How these numbers are calculated</h2>
                <dl className="grid grid-cols-1 gap-4 md:grid-cols-2 text-[13.5px]">
                  <div><dt className="font-semibold text-ink">Order value</dt><dd className="text-muted">Sum of order totals for every order that wasn’t cancelled — including orders still being prepared and not yet paid.</dd></div>
                  <div><dt className="font-semibold text-ink">Completed sales</dt><dd className="text-muted">Totals of orders marked collected by the student.</dd></div>
                  <div><dt className="font-semibold text-ink">Collected revenue</dt><dd className="text-muted">Only orders where staff recorded the counter payment. Unpaid and cancelled orders are never counted.</dd></div>
                  <div><dt className="font-semibold text-ink">Dates</dt><dd className="text-muted">Grouped by the day the order was placed, in India Standard Time.</dd></div>
                </dl>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
