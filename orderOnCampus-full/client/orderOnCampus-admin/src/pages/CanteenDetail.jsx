import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiEdit2, FiMapPin, FiPauseCircle, FiPhone, FiPlayCircle, FiPlus, FiShield, FiUserPlus } from 'react-icons/fi';
import CanteenEditDrawer from '../components/CanteenEditDrawer';
import CanteenStatusDialog from '../components/CanteenStatusDialog';
import { TrendChart } from '../components/charts';
import MenuItemDialog from '../components/MenuItemDialog';
import { OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { AccountStatusBadge, Avatar, Badge, Card, CardHeader, CanteenStatusBadge, OrderStatusBadge, Pagination, StatCard, TableWrap, Tabs, Thumb } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Select, Toggle } from '../components/ui/Form';
import { Dialog } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage, imageUrl } from '../lib/api';
import { STAFF_ROLES } from '../lib/constants';
import { formatDateTime, money, number, relativeTime, summarizeLines, to12h, weekday } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

function MenuTab({ canteen, onChanged }) {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.canteenMenu(canteen._id), [canteen._id]);
  const [editing, setEditing] = useState(undefined);
  const [busy, setBusy] = useState({});
  useRealtime('menu.updated', useCallback((e) => { if (e.type === 'resync' || e.canteenId === canteen._id) reload({ silent: true }); }, [canteen._id, reload]));
  const toggle = async (item, available) => {
    setBusy((b) => ({ ...b, [item._id]: true }));
    try {
      const updated = await api.updateItem(canteen._id, item._id, { available });
      setData((d) => ({ ...d, data: d.data.map((i) => (i._id === item._id ? updated : i)) }));
      toast.success(`${item.name} is ${available ? 'available' : 'sold out'} for students`);
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy((b) => ({ ...b, [item._id]: false }));
    }
  };
  const categories = data?.categories || [];
  return (
    <Card className="overflow-hidden">
      <CardHeader title={`Menu (${data?.data.length ?? '…'} items)`} subtitle="Same records the canteen website and student app use" action={<div className="flex gap-2"><Button size="sm" variant="secondary" to={`/categories?canteen=${canteen._id}`}>Categories</Button><Button size="sm" icon={FiPlus} onClick={() => setEditing(null)}>Add item</Button></div>} />
      {loading && !data ? <div className="p-4"><SkeletonRows rows={4} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? (
        <EmptyState title="No menu items yet" message="Add the first item or ask the canteen to." action={<Button icon={FiPlus} onClick={() => setEditing(null)}>Add item</Button>} />
      ) : (
        <TableWrap minWidth={640} caption="Menu items">
          <thead className="bg-sunken/60 border-y border-line"><tr><th className="th">Item</th><th className="th">Category</th><th className="th text-right">Price</th><th className="th">Available</th><th className="th"><span className="sr-only">Edit</span></th></tr></thead>
          <tbody className="divide-y divide-divider">
            {data.data.map((i) => (
              <tr key={i._id}>
                <td className="td"><div className="flex items-center gap-3"><Thumb src={i.image} name={i.name} className="h-10 w-10" dimmed={!i.available} /><span className="min-w-0"><span className="block font-semibold text-ink truncate max-w-[260px]">{i.name}</span><span className="block text-[12.5px] text-muted truncate max-w-[260px]">{i.description || '—'}</span></span></div></td>
                <td className="td">{i.category ? <Badge tone="brand">{i.category}</Badge> : <span className="text-faint text-[13px]">Uncategorised</span>}</td>
                <td className="td text-right tabular font-semibold text-ink">{money(i.price)}</td>
                <td className="td"><Toggle size="sm" checked={i.available} disabled={busy[i._id]} onChange={(v) => toggle(i, v)} label={i.available ? 'Available' : 'Sold out'} /></td>
                <td className="td text-right"><Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => setEditing(i)}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <MenuItemDialog open={editing !== undefined} onClose={() => setEditing(undefined)} canteen={{ _id: canteen._id, name: canteen.name, categories }} item={editing || null} onSaved={() => { reload({ silent: true }); onChanged?.(); }} />
    </Card>
  );
}

function OrdersTab({ canteen }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, error, loading, reload } = useAsync(() => api.canteenOrders(canteen._id, { page, limit: 15 }), [canteen._id, page]);
  useRealtime(['order.created', 'order.updated'], useCallback((e) => { if (e.type === 'resync' || e.canteenId === canteen._id) reload({ silent: true }); }, [canteen._id, reload]));
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Orders" subtitle="Newest first" action={<Button size="sm" variant="secondary" to={`/orders?canteen=${canteen._id}`}>Open in All orders</Button>} />
      {loading && !data ? <div className="p-4"><SkeletonRows rows={5} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? <EmptyState title="No orders yet" /> : (
        <>
          <TableWrap minWidth={640} caption="Canteen orders">
            <thead className="bg-sunken/60 border-y border-line"><tr><th className="th">Order</th><th className="th">Student</th><th className="th">Items</th><th className="th text-right">Total</th><th className="th">Status</th><th className="th">Placed</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {data.data.map((o) => (
                <tr key={o._id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => setOpen(o._id)}>
                  <td className="td"><button type="button" className="font-mono font-bold text-ink hover:text-brand" onClick={(e) => { e.stopPropagation(); setOpen(o._id); }}>{o.ref}</button></td>
                  <td className="td text-ink">{o.customer.name}</td>
                  <td className="td text-muted max-w-[240px] truncate">{summarizeLines(o.lines)}</td>
                  <td className="td text-right tabular font-semibold text-ink">{money(o.totalPrice)}</td>
                  <td className="td"><OrderStatusBadge status={o.status} /></td>
                  <td className="td text-muted whitespace-nowrap">{formatDateTime(o.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <div className="px-5 py-3 border-t border-divider"><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} label="orders" /></div>
        </>
      )}
      <OrderDrawer orderId={open} onClose={() => setOpen(null)} onChanged={() => reload({ silent: true })} />
    </Card>
  );
}

function AssignStaffDialog({ open, onClose, canteen, assigned, onDone }) {
  const toast = useToast();
  const { data: staff } = useAsync(() => (open ? api.staff({}) : Promise.resolve([])), [open]);
  const [staffId, setStaffId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const candidates = (staff || []).filter((s) => !assigned.includes(s._id) && s.status !== 'suspended');
  const submit = async () => {
    const s = candidates.find((x) => x._id === staffId);
    if (!s) { setError('Choose a staff account'); return; }
    setBusy(true);
    try {
      await api.updateStaff(s._id, { canteenIds: [...s.canteens.map((c) => c._id), canteen._id] });
      toast.success(`${s.name} can now manage ${canteen.name}.`);
      onDone?.();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} size="sm" title={`Assign staff to ${canteen.name}`} description="Access applies to their very next request. To create a new account, use the Staff page."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Assign</Button></>}>
      {candidates.length ? (
        <Select label="Staff account" value={staffId} onChange={(e) => { setStaffId(e.target.value); setError(''); }} error={error}>
          <option value="">Choose…</option>
          {candidates.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.email} · {STAFF_ROLES[s.role]}{s.canteens.length ? ` (also ${s.canteens.map((c) => c.name).join(', ')})` : ''}</option>)}
        </Select>
      ) : <p className="text-muted">Every staff account is already assigned here. <Link to="/staff" className="text-brand font-semibold">Create a staff account</Link>.</p>}
    </Dialog>
  );
}

export default function CanteenDetail() {
  const { canteenId } = useParams();
  const { data: d, error, loading, reload } = useAsync(() => api.canteen(canteenId), [canteenId]);
  useDocumentTitle(d?.canteen.name || 'Canteen');
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState(null);
  const [assigning, setAssigning] = useState(false);
  useRealtime(['canteen.updated', 'menu.updated', 'order.created', 'order.updated', 'staff.updated'], useCallback((e) => { if (e.type === 'resync' || !e.canteenId || e.canteenId === canteenId) reload({ silent: true }); }, [canteenId, reload]), { debounceMs: 600 });

  if (loading && !d) return <Card className="p-6"><SkeletonRows rows={6} /></Card>;
  if (error && !d) return <ErrorState message={error} onRetry={reload} />;
  const c = d.canteen;
  const s = d.stats;

  return (
    <div className="animate-rise-in">
      <Link to="/canteens" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink mb-3"><FiArrowLeft className="h-4 w-4" aria-hidden />All canteens</Link>
      <Card className="overflow-hidden mb-6">
        <div className="h-32 sm:h-40 bg-gradient-to-br from-brand-700 to-nav relative">
          {c.coverImage ? <img src={imageUrl(c.coverImage)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
        </div>
        <div className="px-5 sm:px-6 pb-5 -mt-10 relative flex flex-col md:flex-row md:items-end gap-4">
          <Thumb src={c.logo} name={c.name} className="h-20 w-20 ring-4 ring-surface" rounded="rounded-2xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-[24px] font-extrabold">{c.name}</h1><CanteenStatusBadge status={c.status} />{c.status === 'active' ? (c.openStatus ? <Badge tone="success">Accepting orders</Badge> : <Badge>Ordering paused</Badge>) : null}</div>
            <p className="text-muted text-[13.5px] flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1"><FiMapPin className="h-3.5 w-3.5" aria-hidden />{c.location}</span>
              <span>{c.category}</span>
              {c.openingTime && c.closingTime ? <span className="inline-flex items-center gap-1"><FiClock className="h-3.5 w-3.5" aria-hidden />{to12h(c.openingTime)} – {to12h(c.closingTime)}</span> : null}
              {c.phone ? <span className="inline-flex items-center gap-1"><FiPhone className="h-3.5 w-3.5" aria-hidden />{c.phone}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={FiEdit2} onClick={() => setEditing(true)}>Edit profile</Button>
            {c.status === 'pending' ? <><Button onClick={() => setAction('approve')}>Approve</Button><Button variant="danger-soft" onClick={() => setAction('reject')}>Reject</Button></> : null}
            {c.status === 'active' ? <Button variant="danger-soft" icon={FiPauseCircle} onClick={() => setAction('suspend')}>Suspend</Button> : null}
            {c.status === 'suspended' || c.status === 'rejected' ? <Button icon={FiPlayCircle} onClick={() => setAction('reactivate')}>Reactivate</Button> : null}
          </div>
        </div>
        {c.statusReason ? <div className="px-6 pb-5"><Banner tone="warning" title={`${c.status === 'rejected' ? 'Rejected' : 'Suspended'} — reason shown to staff`}>{c.statusReason}</Banner></div> : null}
      </Card>

      <Tabs label="Canteen sections" value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'menu', label: 'Menu', count: d.menu.total }, { value: 'orders', label: 'Orders', count: s.allTime.orders }, { value: 'staff', label: 'Staff', count: d.staff.length }]} />

      {tab === 'overview' ? (
        <div className="space-y-6">
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Orders today" value={number(s.today.orders)} hint={`${money(s.today.grossValue)} order value`} />
            <StatCard label="All-time orders" value={number(s.allTime.orders)} tone="info" hint={`${s.allTime.completed} completed · ${s.allTime.cancelled} cancelled`} />
            <StatCard label="Order value" value={money(s.allTime.grossValue)} tone="accent" hint="All time, excluding cancelled" />
            <StatCard label="Payments recorded" value={money(s.allTime.collectedRevenue)} tone="success" hint="Recorded by staff at the counter" />
          </section>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader title="Last 14 days" subtitle={`Menu: ${d.menu.available} of ${d.menu.total} items available`} />
              <div className="px-5 pb-5">
                <TrendChart caption="Orders and order value for the last 14 days" money labels={s.trend.map((x) => weekday(x.date))}
                  series={[{ label: 'Order value', data: s.trend.map((x) => x.grossValue), type: 'bar', color: '#0E6B6B', format: money }, { label: 'Orders', data: s.trend.map((x) => x.orders), color: '#F29E38', axis: 'y1' }]} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Best sellers" />
              {d.popular.length ? (
                <ol className="px-5 pb-5 space-y-2.5">{d.popular.map((p, i) => <li key={p.itemId} className="flex justify-between text-[13.5px]"><span className="text-ink font-semibold"><span className="text-faint mr-2">{i + 1}</span>{p.name}</span><span className="text-muted tabular">{p.quantity} sold</span></li>)}</ol>
              ) : <EmptyState title="No sales yet" className="py-8" />}
            </Card>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Recent changes" subtitle="Menu, orders and profile activity" />
              {d.activity.length ? <ul className="px-5 pb-5 space-y-2.5">{d.activity.map((a) => <li key={a._id} className="text-[13.5px]"><p className="text-ink">{a.message}</p><p className="text-[12px] text-muted">{a.actor} · {relativeTime(a.createdAt)}</p></li>)}</ul> : <EmptyState title="No activity yet" className="py-8" />}
            </Card>
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><FiShield className="h-4 w-4 text-accent" aria-hidden />Admin actions</span>} subtitle="From the audit log" action={<Link to={`/audit?q=${c._id}`} className="text-[13px] font-semibold text-brand hover:underline">Full log</Link>} />
              {d.audit.length ? <ul className="px-5 pb-5 space-y-2.5">{d.audit.map((a) => <li key={a._id} className="text-[13.5px]"><p className="text-ink"><span className="font-mono text-[12.5px]">{a.action}</span> · {a.result}</p><p className="text-[12px] text-muted">{a.actor} · {formatDateTime(a.at)}</p></li>)}</ul> : <EmptyState title="No admin actions yet" className="py-8" />}
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'menu' ? <MenuTab canteen={c} onChanged={() => reload({ silent: true })} /> : null}
      {tab === 'orders' ? <OrdersTab canteen={c} /> : null}
      {tab === 'staff' ? (
        <Card className="overflow-hidden">
          <CardHeader title="Assigned staff" subtitle="People who can sign in to this canteen’s website" action={<Button size="sm" icon={FiUserPlus} onClick={() => setAssigning(true)}>Assign staff</Button>} />
          {d.staff.length ? (
            <ul className="divide-y divide-divider border-t border-divider">
              {d.staff.map((st) => (
                <li key={st._id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={st.username} />
                  <div className="flex-1 min-w-0"><p className="font-semibold text-ink truncate">{st.username}</p><p className="text-[12.5px] text-muted truncate">{st.email} · last sign-in {st.lastLoginAt ? relativeTime(st.lastLoginAt) : 'never'}</p></div>
                  <Badge tone="brand">{STAFF_ROLES[st.role]}</Badge>
                  <AccountStatusBadge status={st.status} />
                  <Button size="sm" variant="secondary" to={`/staff?open=${st._id}`}>Manage</Button>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No staff assigned" message="Without staff, nobody can manage this canteen’s orders." action={<Button icon={FiUserPlus} onClick={() => setAssigning(true)}>Assign staff</Button>} />}
        </Card>
      ) : null}

      <CanteenEditDrawer canteen={c} open={editing} onClose={() => setEditing(false)} onSaved={() => reload({ silent: true })} />
      {action ? <CanteenStatusDialog canteen={c} action={action} onClose={() => setAction(null)} onDone={() => reload({ silent: true })} /> : null}
      <AssignStaffDialog open={assigning} onClose={() => setAssigning(false)} canteen={c} assigned={d.staff.map((x) => x._id)} onDone={() => reload({ silent: true })} />
    </div>
  );
}
