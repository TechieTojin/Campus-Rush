import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiClipboard, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { Card, OrderStatusBadge, PageHeader, Pagination, PaymentBadge, TableWrap } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Select, TextInput } from '../components/ui/Form';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { dayKeyOffset, downloadCsv, formatDateTime, money, summarizeLines, todayKey } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

const STATUSES = [['all', 'All statuses'], ['active', 'Active (new, preparing, ready)'], ['Placed', 'New'], ['Processing', 'Preparing'], ['Ready', 'Ready'], ['Completed', 'Completed'], ['Cancelled', 'Cancelled']];
const RANGES = [['all', 'All time'], ['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['custom', 'Custom range']];

const rangeDates = (range, from, to) => {
  const today = todayKey();
  if (range === 'today') return { from: today, to: today };
  if (range === '7') return { from: dayKeyOffset(today, -6), to: today };
  if (range === '30') return { from: dayKeyOffset(today, -29), to: today };
  if (range === 'custom') return { from: from || undefined, to: to || undefined };
  return {};
};

export default function Orders() {
  useDocumentTitle('All orders');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(search);
  const [exporting, setExporting] = useState(false);
  const get = (k, d) => params.get(k) || d;
  const status = get('status', 'all');
  const canteen = get('canteen', 'all');
  const range = get('range', 'all');
  const payment = get('payment', 'any');
  const sort = get('sort', 'newest');
  const page = Number(get('page', 1));
  const from = get('from', '');
  const to = get('to', '');
  const openId = params.get('open');

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v && !['all', 'any'].includes(v) && !(k === 'sort' && v === 'newest') && !(k === 'page' && v === 1) ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { if ((params.get('q') || '') !== debounced) update({ q: debounced }); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = { status, sort, page, limit: 25, q: debounced || undefined, canteen: canteen === 'all' ? undefined : canteen, payment: payment === 'any' ? undefined : payment, ...rangeDates(range, from, to) };
  const invalid = range === 'custom' && from && to && from > to;
  const { data, error, loading, reload } = useAsync(() => (invalid ? Promise.resolve({ data: [], total: 0, page: 1, pages: 1 }) : api.orders(query)), [JSON.stringify(query), invalid]);
  const { data: canteens } = useAsync(() => api.canteens({}).then((r) => r.data), []);
  useRealtime(['order.created', 'order.updated'], useCallback(() => reload({ silent: true }), [reload]), { debounceMs: 600 });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [['Order', 'Placed (IST)', 'Canteen', 'Student', 'Items', 'Item count', 'Total (INR)', 'Status', 'Payment recorded']];
      let p = 1;
      let pages = 1;
      do {
        const res = await api.orders({ ...query, page: p, limit: 100 });
        res.data.forEach((o) => rows.push([o.ref, formatDateTime(o.timestamp), o.canteen.name, o.customer.name, summarizeLines(o.lines), o.itemCount, o.totalPrice, o.status, o.status === 'Cancelled' ? 'n/a' : o.paymentStatus === 'paid' ? 'yes' : 'no']));
        pages = res.pages;
        p += 1;
      } while (p <= pages && p <= 50);
      downloadCsv(`campus-rush-platform-orders-${todayKey()}.csv`, rows);
      toast.success(`Exported ${rows.length - 1} orders`);
    } catch (e) {
      toast.error(errorMessage(e), { title: 'Export failed' });
    } finally {
      setExporting(false);
    }
  };
  const filtered = status !== 'all' || canteen !== 'all' || range !== 'all' || payment !== 'any' || debounced;

  return (
    <div className="animate-rise-in">
      <PageHeader title="All orders" description="Every order across every canteen. Status changes made by canteens show up here live."
        actions={<><Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()} loading={loading && !!data}>Refresh</Button><Button variant="secondary" icon={FiDownload} onClick={exportCsv} loading={exporting} disabled={!data?.total}>Export CSV</Button></>} />
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SearchInput value={search} onChange={setSearch} placeholder="Order ID or student name" className="xl:col-span-2" />
          <Select aria-label="Filter by canteen" value={canteen} onChange={(e) => update({ canteen: e.target.value })}>
            <option value="all">All canteens</option>
            {(canteens || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Select aria-label="Filter by date" value={range} onChange={(e) => update({ range: e.target.value })}>{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Select aria-label="Filter by payment" value={payment} onChange={(e) => update({ payment: e.target.value })}><option value="any">Any payment</option><option value="paid">Payment recorded</option><option value="unpaid">Not recorded</option></Select>
        </div>
        <div className="flex flex-wrap items-end gap-3 mt-3">
          {range === 'custom' ? <><TextInput label="From" type="date" value={from} max={to || todayKey()} onChange={(e) => update({ from: e.target.value })} /><TextInput label="To" type="date" value={to} min={from} max={todayKey()} onChange={(e) => update({ to: e.target.value })} error={invalid ? 'End is before start' : ''} /></> : null}
          <Select aria-label="Sort orders" value={sort} onChange={(e) => update({ sort: e.target.value })} className="w-44"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></Select>
          {filtered ? <button type="button" onClick={() => { setSearch(''); setParams({}, { replace: true }); }} className="text-[13px] font-semibold text-brand hover:underline h-11">Clear filters</button> : null}
        </div>
      </Card>
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={8} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? (
          <EmptyState icon={FiClipboard} title={filtered ? 'No orders match these filters' : 'No orders yet'} />
        ) : (
          <>
            <TableWrap minWidth={980} caption="Orders">
              <thead className="bg-sunken/60 border-b border-line"><tr><th className="th">Order</th><th className="th">Canteen</th><th className="th">Student</th><th className="th">Items</th><th className="th text-right">Total</th><th className="th">Status</th><th className="th">Payment</th><th className="th">Placed</th></tr></thead>
              <tbody className={`divide-y divide-divider ${loading ? 'opacity-60' : ''}`}>
                {data.data.map((o) => (
                  <tr key={o._id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => update({ open: o._id, page: page === 1 ? '' : page })}>
                    <td className="td"><button type="button" className="font-mono font-bold text-ink hover:text-brand" onClick={(e) => { e.stopPropagation(); update({ open: o._id, page: page === 1 ? '' : page }); }}>{o.ref}</button></td>
                    <td className="td text-ink font-medium whitespace-nowrap">{o.canteen.name}</td>
                    <td className="td text-ink whitespace-nowrap">{o.customer.name}</td>
                    <td className="td text-muted max-w-[240px] truncate" title={summarizeLines(o.lines)}>{summarizeLines(o.lines)}</td>
                    <td className="td text-right tabular font-bold text-ink">{money(o.totalPrice)}</td>
                    <td className="td"><OrderStatusBadge status={o.status} /></td>
                    <td className="td"><PaymentBadge order={o} /></td>
                    <td className="td text-muted whitespace-nowrap">{formatDateTime(o.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <div className="px-5 py-3 border-t border-divider"><Pagination page={data.page} pages={data.pages} total={data.total} onPage={(p) => update({ page: p })} label="orders" /></div>
          </>
        )}
      </Card>
      <OrderDrawer orderId={openId} onClose={() => { const n = new URLSearchParams(params); n.delete('open'); setParams(n, { replace: true }); }} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
