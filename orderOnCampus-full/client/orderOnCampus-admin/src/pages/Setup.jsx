import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import { Banner } from '../components/ui/Feedback';
import { PasswordInput } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';

const RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}$/;

// Invited administrators choose their password here using the one-time link a super admin shared.
export default function Setup() {
  useDocumentTitle('Set up your account');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errors = {
    password: RULE.test(form.password) ? '' : 'At least 12 characters with upper- and lower-case letters and a number',
    confirm: form.confirm === form.password ? '' : 'Passwords don’t match',
  };
  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.password || errors.confirm || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.setup(token, form.password);
      await refresh();
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };
  return (
    <AuthLayout>
      <h1 className="text-[28px] font-extrabold">Set up your admin account</h1>
      <p className="text-muted mt-1">Choose a strong password. This link works once and expires 48 hours after it was created.</p>
      {!/^[a-f0-9]{64}$/.test(token) ? <Banner tone="danger" className="mt-6">This setup link is incomplete. Ask the super admin who invited you for a new one.</Banner> : null}
      {error ? <Banner tone="danger" className="mt-6">{error}</Banner> : null}
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <PasswordInput label="New password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={touched ? errors.password : ''} hint="12+ characters with upper- and lower-case letters and a number" />
        <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={touched ? errors.confirm : ''} />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!/^[a-f0-9]{64}$/.test(token)}>Set password and sign in</Button>
      </form>
    </AuthLayout>
  );
}
