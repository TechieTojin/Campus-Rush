import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import { Banner } from '../components/ui/Feedback';
import { PasswordInput, TextInput } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';

const EMAIL = /^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;

export default function Register() {
  useDocumentTitle('Create staff account');
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', signupCode: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const errors = {
    name: form.name.trim().length < 2 ? 'Enter your name' : '',
    email: !EMAIL.test(form.email.trim()) ? 'Enter a valid email address' : '',
    password: !/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(form.password) ? 'At least 8 characters, including a letter and a number' : '',
    confirm: form.confirm !== form.password ? "Passwords don't match" : '',
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.values(errors).some(Boolean) || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.register({ name: form.name.trim(), email: form.email.trim(), password: form.password, signupCode: form.signupCode.trim() || undefined });
      await refresh();
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-extrabold">Create a staff account</h1>
      <p className="text-muted mt-1">Next you’ll set up your canteen. Each account manages one canteen it creates — it can’t join or edit another canteen.</p>
      {error ? <Banner tone="danger" className="mt-6">{error}</Banner> : null}
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <TextInput label="Your name" autoComplete="name" value={form.name} onChange={set('name')} onBlur={blur('name')} error={touched.name ? errors.name : ''} required autoFocus />
        <TextInput label="Work email" type="email" autoComplete="email" value={form.email} onChange={set('email')} onBlur={blur('email')} error={touched.email ? errors.email : ''} required />
        <PasswordInput label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} onBlur={blur('password')} error={touched.password ? errors.password : ''} hint="At least 8 characters, including a letter and a number" required />
        <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} onBlur={blur('confirm')} error={touched.confirm ? errors.confirm : ''} required />
        <TextInput label="Invite code" optional value={form.signupCode} onChange={set('signupCode')} hint="Required only if your administrator has enabled invite codes." />
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <div className="mt-8 pt-6 border-t border-divider text-[14px]">
        Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
      </div>
    </AuthLayout>
  );
}
