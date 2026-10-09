import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheck, FiHome, FiPlus, FiRefreshCw } from 'react-icons/fi';
import CanteenStatusDialog from '../components/CanteenStatusDialog';
import Button from '../components/ui/Button';
import { Badge, Card, CanteenStatusBadge, PageHeader, TableWrap, Tabs, Thumb } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Select, TextArea, TextInput } from '../components/ui/Form';
import { Dialog } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { CANTEEN_TYPES, STAFF_ROLES } from '../lib/constants';
import { money, number } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

function CreateCanteenDialog({ open, onClose, onCreated }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', location: '', category: '', canteenDescription: '', managerId: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: staff } = useAsync(() => (open ? api.staff({}) : Promise.resolve([])), [open]);
  const errors = {
    name: form.name.trim().length < 3 ? 'At least 3 characters' : '',
    location: form.location.trim().length < 3 ? 'At least 3 characters' : '',
    category: !form.category ? 'Choose a type' : '',
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || busy) return;
    setBusy(true);
    setError('');
    try {
      const c = await api.createCanteen({ ...form, name: form.name.trim(), location: form.location.trim(), managerId: form.managerId || undefined });
      toast.success(`${c.name} is active. ${form.managerId ? 'Its manager can sign in to the canteen website now.' : 'Assign staff from the Staff page.'}`, { title: 'Canteen created' });
      onCreated?.();
      onClose();
      navigate(`/canteens/${c._id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title="Create a canteen" description="Created canteens are active immediately but start with ordering switched off until staff open them."
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} loading={busy}>Create canteen</Button></>}>
      <div className="space-y-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <TextInput label="Canteen name" value={form.name} onChange={set('name')} error={touched ? errors.name : ''} maxLength={60} required autoFocus />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Location on campus" value={form.location} onChange={set('location')} error={touched ? errors.location : ''} maxLength={120} required />
          <Select label="Type" value={form.category} onChange={set('category')} error={touched ? errors.category : ''} required>
            <option value="">Choose…</option>
            {CANTEEN_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <TextArea label="Description" optional value={form.canteenDescription} onChange={set('canteenDescription')} maxLength={500} rows={2} />
        <Select label="Assign a manager" optional value={form.managerId} onChange={set('managerId')} hint="You can also create or assign staff later.">
          <option value="">No one yet</option>
          {(staff || []).filter((s) => s.status !== 'suspended').map((s) => <option key={s._id} value={s._id}>{s.name} · {STAFF_ROLES[s.role]}{s.canteens.length ? ` (already at ${s.canteens.map((c) => c.name).join(', ')})` : ''}</option>)}
        </Select>
      </div>
    </Dialog>
  );
}

export default function Canteens() {
  useDocumentTitle('Canteens');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'all';
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState(null);
  const { data, error, loading, reload } = useAsync(() => api.canteens({ status: status === 'all' ? undefined : status, q: q.trim() || undefined }), [status, q]);
  useRealtime(['canteen.updated', 'menu.updated', 'order.created', 'staff.updated'], useCallback(() => reload({ silent: true }), [reload]), { debounceMs: 600 });
  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="animate-rise-in">
      <PageHeader title="Canteens" description="Every canteen on Campus Rush. Only active canteens appear in the student app."
        actions={<><Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()} loading={loading && !!data}>Refresh</Button><Button icon={FiPlus} onClick={() => setCreating(true)}>Create canteen</Button></>} />
      <Tabs label="Filter by status" value={status} onChange={(v) => setParams(v === 'all' ? {} : { status: v }, { replace: true })}
        tabs={[{ value: 'all', label: 'All', count: total }, { value: 'active', label: 'Active', count: counts.active || 0 }, { value: 'pending', label: 'Pending approval', count: counts.pending || 0 }, { value: 'suspended', label: 'Suspended', count: counts.suspended || 0 }, { value: 'rejected', label: 'Rejected', count: counts.rejected || 0 }]} />
      <SearchInput value={q} onChange={setQ} placeholder="Search by name or location" className="mb-4 sm:w-96" />
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={4} className="h-16" /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? (
          <EmptyState icon={FiHome} title={q || status !== 'all' ? 'No canteens match' : 'No canteens yet'} message={q || status !== 'all' ? 'Try another search or status.' : 'Create the first canteen to get started.'} action={!q && status === 'all' ? <Button icon={FiPlus} onClick={() => setCreating(true)}>Create canteen</Button> : null} />
        ) : (
          <TableWrap minWidth={900} caption="Canteens">
            <thead className="bg-sunken/60 border-b border-line">
              <tr><th className="th">Canteen</th><th className="th">Status</th><th className="th">Ordering</th><th className="th">Staff</th><th className="th text-right">Menu</th><th className="th text-right">Orders</th><th className="th text-right">Order value</th><th className="th"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {data.data.map((c) => (
                <tr key={c._id} className="hover:bg-sunken/50">
                  <td className="td">
                    <Link to={`/canteens/${c._id}`} className="flex items-center gap-3 group">
                      <Thumb src={c.logo} name={c.name} className="h-10 w-10" />
                      <span className="min-w-0"><span className="block font-semibold text-ink group-hover:text-brand truncate max-w-[240px]">{c.name}</span><span className="block text-[12.5px] text-muted truncate max-w-[240px]">{c.location}</span></span>
                    </Link>
                  </td>
                  <td className="td"><CanteenStatusBadge status={c.status} /></td>
                  <td className="td">{c.status !== 'active' ? <span className="text-faint text-[13px]">—</span> : c.openStatus ? <Badge tone="success">Open</Badge> : <Badge>Paused</Badge>}</td>
                  <td className="td text-[13px]">{c.staff.length ? c.staff.map((s) => <span key={s._id} className="block text-ink">{s.name} <span className="text-muted">· {STAFF_ROLES[s.role]}{s.status !== 'active' ? ` · ${s.status}` : ''}</span></span>) : <span className="text-warning font-semibold">No staff assigned</span>}</td>
                  <td className="td text-right tabular">{c.menuCount}</td>
                  <td className="td text-right tabular">{number(c.orders)}</td>
                  <td className="td text-right tabular font-semibold text-ink">{money(c.grossValue)}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      {c.status === 'pending' ? <><Button size="sm" icon={FiCheck} onClick={() => setAction({ canteen: c, action: 'approve' })}>Approve</Button><Button size="sm" variant="danger-soft" onClick={() => setAction({ canteen: c, action: 'reject' })}>Reject</Button></> : null}
                      <Button size="sm" variant="secondary" to={`/canteens/${c._id}`}>Manage</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <CreateCanteenDialog open={creating} onClose={() => setCreating(false)} onCreated={() => reload({ silent: true })} />
      {action ? <CanteenStatusDialog canteen={action.canteen} action={action.action} onClose={() => setAction(null)} onDone={() => reload({ silent: true })} /> : null}
    </div>
  );
}
