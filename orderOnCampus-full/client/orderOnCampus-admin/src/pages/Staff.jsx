import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiKey, FiPauseCircle, FiPlayCircle, FiUserMinus, FiUserPlus, FiUsers } from 'react-icons/fi';
import SetupLinkDialog from '../components/SetupLinkDialog';
import Button from '../components/ui/Button';
import { AccountStatusBadge, Avatar, Badge, Card, KeyValue, PageHeader, TableWrap } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Checkbox, SearchInput, Select, TextArea, TextInput } from '../components/ui/Form';
import { ConfirmDialog, Dialog, Drawer } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { STAFF_ROLES } from '../lib/constants';
import { formatDateTime, relativeTime } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

function CanteenPicker({ canteens, value, onChange }) {
  return (
    <fieldset>
      <legend className="label">Assigned canteens</legend>
      <div className="rounded-xl border border-line divide-y divide-divider max-h-56 overflow-y-auto scroll-thin">
        {canteens.length ? canteens.map((c) => (
          <label key={c._id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-sunken/60">
            <Checkbox label={c.name} checked={value.includes(c._id)} onChange={(on) => onChange(on ? [...value, c._id] : value.filter((x) => x !== c._id))} />
            <span className="flex-1 text-ink">{c.name}</span>
            {c.status !== 'active' ? <Badge tone="warning">{c.status}</Badge> : null}
          </label>
        )) : <p className="px-3 py-3 text-muted">No canteens yet.</p>}
      </div>
      <p className="text-[12.5px] text-muted mt-1.5">Staff can only see and change the canteens ticked here. Changes apply to their next request.</p>
    </fieldset>
  );
}

function CreateStaffDialog({ open, onClose, canteens, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'manager', canteenIds: [] });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm({ name: '', email: '', role: 'manager', canteenIds: [] }); setTouched(false); setError(''); } }, [open]);
  const errors = {
    name: form.name.trim().length < 2 ? 'Enter their name' : '',
    email: !/^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(form.email.trim()) ? 'Enter a valid email' : '',
  };
  const submit = async () => {
    setTouched(true);
    if (errors.name || errors.email || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.createStaff({ ...form, name: form.name.trim(), email: form.email.trim() });
      onCreated({ url: res.setupUrl, expires: res.setupExpires, who: res.data.name });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title="Create staff account" description="The account has no password until they open their one-time setup link."
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} loading={busy}>Create and get setup link</Button></>}>
      <div className="space-y-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={touched ? errors.name : ''} maxLength={60} required autoFocus />
          <TextInput label="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={touched ? errors.email : ''} maxLength={120} required />
        </div>
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} hint="Managers control the menu, categories and canteen profile. Staff handle orders and availability.">
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </Select>
        <CanteenPicker canteens={canteens} value={form.canteenIds} onChange={(ids) => setForm({ ...form, canteenIds: ids })} />
      </div>
    </Dialog>
  );
}

