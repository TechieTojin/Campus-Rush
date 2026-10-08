import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import { Banner } from '../components/ui/Feedback';
import { PasswordInput, TextInput } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';

const EMAIL = /^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;

export default function Login() {
  useDocumentTitle('Sign in');
  const { refresh, status } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const errors = {
    email: !form.email.trim() ? 'Enter your staff email' : !EMAIL.test(form.email.trim()) ? 'Enter a valid email address' : '',
    password: !form.password ? 'Enter your password' : '',
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (errors.email || errors.password || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.login(form.email.trim(), form.password);
      const me = await refresh();
      const from = location.state?.from;
      navigate(me?.ownedCanteens?.length ? (from && from !== '/login' ? from : '/dashboard') : '/setup', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in. Please try again.'));
      setForm((f) => ({ ...f, password: '' }));
      setLoading(false);
    }
  };

  const notice = location.state?.signedOut
    ? { tone: 'success', text: 'You have been signed out.' }
    : status === 'expired' || location.state?.from
      ? { tone: 'info', text: 'Please sign in to continue.' }
      : null;

  return (
    <AuthLayout>
      <h1 className="text-[28px] font-extrabold">Welcome back</h1>
      <p className="text-muted mt-1">Sign in to manage your canteen’s orders and menu.</p>

      {notice && !error ? <Banner tone={notice.tone} className="mt-6">{notice.text}</Banner> : null}
      {error ? <Banner tone="danger" className="mt-6">{error}</Banner> : null}

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <TextInput
          label="Staff email"
          type="email"
          autoComplete="username"
          placeholder="you@canteen.edu"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={touched.email ? errors.email : ''}
          required
          autoFocus
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={touched.password ? errors.password : ''}
          required
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} trailingIcon={FiArrowRight}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-muted">
        Forgot your password? Ask your canteen administrator to reset it — self-service reset isn’t available yet.
      </p>
      <div className="mt-8 pt-6 border-t border-divider text-[14px]">
        New canteen on Campus Rush? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create a staff account</Link>
      </div>
    </AuthLayout>
  );
}
