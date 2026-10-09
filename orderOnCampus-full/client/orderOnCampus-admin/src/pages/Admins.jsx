import { useState } from 'react';
import { FiActivity, FiShield, FiUserPlus } from 'react-icons/fi';
import SetupLinkDialog from '../components/SetupLinkDialog';
import Button from '../components/ui/Button';
import { AccountStatusBadge, Avatar, Badge, Card, PageHeader, TableWrap } from '../components/ui/Display';
import { Banner, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Select, TextInput } from '../components/ui/Form';
import { ConfirmDialog, Dialog, Drawer } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { ADMIN_ROLES } from '../lib/constants';
import { formatDateTime, relativeTime } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';

function InviteDialog({ open, onClose, onInvited }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'operations' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (form.name.trim().length < 2) { setError('Enter their name'); return; }
    if (!/^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) { setError('Enter a valid email'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await api.inviteAdmin({ ...form, name: form.name.trim(), email: form.email.trim() });
      onInvited({ url: res.setupUrl, expires: res.setupExpires, who: res.data.name });
      setForm({ name: '', email: '', role: 'operations' });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title="Invite an administrator" description="They choose their own password through a one-time link (valid 48 hours)."
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} loading={busy}>Create invitation</Button></>}>
      <div className="space-y-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <TextInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} required autoFocus />
        <TextInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={120} required />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} hint="Operations admins manage canteens, staff, students, menus, orders, content and support — not administrators or platform settings.">
          <option value="operations">Operations admin</option>
          <option value="super_admin">Super admin</option>
        </Select>
      </div>
    </Dialog>
  );
}

export default function Admins() {
  useDocumentTitle('Admins & roles');
  const toast = useToast();
  const { admin: me } = useSession();
  const { data, error, loading, reload } = useAsync(() => api.admins(), []);
  const [inviting, setInviting] = useState(false);
  const [link, setLink] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activityFor, setActivityFor] = useState(null);
  const { data: activity, loading: activityLoading } = useAsync(() => (activityFor ? api.adminActivity(activityFor._id) : Promise.resolve(null)), [activityFor?._id]);

  const apply = async () => {
    setBusy(true);
    try {
      if (confirm.kind === 'role') await api.setAdminRole(confirm.admin._id, confirm.value);
      else await api.setAdminStatus(confirm.admin._id, confirm.value);
      toast.success(confirm.kind === 'role' ? `${confirm.admin.name} is now ${ADMIN_ROLES[confirm.value]}. They’ll sign in again.` : `${confirm.admin.name} is ${confirm.value}.`);
      setConfirm(null);
      reload({ silent: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise-in">
      <PageHeader title="Admins & roles" description="Who can sign in to this portal. There is no public sign-up." actions={<Button icon={FiUserPlus} onClick={() => setInviting(true)}>Invite administrator</Button>} />
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={3} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : (
          <TableWrap minWidth={860} caption="Administrators">
            <thead className="bg-sunken/60 border-b border-line"><tr><th className="th">Administrator</th><th className="th">Role</th><th className="th">Status</th><th className="th">Last sign-in</th><th className="th">Created</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-divider">
              {data.map((a) => {
                const self = a._id === me._id;
                return (
                  <tr key={a._id}>
                    <td className="td"><div className="flex items-center gap-3"><Avatar name={a.name} /><span><span className="block font-semibold text-ink">{a.name}{self ? <span className="text-muted font-normal"> (you)</span> : null}</span><span className="block text-[12.5px] text-muted">{a.email}</span></span></div></td>
                    <td className="td">
                      {self ? <Badge tone="accent" icon={FiShield}>{ADMIN_ROLES[a.role]}</Badge> : (
                        <Select aria-label={`Role for ${a.name}`} value={a.role} onChange={(e) => setConfirm({ kind: 'role', admin: a, value: e.target.value })} className="w-48">
                          {Object.entries(ADMIN_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </Select>
                      )}
                    </td>
                    <td className="td"><AccountStatusBadge status={a.status} /></td>
                    <td className="td text-muted whitespace-nowrap">{a.lastLoginAt ? relativeTime(a.lastLoginAt) : 'Never'}</td>
                    <td className="td text-muted whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                    <td className="td"><div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" icon={FiActivity} onClick={() => setActivityFor(a)}>Activity</Button>
                      {!self && a.status === 'active' ? <Button size="sm" variant="danger-soft" onClick={() => setConfirm({ kind: 'status', admin: a, value: 'suspended' })}>Suspend</Button> : null}
                      {!self && a.status === 'suspended' ? <Button size="sm" variant="secondary" onClick={() => setConfirm({ kind: 'status', admin: a, value: 'active' })}>Reactivate</Button> : null}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <p className="text-[12.5px] text-muted mt-3">The last active super admin can’t be suspended or demoted, and you can’t change your own role or status.</p>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} onInvited={(l) => { setLink(l); reload({ silent: true }); }} />
      <SetupLinkDialog link={link} who={link?.who} onClose={() => setLink(null)} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={apply} loading={busy} tone={confirm?.value === 'suspended' ? 'danger' : 'primary'}
        title={confirm?.kind === 'role' ? `Change ${confirm?.admin.name}’s role?` : `${confirm?.value === 'suspended' ? 'Suspend' : 'Reactivate'} ${confirm?.admin.name}?`}
        confirmLabel={confirm?.kind === 'role' ? 'Change role' : confirm?.value === 'suspended' ? 'Suspend' : 'Reactivate'}
        message={confirm?.kind === 'role' ? `They become ${ADMIN_ROLES[confirm?.value]} and are signed out so the new permissions apply.` : confirm?.value === 'suspended' ? 'They’re signed out immediately and can’t sign in until reactivated.' : 'They can sign in again with their existing password.'} />
      <Drawer open={!!activityFor} onClose={() => setActivityFor(null)} title={activityFor ? `${activityFor.name} — activity` : ''} subtitle="From the audit log">
        {activityLoading || !activity ? <SkeletonRows rows={6} /> : activity.length ? (
          <ul className="space-y-2.5 text-[13.5px]">{activity.map((a) => <li key={a._id}><p className="text-ink"><span className="font-mono text-[12.5px]">{a.action}</span> · {a.target?.label || a.target?.type || ''} · <span className={a.result === 'failure' ? 'text-danger' : 'text-success'}>{a.result}</span></p><p className="text-[12px] text-muted">{formatDateTime(a.at)}</p></li>)}</ul>
        ) : <p className="text-muted">No recorded activity.</p>}
      </Drawer>
    </div>
  );
}