function StaffDrawer({ staffId, canteens, onClose, onChanged }) {
  const toast = useToast();
  const { data: s, error, loading, reload } = useAsync(() => (staffId ? api.staffMember(staffId) : Promise.resolve(null)), [staffId]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState('');
  const [suspend, setSuspend] = useState(false);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [link, setLink] = useState(null);
  useEffect(() => { if (s) setForm({ name: s.name, role: s.role, canteenIds: s.canteens.map((c) => c._id) }); }, [s]);
  const run = async (key, fn, message) => {
    setBusy(key);
    try {
      const res = await fn();
      if (message) toast.success(message);
      await reload({ silent: true });
      onChanged();
      return res;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusy('');
    }
  };
  const dirty = s && form && (form.name !== s.name || form.role !== s.role || [...form.canteenIds].sort().join() !== s.canteens.map((c) => c._id).sort().join());
  return (
    <>
      <Drawer open={!!staffId} onClose={onClose} title={s?.name || 'Staff account'} subtitle={s ? s.email : ''} width="max-w-xl">
        {loading && !s ? <SkeletonRows rows={6} /> : error && !s ? <ErrorState message={error} onRetry={reload} /> : s && form ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2"><AccountStatusBadge status={s.status} /><Badge tone="brand">{STAFF_ROLES[s.role]}</Badge>{!s.hasPassword ? <Badge tone="info">Setup link not used yet</Badge> : null}</div>
            {s.status === 'suspended' ? <Banner tone="danger" title="Suspended">{s.statusReason}</Banner> : null}
            <dl className="grid grid-cols-2 gap-4">
              <KeyValue label="Created">{formatDateTime(s.createdAt)}</KeyValue>
              <KeyValue label="Last sign-in">{s.lastLoginAt ? relativeTime(s.lastLoginAt) : 'Never'}</KeyValue>
            </dl>
            <section className="space-y-4">
              <h3 className="font-bold">Details & access</h3>
              <TextInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} />
              <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="manager">Manager — full canteen control</option>
                <option value="staff">Staff — orders and availability</option>
              </Select>
              <CanteenPicker canteens={canteens} value={form.canteenIds} onChange={(ids) => setForm({ ...form, canteenIds: ids })} />
              <Button disabled={!dirty} loading={busy === 'save'} onClick={() => run('save', () => api.updateStaff(s._id, form), 'Staff account updated. New access applies immediately.')}>Save changes</Button>
            </section>
            <section className="space-y-2 pt-4 border-t border-divider">
              <h3 className="font-bold mb-2">Account actions</h3>
              {s.status === 'suspended' ? (
                <Button variant="secondary" icon={FiPlayCircle} loading={busy === 'status'} onClick={() => run('status', () => api.setStaffStatus(s._id, 'active'), 'Account reactivated. They need to sign in again.')}>Reactivate account</Button>
              ) : (
                <Button variant="danger-soft" icon={FiPauseCircle} onClick={() => { setReason(''); setSuspend(true); }}>Suspend account</Button>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={FiKey} disabled={s.status === 'suspended'} onClick={() => setConfirm('reset')}>New setup link</Button>
                <Button variant="secondary" icon={FiUserMinus} disabled={!s.canteens.length} onClick={() => setConfirm('remove')}>Remove all canteen access</Button>
              </div>
            </section>
            <section className="pt-4 border-t border-divider">
              <h3 className="font-bold mb-2">Recent admin actions on this account</h3>
              {s.audit.length ? <ul className="space-y-1.5 text-[13.5px]">{s.audit.map((a) => <li key={a._id}><span className="font-mono text-[12.5px] text-ink">{a.action}</span> · {a.result} · <span className="text-muted">{a.actor} · {formatDateTime(a.at)}</span></li>)}</ul> : <p className="text-muted">None yet.</p>}
              <h3 className="font-bold mt-5 mb-2">Their recent canteen activity</h3>
              {s.activity.length ? <ul className="space-y-1.5 text-[13.5px]">{s.activity.map((a) => <li key={a._id}>{a.message} <span className="text-muted">· {relativeTime(a.createdAt)}</span></li>)}</ul> : <p className="text-muted">None yet.</p>}
            </section>
          </div>
        ) : null}
      </Drawer>
      <Dialog open={suspend} onClose={() => setSuspend(false)} size="sm" title={`Suspend ${s?.name}?`}
        footer={<><Button variant="secondary" onClick={() => setSuspend(false)}>Cancel</Button><Button variant="danger" loading={busy === 'status'} onClick={async () => { if (reason.trim().length < 5) { toast.error('Give a reason of at least 5 characters'); return; } const ok = await run('status', () => api.setStaffStatus(s._id, 'suspended', reason.trim()), 'Account suspended. Their sessions ended immediately.'); if (ok) setSuspend(false); }}>Suspend</Button></>}>
        <p>They’re signed out everywhere straight away and can’t manage menus or orders until reactivated. Their canteen assignments are kept.</p>
        <TextArea className="mt-4" label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} hint="Recorded in the audit log." />
      </Dialog>
      <ConfirmDialog open={confirm === 'remove'} onClose={() => setConfirm(null)} loading={busy === 'remove'} title="Remove all canteen access?" confirmLabel="Remove access"
        message="They’ll be signed out and won’t see any canteen until you assign one again. The account itself is kept."
        onConfirm={async () => { await run('remove', () => api.removeStaffAccess(s._id), 'Access removed.'); setConfirm(null); }} />
      <ConfirmDialog open={confirm === 'reset'} onClose={() => setConfirm(null)} loading={busy === 'reset'} tone="primary" title="Create a new setup link?" confirmLabel="Create link"
        message="Their current password stops working and they’re signed out. They set a new password with the link."
        onConfirm={async () => { const res = await run('reset', () => api.resetStaffAccess(s._id)); setConfirm(null); if (res) setLink({ url: res.setupUrl, expires: res.setupExpires }); }} />
      <SetupLinkDialog link={link} who={s?.name} onClose={() => setLink(null)} />
    </>
  );
}

