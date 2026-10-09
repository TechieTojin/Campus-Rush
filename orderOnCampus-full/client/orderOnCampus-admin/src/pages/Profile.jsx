import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiLogOut, FiShield, FiUser } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Card, CardHeader, KeyValue, PageHeader } from '../components/ui/Display';
import { Banner } from '../components/ui/Feedback';
import { PasswordInput, Segmented, TextInput } from '../components/ui/Form';
import { ConfirmDialog } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { ADMIN_ROLES } from '../lib/constants';
import { formatDateTime } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';
import { applyTheme } from '../lib/theme';

const RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}$/;

export default function Profile() {
  useDocumentTitle('Profile & security');
  const toast = useToast();
  const navigate = useNavigate();
  const { admin, setAdmin, refresh } = useSession();
  const [name, setName] = useState(admin.name);
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwTouched, setPwTouched] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  const [allBusy, setAllBusy] = useState(false);

  const pwErrors = {
    currentPassword: pw.currentPassword ? '' : 'Enter your current password',
    newPassword: !RULE.test(pw.newPassword) ? 'At least 12 characters with upper- and lower-case letters and a number' : pw.newPassword === pw.currentPassword ? 'Choose a different password' : '',
    confirm: pw.confirm === pw.newPassword ? '' : 'Passwords don’t match',
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { toast.error('Name must be at least 2 characters'); return; }
    setSavingName(true);
    try { setAdmin(await api.updateProfile({ name: name.trim() })); toast.success('Name updated'); } catch (err) { toast.error(errorMessage(err)); } finally { setSavingName(false); }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    setPwTouched(true);
    if (Object.values(pwErrors).some(Boolean) || pwBusy) return;
    setPwBusy(true);
    setPwError('');
    try {
      await api.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Other sessions were signed out. This browser stays signed in.', { title: 'Password changed' });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwTouched(false);
      await refresh();
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };
  const setTheme = async (t) => {
    applyTheme(t);
    try { setAdmin(await api.updateProfile({ theme: t })); } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader title="Profile & security" description="Your administrator account." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><FiUser className="h-4 w-4 text-brand" aria-hidden />Profile</span>} />
            <form onSubmit={saveName} className="px-5 pb-5 space-y-4">
              <TextInput label="Display name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <dl className="grid grid-cols-2 gap-4">
                <KeyValue label="Email">{admin.email}</KeyValue>
                <KeyValue label="Role">{ADMIN_ROLES[admin.role]}</KeyValue>
                <KeyValue label="Last sign-in">{admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : '—'}</KeyValue>
                <KeyValue label="Password changed">{admin.passwordChangedAt ? formatDateTime(admin.passwordChangedAt) : '—'}</KeyValue>
              </dl>
              <Button type="submit" loading={savingName} disabled={name.trim() === admin.name}>Save name</Button>
            </form>
          </Card>
          <Card>
            <CardHeader title="Appearance" />
            <div className="px-5 pb-5"><Segmented label="Theme" value={admin.preferences?.theme || 'system'} onChange={setTheme} options={[{ value: 'system', label: 'Match system' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} /></div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><FiLock className="h-4 w-4 text-brand" aria-hidden />Change password</span>} />
            <form onSubmit={changePassword} noValidate className="px-5 pb-5 space-y-4">
              {pwError ? <Banner tone="danger">{pwError}</Banner> : null}
              <PasswordInput label="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={pwTouched ? pwErrors.currentPassword : ''} />
              <PasswordInput label="New password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pwTouched ? pwErrors.newPassword : ''} hint="12+ characters with upper- and lower-case letters and a number" />
              <PasswordInput label="Confirm new password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwTouched ? pwErrors.confirm : ''} />
              <Button type="submit" loading={pwBusy}>Update password</Button>
            </form>
          </Card>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><FiShield className="h-4 w-4 text-brand" aria-hidden />Sessions</span>} />
            <div className="px-5 pb-5 space-y-3 text-[13.5px]">
              <p>Admin sessions last up to 8 hours and live in a secure HttpOnly cookie that page scripts can’t read. Every change you make needs an additional anti-forgery token.</p>
              <p>Lost a device or signed in somewhere shared? Sign out everywhere — including here.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger-soft" icon={FiLogOut} onClick={() => setConfirmAll(true)}>Sign out everywhere</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <ConfirmDialog open={confirmAll} onClose={() => setConfirmAll(false)} loading={allBusy} title="Sign out of every session?" confirmLabel="Sign out everywhere" message="All browsers signed in to this account, including this one, are signed out immediately."
        onConfirm={async () => { setAllBusy(true); try { await api.logoutAll(); navigate('/login', { replace: true, state: { signedOut: true } }); window.location.reload(); } catch (err) { toast.error(errorMessage(err)); setAllBusy(false); } }} />
    </div>
  );
}
