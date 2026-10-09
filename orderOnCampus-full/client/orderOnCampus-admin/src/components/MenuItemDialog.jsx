import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { DIETARY } from '../lib/constants';
import Button from './ui/Button';
import { Banner } from './ui/Feedback';
import { Select, TextArea, TextInput, Toggle } from './ui/Form';
import ImageUpload from './ui/ImageUpload';
import { Dialog } from './ui/Overlay';
import { useToast } from './ui/useToast';

const EMPTY = { name: '', description: '', price: '', category: '', image: '', available: true, prepTime: '', dietary: '' };

const validate = (f) => {
  const e = {};
  if (f.name.trim().length < 2 || f.name.trim().length > 80) e.name = 'Name must be 2–80 characters';
  const p = Number(f.price);
  if (f.price === '') e.price = 'Enter a price';
  else if (!Number.isFinite(p) || p <= 0) e.price = 'Price must be more than ₹0';
  else if (p > 100000) e.price = 'Price looks too high';
  else if (Math.abs(Math.round(p * 100) - p * 100) > 1e-6) e.price = 'Use at most 2 decimal places';
  if (f.prepTime !== '' && (!Number.isInteger(Number(f.prepTime)) || Number(f.prepTime) < 1 || Number(f.prepTime) > 240)) e.prepTime = 'Whole minutes, 1–240';
  return e;
};

// Create (item = null) or edit a menu item of `canteen` ({ _id, name, categories }). Uses the same
// server-side validation as the canteen website; the change is visible to staff and students immediately.
export default function MenuItemDialog({ open, onClose, canteen, canteens, item, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [canteenId, setCanteenId] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Reset only when the dialog opens for a different item/canteen. Parents pass fresh `canteen`
  // objects on every render (and realtime refreshes re-render often), so depend on ids, not objects —
  // otherwise typing would be wiped before saving.
  const canteenKey = canteen?._id || '';
  const itemKey = item?._id || '';
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setError('');
    setCanteenId(canteenKey);
    setForm(item ? {
      name: item.name, description: item.description || '', price: String(item.price), category: item.category || '', image: item.image || '',
      available: item.available !== false, prepTime: item.prepTime ? String(item.prepTime) : '', dietary: item.dietary || '',
    } : EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemKey, canteenKey]);

  const target = canteen || (canteens || []).find((c) => c._id === canteenId);
  const categories = target?.categories || [];
  const errors = validate(form);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? v.target.value : v }));

  const save = async () => {
    setTouched(true);
    if (!target) { setError('Choose a canteen'); return; }
    if (Object.keys(errors).length || busy || uploading) return;
    setBusy(true);
    setError('');
    const body = {
      name: form.name.trim(), description: form.description.trim(), price: Number(form.price), category: form.category,
      image: form.image, available: form.available, prepTime: form.prepTime === '' ? null : Number(form.prepTime), dietary: form.dietary,
    };
    try {
      const saved = item ? await api.updateItem(target._id, item._id, body) : await api.createItem(target._id, body);
      toast.success(`${saved.name} ${item ? 'updated' : `added to ${target.name}`}. Staff and students see it now.`, { title: item ? 'Item saved' : 'Item added' });
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} size="lg" title={item ? `Edit ${item.name}` : 'Add menu item'}
      description={target ? `${target.name} · past orders keep the price they were placed with` : 'Choose the canteen this item belongs to'}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={save} loading={busy} disabled={uploading}>{item ? 'Save changes' : 'Add item'}</Button></>}>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-5">
        <div className="space-y-4">
          {error ? <Banner tone="danger">{error}</Banner> : null}
          {!canteen ? (
            <Select label="Canteen" value={canteenId} onChange={(e) => { setCanteenId(e.target.value); setForm((f) => ({ ...f, category: '' })); }} required error={touched && !target ? 'Choose a canteen' : ''}>
              <option value="">Choose a canteen…</option>
              {(canteens || []).map((c) => <option key={c._id} value={c._id}>{c.name}{c.status !== 'active' ? ` (${c.status})` : ''}</option>)}
            </Select>
          ) : null}
          <TextInput label="Item name" value={form.name} onChange={set('name')} error={touched ? errors.name : ''} maxLength={80} required />
          <TextArea label="Description" optional value={form.description} onChange={set('description')} maxLength={500} rows={3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput label="Price" prefix="₹" type="number" min="1" step="0.5" inputMode="decimal" value={form.price} onChange={set('price')} error={touched ? errors.price : ''} required />
            <Select label="Category" value={form.category} onChange={set('category')} hint={categories.length ? undefined : 'This canteen has no categories yet'}>
              <option value="">Uncategorised</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <TextInput label="Preparation time" optional type="number" min="1" max="240" suffix="minutes" value={form.prepTime} onChange={set('prepTime')} error={touched ? errors.prepTime : ''} />
            <Select label="Dietary" optional value={form.dietary} onChange={set('dietary')}>
              <option value="">Not specified</option>
              {Object.entries(DIETARY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <Toggle checked={form.available} onChange={set('available')} label={form.available ? 'Available to order' : 'Unavailable (sold out)'} description="Students can only order available items; the server rejects anything else." />
        </div>
        <ImageUpload label="Photo" value={form.image} onChange={set('image')} onBusyChange={setUploading} aspect="aspect-square" />
      </div>
    </Dialog>
  );
}
