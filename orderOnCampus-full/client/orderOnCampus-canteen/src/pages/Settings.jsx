import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiLock, FiLogOut, FiShield, FiUser } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Card, CardHeader, KeyValue, PageHeader } from '../components/ui/Display';
import { Banner } from '../components/ui/Feedback';
import { PasswordInput, Select, TextInput, Toggle } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';
import { useToast } from '../components/ui/useToast';

function AccountCard() {
  const { staff, setStaff } = useSession();
  const toast = useToast();
  const [name, setName] = useState(staff.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Enter at least 2 characters'); return; }
    setSaving(true);
    try {
      const updated = await api.updateAccount({ username: name.trim() });
      setStaff(updated);
      toast.success('Name updated');
      setError('');
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><FiUser className="h-4 w-4 text-brand-600" aria-hidden />Staff account</span>} />
      <form onSubmit={save} noValidate className="px-5 pb-5 space-y-4">
        <TextInput label="Display name" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} error={error} maxLength={60} />
        <dl className="grid sm:grid-cols-2 gap-4">
          <KeyValue label="Sign-in email">{staff.email}</KeyValue>
          <KeyValue label="Manages">{staff.ownedCanteens.map((c) => c.name).join(', ')}</KeyValue>
        </dl>
        <p className="text-[12.5px] text-muted">Your sign-in email can’t be changed here. Ask your Campus Rush administrator if it needs to change.</p>
        <Button type="submit" icon={FiCheck} loading={saving} disabled={name.trim() === staff.username}>Save name</Button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const errors = {
    currentPassword: !form.currentPassword ? 'Enter your current password' : '',
    newPassword: !/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(form.newPassword) ? 'At least 8 characters with a letter and a number' : form.newPassword === form.currentPassword ? 'Choose a different password' : '',
    confirm: form.confirm !== form.newPassword ? "Passwords don't match" : '',
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean) || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Use your new password next time you sign in.', { title: 'Password changed' });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setTouched(false);
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><FiLock className="h-4 w-4 text-brand-600" aria-hidden />Change password</span>} />
      <form onSubmit={save} noValidate className="px-5 pb-5 space-y-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <PasswordInput label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={touched ? errors.currentPassword : ''} />
        <PasswordInput label="New password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={touched ? errors.newPassword : ''} hint="At least 8 characters with a letter and a number" />
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={touched ? errors.confirm : ''} />
        <Button type="submit" loading={saving}>Update password</Button>
      </form>
    </Card>
  );
}

function PreferencesCard() {
  const { staff, setStaff } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const prefs = staff.preferences || { soundOnNewOrder: true, liveRefreshSeconds: 10 };
  const save = async (patch) => {
    setBusy(true);
    try {
      setStaff(await api.updatePreferences(patch));
      toast.success('Preference saved');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><FiBell className="h-4 w-4 text-brand-600" aria-hidden />Order alerts</span>} subtitle="Saved to your account, applies on any device you sign in from." />
      <div className="px-5 pb-5 space-y-5">
        <Toggle checked={prefs.soundOnNewOrder !== false} disabled={busy} onChange={(v) => save({ soundOnNewOrder: v })} label="Play a chime for new orders" description="Plays while this portal is open in a browser tab. Browsers may block sound until you've clicked on the page once." />
        <Select label="Live orders refresh" value={prefs.liveRefreshSeconds || 10} disabled={busy} onChange={(e) => save({ liveRefreshSeconds: Number(e.target.value) })} hint="How often the live order board checks for new orders and changes.">
          {[5, 10, 15, 30, 60].map((s) => <option key={s} value={s}>Every {s} seconds</option>)}
        </Select>
        <p className="text-[12.5px] text-muted">Alerts are in-app only. Campus Rush doesn’t send email, SMS or browser push notifications.</p>
      </div>
    </Card>
  );
}

export default function Settings() {
  useDocumentTitle('Settings');
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader title="Settings" description="Your staff account, security and alert preferences. Canteen details live on the Canteen profile page." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <div className="space-y-6">
          <AccountCard />
          <PreferencesCard />
        </div>
        <div className="space-y-6">
          <PasswordCard />
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><FiShield className="h-4 w-4 text-brand-600" aria-hidden />Session & security</span>} />
            <div className="px-5 pb-5 space-y-3 text-[13.5px] text-body">
              <p>You stay signed in for up to 24 hours on this browser. Your session is kept in a secure, HttpOnly cookie that page scripts can’t read.</p>
              <p>Your account can only see and change <strong>your own canteen’s</strong> menu, orders and customers — the server checks this on every request.</p>
              <Button variant="danger-soft" icon={FiLogOut} onClick={async () => { await signOut(); navigate('/login', { replace: true, state: { signedOut: true } }); }}>Sign out of this browser</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
