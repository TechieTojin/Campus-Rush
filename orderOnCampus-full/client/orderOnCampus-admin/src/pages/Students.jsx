import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiLock, FiPauseCircle, FiPlayCircle, FiUsers } from 'react-icons/fi';
import { OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { AccountStatusBadge, Avatar, Card, KeyValue, OrderStatusBadge, PageHeader, Pagination, StatCard, TableWrap } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Select, TextArea } from '../components/ui/Form';
import { Dialog, Drawer } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { formatDate, formatDateTime, money, number, relativeTime, summarizeLines } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

function StudentDrawer({ userId, onClose, onChanged }) {
  const toast = useToast();
  const { data: s, error, loading, reload } = useAsync(() => (userId ? api.student(userId) : Promise.resolve(null)), [userId]);
  const [suspend, setSuspend] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);
  useRealtime(['order.created', 'order.updated', 'student.updated', 'account.updated'], useCallback((e) => { if (e.type === 'resync' || !e.userId || e.userId === userId) reload({ silent: true }); }, [userId, reload]), { debounceMs: 500 });

  const setStatus = async (status) => {
    if (status === 'suspended' && reason.trim().length < 5) { toast.error('Give a reason of at least 5 characters'); return; }
    setBusy(true);
    try {
      await api.setStudentStatus(s._id, status, reason.trim());
      toast.success(status === 'suspended' ? `${s.name} can’t place new orders now.` : `${s.name} can order again.`, { title: status === 'suspended' ? 'Student suspended' : 'Student reactivated' });
      setSuspend(false);
      await reload({ silent: true });
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Drawer open={!!userId} onClose={onClose} title={s?.name || 'Student'} subtitle={s?.email} width="max-w-2xl">
        {loading && !s ? <SkeletonRows rows={6} /> : error && !s ? <ErrorState message={error} onRetry={reload} /> : s ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2"><AccountStatusBadge status={s.status} /></div>
            {s.status === 'suspended' ? <Banner tone="danger" title="Suspended — shown to the student in the app">{s.statusReason}</Banner> : null}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <KeyValue label="Registered">{formatDate(s.registeredAt)}</KeyValue>
              <KeyValue label="Last sign-in">{s.lastLoginAt ? relativeTime(s.lastLoginAt) : 'Not recorded'}</KeyValue>
              <KeyValue label="Favorites">{s.favorites.length ? s.favorites.join(', ') : 'None'}</KeyValue>
            </dl>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Orders" value={number(s.summary.orders)} hint={`${s.summary.completed} completed · ${s.summary.cancelled} cancelled`} />
              <StatCard label="Order value" value={money(s.summary.grossValue)} tone="accent" hint="Excluding cancelled" />
            </div>
            <section>
              <h3 className="font-bold mb-2">Order history</h3>
              {s.orders.length ? (
                <ul className="space-y-2">
                  {s.orders.map((o) => (
                    <li key={o._id}>
                      <button type="button" onClick={() => setOpenOrder(o._id)} className="w-full text-left rounded-xl border border-line p-3 hover:border-brand/40">
                        <div className="flex items-center justify-between gap-2"><span className="font-mono font-bold text-ink">{o.ref}</span><OrderStatusBadge status={o.status} /></div>
                        <p className="text-[13px] text-muted mt-1 truncate">{o.canteen?.name} · {summarizeLines(o.lines)}</p>
                        <div className="flex justify-between mt-1 text-[13px]"><span className="text-muted">{formatDateTime(o.timestamp)}</span><span className="font-bold tabular text-ink">{money(o.totalPrice)}</span></div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted">No orders yet.</p>}
            </section>
            <section className="pt-4 border-t border-divider space-y-3">
              <h3 className="font-bold">Account</h3>
              <p className="text-[13px] text-muted">Suspended students can still sign in and see their past orders, but can’t place orders or change favorites. Orders already placed continue to be fulfilled by the canteen.</p>
              {s.status === 'suspended'
                ? <Button icon={FiPlayCircle} loading={busy} onClick={() => setStatus('active')}>Reactivate account</Button>
                : <Button variant="danger-soft" icon={FiPauseCircle} onClick={() => { setReason(''); setSuspend(true); }}>Suspend account</Button>}
            </section>
          </div>
        ) : null}
      </Drawer>
      <Dialog open={suspend} onClose={() => setSuspend(false)} size="sm" title={`Suspend ${s?.name}?`}
        footer={<><Button variant="secondary" onClick={() => setSuspend(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={() => setStatus('suspended')}>Suspend</Button></>}>
        <p>They won’t be able to place new orders. Their order history and existing orders are kept.</p>
        <TextArea className="mt-4" label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} hint="Shown to the student in the app and recorded in the audit log." />
      </Dialog>
      <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={() => reload({ silent: true })} />
    </>
  );
}

export default function Students() {
  useDocumentTitle('Students');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => api.students({ q: q.trim() || undefined, status: status === 'all' ? undefined : status, page, limit: 25 }), [q, status, page]);
  useRealtime(['student.updated', 'account.updated', 'order.created'], useCallback(() => reload({ silent: true }), [reload]), { debounceMs: 800 });
  return (
    <div className="animate-rise-in">
      <PageHeader title="Students" description="Student accounts on the Campus Rush app." />
      <p className="text-[13px] text-muted mb-4 flex items-start gap-1.5"><FiLock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Only account-management details are shown — passwords and session tokens are never available to admins.</p>
      <Card className="p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name or email" className="sm:w-80" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-48">
          <option value="all">All students</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={5} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? <EmptyState icon={FiUsers} title="No students match" /> : (
          <>
            <TableWrap minWidth={820} caption="Students">
              <thead className="bg-sunken/60 border-b border-line"><tr><th className="th">Student</th><th className="th">Status</th><th className="th">Registered</th><th className="th text-right">Orders</th><th className="th text-right">Order value</th><th className="th">Last order</th></tr></thead>
              <tbody className="divide-y divide-divider">
                {data.data.map((s) => (
                  <tr key={s._id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => setParams({ open: s._id })}>
                    <td className="td"><button type="button" onClick={(e) => { e.stopPropagation(); setParams({ open: s._id }); }} className="flex items-center gap-3 text-left"><Avatar name={s.name} /><span><span className="block font-semibold text-ink">{s.name}</span><span className="block text-[12.5px] text-muted">{s.email}</span></span></button></td>
                    <td className="td"><AccountStatusBadge status={s.status} /></td>
                    <td className="td text-muted whitespace-nowrap">{formatDate(s.registeredAt)}</td>
                    <td className="td text-right tabular">{s.orders}</td>
                    <td className="td text-right tabular font-semibold text-ink">{money(s.orderValue)}</td>
                    <td className="td text-muted whitespace-nowrap">{s.lastOrderAt ? relativeTime(s.lastOrderAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <div className="px-5 py-3 border-t border-divider"><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} label="students" /></div>
          </>
        )}
      </Card>
      <StudentDrawer userId={params.get('open')} onClose={() => setParams({}, { replace: true })} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
