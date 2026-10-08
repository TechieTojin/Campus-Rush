import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Button from '../components/ui/Button';
import { Banner, Spinner } from '../components/ui/Feedback';
import { Select, TextArea, TextInput } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';
import { CANTEEN_TYPES } from '../lib/constants';

export default function Setup() {
  useDocumentTitle('Set up your canteen');
  const { status, canteen, refresh, signOut } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ canteenName: '', location: '', category: '', canteenDescription: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (status !== 'signedIn') return <Navigate to="/login" replace />;
  if (canteen) return <Navigate to="/dashboard" replace />;

  const errors = {
    canteenName: form.canteenName.trim().length < 3 ? 'At least 3 characters' : '',
    location: form.location.trim().length < 3 ? 'Where on campus is the counter?' : '',
    category: !form.category ? 'Choose the type of canteen' : '',
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ canteenName: true, location: true, category: true });
    if (Object.values(errors).some(Boolean) || loading) return;
    setLoading(true);
    setError('');
    try {
      await api.createCanteen(form);
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-600">Step 2 of 2</p>
      <h1 className="text-[28px] font-extrabold mt-1">Set up your canteen</h1>
      <p className="text-muted mt-1">Students see this in the app. It starts as <strong>not accepting orders</strong> so you can add your menu first.</p>
      {error ? <Banner tone="danger" className="mt-6">{error}</Banner> : null}
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <TextInput label="Canteen name" value={form.canteenName} onChange={set('canteenName')} onBlur={() => setTouched((t) => ({ ...t, canteenName: true }))} error={touched.canteenName ? errors.canteenName : ''} maxLength={60} required autoFocus />
        <TextInput label="Location on campus" placeholder="e.g. Central Block, ground floor" value={form.location} onChange={set('location')} onBlur={() => setTouched((t) => ({ ...t, location: true }))} error={touched.location ? errors.location : ''} maxLength={120} required />
        <Select label="Canteen type" value={form.category} onChange={set('category')} error={touched.category ? errors.category : ''} required>
          <option value="">Select a type</option>
          {CANTEEN_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <TextArea label="Short description" optional value={form.canteenDescription} onChange={set('canteenDescription')} maxLength={500} rows={3} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>{loading ? 'Creating canteen…' : 'Create canteen'}</Button>
      </form>
      <button type="button" onClick={async () => { await signOut(); navigate('/login'); }} className="mt-6 text-[13px] font-semibold text-muted hover:text-ink">Sign out</button>
    </AuthLayout>
  );
}
