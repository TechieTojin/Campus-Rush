import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import { Banner } from '../components/ui/Feedback';
import { PasswordInput } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';

// Staff accounts created by a Campus Rush admin choose their first password here, using the
// one-time link the admin shared with them.
export default function SetupPassword() {
  useDocumentTitle('Set your password');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const valid = /^[a-f0-9]{64}$/.test(token);
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errors = {
    password: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(form.password) ? '' : 'At least 8 characters, including a letter and a number',
    confirm: form.confirm === form.password ? '' : 'Passwords don’t match',
  };
  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || errors.password || errors.confirm || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.setupPassword(token, form.password);
      const me = await refresh();
      navigate(me?.ownedCanteens?.length ? '/dashboard' : '/setup', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };
  return (
    <AuthLayout>
      <h1 className="text-[28px] font-extrabold">Set your password</h1>
      <p className="text-muted mt-1">A Campus Rush administrator created your staff account. Choose a password to finish setting it up.</p>
      {!valid ? <Banner tone="danger" className="mt-6">This setup link is incomplete. Ask your administrator for a new one.</Banner> : null}
      {error ? <Banner tone="danger" className="mt-6">{error}</Banner> : null}
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <PasswordInput label="New password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={touched ? errors.password : ''} hint="At least 8 characters, including a letter and a number" />
        <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={touched ? errors.confirm : ''} />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!valid}>Set password and sign in</Button>
      </form>
    </AuthLayout>
  );
}