export default function Staff() {
  useDocumentTitle('Staff');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [canteen, setCanteen] = useState('all');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState(null);
  const openId = params.get('open');
  const { data, error, loading, reload } = useAsync(() => api.staff({ q: q.trim() || undefined, status: status === 'all' ? undefined : status, canteen: canteen === 'all' ? undefined : canteen }), [q, status, canteen]);
  const { data: canteenList } = useAsync(() => api.canteens({}).then((r) => r.data), []);
  useRealtime(['staff.updated', 'canteen.updated'], useCallback(() => reload({ silent: true }), [reload]), { debounceMs: 500 });
  const canteens = canteenList || [];

  return (
    <div className="animate-rise-in">
      <PageHeader title="Staff" description="Canteen staff accounts and the canteens each one can manage." actions={<Button icon={FiUserPlus} onClick={() => setCreating(true)}>Create staff account</Button>} />
      <Card className="p-4 mb-4 flex flex-col lg:flex-row gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search name or email" className="lg:w-80" />
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="lg:w-48">
          <option value="all">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="suspended">Suspended</option>
        </Select>
        <Select aria-label="Filter by canteen" value={canteen} onChange={(e) => setCanteen(e.target.value)} className="lg:w-64">
          <option value="all">All canteens</option><option value="none">Not assigned</option>
          {canteens.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
      </Card>
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={4} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.length ? (
          <EmptyState icon={FiUsers} title="No staff accounts match" action={<Button icon={FiUserPlus} onClick={() => setCreating(true)}>Create staff account</Button>} />
        ) : (
          <TableWrap minWidth={820} caption="Staff accounts">
            <thead className="bg-sunken/60 border-b border-line"><tr><th className="th">Staff</th><th className="th">Role</th><th className="th">Canteens</th><th className="th">Status</th><th className="th">Last sign-in</th><th className="th"><span className="sr-only">Manage</span></th></tr></thead>
            <tbody className="divide-y divide-divider">
              {data.map((s) => (
                <tr key={s._id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => setParams({ open: s._id })}>
                  <td className="td"><div className="flex items-center gap-3"><Avatar name={s.name} /><span className="min-w-0"><span className="block font-semibold text-ink">{s.name}</span><span className="block text-[12.5px] text-muted">{s.email}</span></span></div></td>
                  <td className="td"><Badge tone="brand">{STAFF_ROLES[s.role]}</Badge></td>
                  <td className="td text-[13px]">{s.canteens.length ? s.canteens.map((c) => <Link key={c._id} to={`/canteens/${c._id}`} onClick={(e) => e.stopPropagation()} className="block text-ink hover:text-brand">{c.name}</Link>) : <span className="text-warning font-semibold">None</span>}</td>
                  <td className="td"><AccountStatusBadge status={s.status} /></td>
                  <td className="td text-muted whitespace-nowrap">{s.lastLoginAt ? relativeTime(s.lastLoginAt) : 'Never'}</td>
                  <td className="td text-right"><Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setParams({ open: s._id }); }}>Manage</Button></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <CreateStaffDialog open={creating} onClose={() => setCreating(false)} canteens={canteens} onCreated={(l) => { setLink(l); reload({ silent: true }); }} />
      <SetupLinkDialog link={link} who={link?.who} onClose={() => setLink(null)} />
      <StaffDrawer staffId={openId} canteens={canteens} onClose={() => setParams({}, { replace: true })} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
