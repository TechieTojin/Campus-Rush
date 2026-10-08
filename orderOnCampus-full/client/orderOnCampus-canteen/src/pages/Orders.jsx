import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiChevronRight, FiClipboard, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { Card, PageHeader, Pagination, PaymentBadge, StatusBadge } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Select, TextInput } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle, usePolling } from '../lib/hooks';
import { dayKeyOffset, downloadCsv, formatDateTime, money, summarizeLines, todayKey } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import { useToast } from '../components/ui/useToast';

const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active (new, preparing, ready)' },
  { value: 'Placed', label: 'New' },
  { value: 'Processing', label: 'Preparing' },
  { value: 'Ready', label: 'Ready for pickup' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
];

function rangeDates(range, from, to) {
  const today = todayKey();
  if (range === 'today') return { from: today, to: today };
  if (range === '7') return { from: dayKeyOffset(today, -6), to: today };
  if (range === '30') return { from: dayKeyOffset(today, -29), to: today };
  if (range === 'custom') return { from: from || undefined, to: to || undefined };
  return {};
}

export default function Orders() {
  useDocumentTitle('All orders');
  const { canteen } = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(search);
  const [exporting, setExporting] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);

  const status = params.get('status') || 'all';
  const range = params.get('range') || 'all';
  const sort = params.get('sort') || 'newest';
  const payment = params.get('payment') || 'any';
  const page = Number(params.get('page')) || 1;
  const customFrom = params.get('from') || '';
  const customTo = params.get('to') || '';

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v && v !== 'all' && v !== 'any' && !(k === 'sort' && v === 'newest') && !(k === 'page' && v === 1) ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if ((params.get('q') || '') !== debounced) update({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const query = { status, sort, page, limit: 20, q: debounced || undefined, payment: payment === 'any' ? undefined : payment, ...rangeDates(range, customFrom, customTo) };
  const invalidRange = range === 'custom' && customFrom && customTo && customFrom > customTo;
  const { data, error, loading, reload } = useAsync(
    () => (invalidRange ? Promise.resolve({ data: [], total: 0, page: 1, pages: 1 }) : api.orders(canteen._id, query)),
    [canteen._id, JSON.stringify(query)]
  );
  usePolling(() => reload({ silent: true }), 30000);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [['Order', 'Placed (IST)', 'Customer', 'Items', 'Item count', 'Total (INR)', 'Status', 'Payment']];
      let p = 1;
      let pages = 1;
      do {
        const res = await api.orders(canteen._id, { ...query, page: p, limit: 100 });
        res.data.forEach((o) => rows.push([o.ref, formatDateTime(o.timestamp), o.customer.name, summarizeLines(o.lines), o.itemCount, o.totalPrice, o.status, o.status === 'Cancelled' ? 'n/a' : o.paymentStatus]));
        pages = res.pages;
        p += 1;
      } while (p <= pages && p <= 50);
      downloadCsv(`campus-rush-orders-${todayKey()}.csv`, rows);
      toast.success(`Exported ${rows.length - 1} orders`);
    } catch (e) {
      toast.error(errorMessage(e), { title: 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  const filtered = status !== 'all' || range !== 'all' || payment !== 'any' || debounced;

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="All orders"
        description="Every order placed with your canteen. Click an order for full details and actions."
        actions={
          <>
            <Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()} loading={loading && !!data}>Refresh</Button>
            <Button variant="secondary" icon={FiDownload} onClick={exportCsv} loading={exporting} disabled={!data?.total}>Export CSV</Button>
          </>
        }
      />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search order ID or customer name" />
          <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select aria-label="Filter by date" value={range} onChange={(e) => update({ range: e.target.value })}>
            {RANGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select aria-label="Filter by payment" value={payment} onChange={(e) => update({ payment: e.target.value })}>
            <option value="any">Any payment</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Not paid</option>
          </Select>
          <Select aria-label="Sort orders" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </div>
        {range === 'custom' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:w-[420px] mt-3">
            <TextInput label="From" type="date" value={customFrom} max={customTo || todayKey()} onChange={(e) => update({ from: e.target.value })} />
            <TextInput label="To" type="date" value={customTo} min={customFrom} max={todayKey()} onChange={(e) => update({ to: e.target.value })} error={invalidRange ? 'End date is before start date' : ''} />
          </div>
        ) : null}
        {filtered ? (
          <button type="button" onClick={() => { setSearch(''); setParams({}, { replace: true }); }} className="mt-3 text-[13px] font-semibold text-brand-700 hover:underline">Clear filters</button>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={8} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? (
          <EmptyState icon={FiClipboard} title={filtered ? 'No orders match these filters' : 'No orders yet'} message={filtered ? 'Try a different search, status or date range.' : 'Orders placed in the student app appear here.'} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto relative">
              <table className="w-full text-[14px]">
                <caption className="sr-only">Orders</caption>
                <thead className="bg-canvas border-b border-line">
                  <tr className="text-left text-[12px] uppercase tracking-wide text-muted">
                    <th scope="col" className="font-semibold px-5 py-3">Order</th>
                    <th scope="col" className="font-semibold px-3 py-3">Customer</th>
                    <th scope="col" className="font-semibold px-3 py-3">Items</th>
                    <th scope="col" className="font-semibold px-3 py-3 text-right">Total</th>
                    <th scope="col" className="font-semibold px-3 py-3">Status</th>
                    <th scope="col" className="font-semibold px-3 py-3">Payment</th>
                    <th scope="col" className="font-semibold px-3 py-3">Placed</th>
                    <th scope="col" className="px-3 py-3"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-divider ${loading ? 'opacity-60' : ''}`}>
                  {data.data.map((o) => (
                    <tr key={o._id} className="hover:bg-canvas cursor-pointer" onClick={() => setOpenOrder(o._id)}>
                      <td className="px-5 py-3"><button type="button" onClick={(e) => { e.stopPropagation(); setOpenOrder(o._id); }} className="font-mono font-bold text-ink hover:text-brand-700">{o.ref}</button></td>
                      <td className="px-3 py-3 text-ink font-medium whitespace-nowrap">{o.customer.name}</td>
                      <td className="px-3 py-3 text-muted max-w-[280px] truncate" title={summarizeLines(o.lines)}>{summarizeLines(o.lines)}</td>
                      <td className="px-3 py-3 text-right font-bold tabular text-ink">{money(o.totalPrice)}</td>
                      <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-3 py-3"><PaymentBadge order={o} /></td>
                      <td className="px-3 py-3 text-muted whitespace-nowrap">{formatDateTime(o.timestamp)}</td>
                      <td className="px-3 py-3 text-faint"><FiChevronRight className="h-4 w-4" aria-hidden /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-divider">
              {data.data.map((o) => (
                <li key={o._id}>
                  <button type="button" onClick={() => setOpenOrder(o._id)} className="w-full text-left px-4 py-3.5 hover:bg-canvas">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-ink">{o.ref}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-muted text-[13px] mt-1 truncate">{summarizeLines(o.lines)}</p>
                    <div className="flex items-center justify-between mt-1.5 text-[13px]">
                      <span className="text-muted">{o.customer.name} · {formatDateTime(o.timestamp)}</span>
                      <span className="font-bold tabular text-ink">{money(o.totalPrice)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3 border-t border-divider">
              <Pagination page={data.page} pages={data.pages} total={data.total} onPage={(p) => update({ page: p })} label="orders" />
            </div>
          </>
        )}
      </Card>
      <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
