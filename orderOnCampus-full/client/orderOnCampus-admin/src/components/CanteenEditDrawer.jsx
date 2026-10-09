import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { CANTEEN_TYPES } from '../lib/constants';
import Button from './ui/Button';
import { Banner } from './ui/Feedback';
import { Select, TextArea, TextInput, Toggle } from './ui/Form';
import ImageUpload from './ui/ImageUpload';
import { Drawer } from './ui/Overlay';
import { useToast } from './ui/useToast';

const FIELDS = ['name', 'location', 'category', 'canteenDescription', 'phone', 'contactEmail', 'openingTime', 'closingTime', 'pickupInstructions', 'logo', 'coverImage', 'openStatus'];
const pick = (c) => Object.fromEntries(FIELDS.map((f) => [f, f === 'openStatus' ? c[f] !== false : c[f] || '']));

// Edits the same canteen profile the canteen's staff edit on their website (same API validation).
export default function CanteenEditDrawer({ canteen, open, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => pick(canteen || {}));
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState('');
  // Reset when the drawer opens, not on every background refresh of the canteen (that would wipe typing).
  const canteenKey = canteen?._id;
  useEffect(() => {
    if (open && canteen) { setForm(pick(canteen)); setError(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canteenKey]);
  if (!canteen) return null;
  const original = pick(canteen);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? v.target.value : v }));
  const save = async () => {
    const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== original[k]).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    if (!Object.keys(changed).length) { onClose(); return; }
    if (changed.openingTime !== undefined || changed.closingTime !== undefined) { changed.openingTime = form.openingTime; changed.closingTime = form.closingTime; }
    setBusy(true);
    setError('');
    try {
      await api.updateCanteen(canteen._id, changed);
      toast.success('Staff and students see the update straight away.', { title: `${form.name} saved` });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const busyUpload = (on) => setUploads((n) => n + (on ? 1 : -1));
  return (
    <Drawer open={open} onClose={busy ? () => {} : onClose} title={`Edit ${canteen.name}`} subtitle="Profile shown to students and staff" width="max-w-2xl"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={save} loading={busy} disabled={!!uploads}>Save changes</Button></div>}>
      <div className="space-y-5">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {canteen.status !== 'active' ? <Banner tone="warning">This canteen is {canteen.status}; ordering can’t be switched on until it’s active.</Banner> : null}
        <Toggle checked={form.openStatus} onChange={set('openStatus')} disabled={canteen.status !== 'active' && !form.openStatus} label={form.openStatus ? 'Accepting orders' : 'Not accepting orders'} description="The same switch canteen staff use. The server rejects orders while it’s off." />
        <TextInput label="Canteen name" value={form.name} onChange={set('name')} maxLength={60} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Location on campus" value={form.location} onChange={set('location')} maxLength={120} required />
          <Select label="Type" value={form.category} onChange={set('category')} required>
            {[...new Set([...CANTEEN_TYPES, form.category].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <TextArea label="Description" optional value={form.canteenDescription} onChange={set('canteenDescription')} maxLength={500} rows={3} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Opens at" optional type="time" value={form.openingTime} onChange={set('openingTime')} />
          <TextInput label="Closes at" optional type="time" value={form.closingTime} onChange={set('closingTime')} />
          <TextInput label="Phone" optional value={form.phone} onChange={set('phone')} maxLength={20} />
          <TextInput label="Contact email" optional type="email" value={form.contactEmail} onChange={set('contactEmail')} maxLength={80} />
        </div>
        <TextArea label="Pickup instructions" optional value={form.pickupInstructions} onChange={set('pickupInstructions')} maxLength={300} rows={2} />
        <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-4">
          <ImageUpload label="Logo" aspect="aspect-square" value={form.logo} onChange={set('logo')} onBusyChange={busyUpload} hint="Square · 2 MB" />
          <ImageUpload label="Cover image" aspect="aspect-[16/9]" value={form.coverImage} onChange={set('coverImage')} onBusyChange={busyUpload} hint="Wide · 2 MB" />
        </div>
      </div>
    </Drawer>
  );
}
