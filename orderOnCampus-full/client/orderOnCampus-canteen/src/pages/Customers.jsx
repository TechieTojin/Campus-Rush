import { useMemo, useState } from 'react';
import { FiLock, FiUsers } from 'react-icons/fi';
import { OrderDrawer } from '../components/orders';
import { Avatar, Card, PageHeader, StatusBadge } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Select } from '../components/ui/Form';
import { Drawer } from '../components/ui/Overlay';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { formatDate, formatDateTime, money, relativeTime, summarizeLines } from '../lib/format';
import { useSession } from '../lib/sessionContext';

function CustomerOrders({ customer, onClose, onOpenOrder }) {
  const { canteen } = useSession();
  const { data, error, loading, reload } = useAsync(() => (customer ? api.customerOrders(canteen._id, customer._id) : Promise.resolve(null)), [customer?._id]);
  return (
    <Drawer open={!!customer} onClose={onClose} title={customer?.name || ''} subtitle={customer ? `${customer.orders} order${customer.orders === 1 ? '' : 's'} · ${money(customer.totalValue)} · customer since ${formatDate(customer.firstOrder)}` : ''}>
      {loading ? <SkeletonRows rows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <ul className="space-y-2">
          {(data || []).map((o) => (
            <li key={o._id}>
              <button type="button" onClick={() => onOpenOrder(o._id)} className="w-full text-left rounded-xl border border-line p-3.5 hover:border-brand-300 hover:bg-canvas">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-ink">{o.ref}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-[13px] text-muted mt-1 truncate">{summarizeLines(o.lines)}</p>
                <div className="flex justify-between mt-1 text-[13px]"><span className="text-muted">{formatDateTime(o.timestamp)}</span><span className="font-bold tabular text-ink">{money(o.totalPrice)}</span></div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12.5px] text-muted mt-5 flex gap-1.5"><FiLock className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />Only orders placed with {canteen.name} are shown. Student contact details are not shared with canteens.</p>
    </Drawer>
  );
}

export default function Customers() {
  useDocumentTitle('Customers');
  const { canteen } = useSession();
  const { data, error, loading, reload } = useAsync(() => api.customers(canteen._id), [canteen._id]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(null);
  const [openOrder, setOpenOrder] = useState(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (data || []).filter((c) => !q || c.name.toLowerCase().includes(q));
    const by = { recent: (a, b) => new Date(b.lastOrder) - new Date(a.lastOrder), orders: (a, b) => b.orders - a.orders, value: (a, b) => b.totalValue - a.totalValue };
    return [...rows].sort(by[sort]);
  }, [data, query, sort]);

  return (
    <div className="animate-rise-in">
      <PageHeader title="Customers" description="Students who have ordered from your canteen, with their order history here." />
      <div className="flex items-start gap-2 text-[13px] text-muted mb-4"><FiLock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Only display names are shown — emails and other student details stay private.</div>
      <Card className="p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name" className="sm:w-80" />
        <Select aria-label="Sort customers" value={sort} onChange={(e) => setSort(e.target.value)} className="sm:w-56">
          <option value="recent">Most recent order</option>
          <option value="orders">Most orders</option>
          <option value="value">Highest order value</option>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        {loading ? <div className="p-4"><SkeletonRows rows={5} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !list.length ? (
          <EmptyState icon={FiUsers} title={query ? 'No customers match' : 'No customers yet'} message={query ? 'Try another name.' : 'Students appear here after their first order.'} />
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-[14px] min-w-[640px]">
              <caption className="sr-only">Customers</caption>
              <thead className="bg-canvas border-b border-line">
                <tr className="text-left text-[12px] uppercase tracking-wide text-muted">
                  <th scope="col" className="font-semibold px-5 py-3">Customer</th>
                  <th scope="col" className="font-semibold px-3 py-3 text-right">Orders</th>
                  <th scope="col" className="font-semibold px-3 py-3 text-right">Completed</th>
                  <th scope="col" className="font-semibold px-3 py-3 text-right">Cancelled</th>
                  <th scope="col" className="font-semibold px-3 py-3 text-right">Order value</th>
                  <th scope="col" className="font-semibold px-5 py-3">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {list.map((c) => (
                  <tr key={c._id} className="hover:bg-canvas cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="px-5 py-3">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(c); }} className="flex items-center gap-3 font-semibold text-ink hover:text-brand-700">
                        <Avatar name={c.name} />{c.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right tabular font-semibold">{c.orders}</td>
                    <td className="px-3 py-3 text-right tabular text-muted">{c.completed}</td>
                    <td className="px-3 py-3 text-right tabular text-muted">{c.cancelled}</td>
                    <td className="px-3 py-3 text-right tabular font-bold text-ink">{money(c.totalValue)}</td>
                    <td className="px-5 py-3 text-muted whitespace-nowrap">{relativeTime(c.lastOrder)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <CustomerOrders customer={selected} onClose={() => setSelected(null)} onOpenOrder={(id) => { setSelected(null); setOpenOrder(id); }} />
      <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
