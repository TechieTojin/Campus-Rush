import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiClock, FiMapPin, FiSmartphone } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Card, PageHeader, Thumb } from '../components/ui/Display';
import { Banner, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Select, TextArea, TextInput, Toggle } from '../components/ui/Form';
import ImageUpload from '../components/ui/ImageUpload';
import { api, errorMessage, imageUrl } from '../lib/api';
import { useAsync, useDocumentTitle, useUnsavedWarning } from '../lib/hooks';
import { to12h } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import { useToast } from '../components/ui/useToast';
import { CANTEEN_TYPES } from '../lib/constants';

const FIELDS = ['name', 'location', 'canteenDescription', 'category', 'phone', 'contactEmail', 'openingTime', 'closingTime', 'pickupInstructions', 'logo', 'coverImage', 'openStatus'];
const pick = (c) => Object.fromEntries(FIELDS.map((f) => [f, f === 'openStatus' ? c[f] !== false : c[f] || '']));

const validate = (f) => {
  const e = {};
  if (f.name.trim().length < 3) e.name = 'At least 3 characters';
  if (f.location.trim().length < 3) e.location = 'At least 3 characters';
  if (!f.category) e.category = 'Choose a type';
  if (f.phone && !/^[+\d][\d\s-]{6,18}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number';
  if (f.contactEmail && !/^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(f.contactEmail.trim())) e.contactEmail = 'Enter a valid email';
  if (!!f.openingTime !== !!f.closingTime) e.closingTime = 'Set both opening and closing time, or neither';
  return e;
};

export default function Profile() {
  useDocumentTitle('Canteen profile');
  const { canteen, updateCanteenSummary } = useSession();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.canteen(canteen._id), [canteen._id]);
  const [form, setForm] = useState(null);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [saveError, setSaveError] = useState('');

  useEffect(() => { if (data) setForm(pick(data)); }, [data]);
  const original = useMemo(() => (data ? pick(data) : null), [data]);
  const dirty = form && original && JSON.stringify(form) !== JSON.stringify(original);
  useUnsavedWarning(dirty);

  if (loading && !data) return <Card className="p-6 max-w-5xl"><SkeletonRows rows={6} /></Card>;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!form) return null;

  const errors = validate(form);
  const err = (k) => (touched ? errors[k] : '');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? v.target.value : v }));
  const busy = (on) => setUploading((n) => n + (on ? 1 : -1));

  const save = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length || saving || uploading) return;
    setSaving(true);
    setSaveError('');
    try {
      const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== original[k]).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
      if (changed.openingTime !== undefined || changed.closingTime !== undefined) {
        changed.openingTime = form.openingTime;
        changed.closingTime = form.closingTime;
      }
      const updated = await api.updateCanteen(canteen._id, changed);
      setData(updated);
      updateCanteenSummary({ _id: updated._id, name: updated.name, location: updated.location, openStatus: updated.openStatus, logo: updated.logo, category: updated.category });
      toast.success('Students see the update next time they open or refresh the app.', { title: 'Canteen profile saved' });
    } catch (e2) {
      setSaveError(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-rise-in max-w-6xl">
      <PageHeader title="Canteen profile" description="How your canteen appears to students in the Campus Rush app." />
      <form onSubmit={save} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {saveError ? <Banner tone="danger">{saveError}</Banner> : null}
            <Card className="p-5 sm:p-6">
              <Toggle
                checked={form.openStatus}
                onChange={set('openStatus')}
                label={form.openStatus ? 'Accepting orders' : 'Not accepting orders'}
                description={form.openStatus ? 'Students can place orders now.' : 'Students can browse your menu but the app and server block new orders.'}
              />
            </Card>
            <Card className="p-5 sm:p-6 space-y-5">
              <h2 className="font-bold text-[16px]">Basic information</h2>
              <TextInput label="Canteen name" value={form.name} onChange={set('name')} error={err('name')} maxLength={60} required />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput label="Location on campus" value={form.location} onChange={set('location')} error={err('location')} maxLength={120} required />
                <Select label="Canteen type" value={form.category} onChange={set('category')} error={err('category')} required>
                  <option value="">Select a type</option>
                  {[...new Set([...CANTEEN_TYPES, form.category].filter(Boolean))].map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <TextArea label="Description" optional value={form.canteenDescription} onChange={set('canteenDescription')} maxLength={500} rows={3} hint="Shown at the top of your menu in the app." />
            </Card>
            <Card className="p-5 sm:p-6 space-y-5">
              <h2 className="font-bold text-[16px]">Hours & pickup</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput label="Opens at" optional type="time" value={form.openingTime} onChange={set('openingTime')} />
                <TextInput label="Closes at" optional type="time" value={form.closingTime} onChange={set('closingTime')} error={err('closingTime')} />
              </div>
              <p className="text-[13px] text-muted -mt-2 flex gap-1.5"><FiClock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />Hours are shown to students for information. Ordering is controlled only by the “Accepting orders” switch — remember to pause it when you close.</p>
              <TextArea label="Pickup instructions" optional value={form.pickupInstructions} onChange={set('pickupInstructions')} maxLength={300} rows={2} placeholder="e.g. Collect from the second counter. Show your order number." />
            </Card>
            <Card className="p-5 sm:p-6 space-y-5">
              <h2 className="font-bold text-[16px]">Contact</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput label="Phone" optional type="tel" value={form.phone} onChange={set('phone')} error={err('phone')} maxLength={20} />
                <TextInput label="Email" optional type="email" value={form.contactEmail} onChange={set('contactEmail')} error={err('contactEmail')} maxLength={80} />
              </div>
            </Card>
            <Card className="p-5 sm:p-6">
              <h2 className="font-bold text-[16px] mb-4">Images</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
                <ImageUpload label="Logo" aspect="aspect-square" value={form.logo} onChange={set('logo')} onBusyChange={busy} hint="Square · up to 2 MB" />
                <ImageUpload label="Cover image" aspect="aspect-[16/9]" value={form.coverImage} onChange={set('coverImage')} onBusyChange={busy} hint="Wide · up to 2 MB" />
              </div>
            </Card>
          </div>

          <div className="lg:sticky lg:top-24 self-start space-y-4">
            <Card className="overflow-hidden">
              <p className="text-[12px] font-bold uppercase tracking-wide text-faint px-5 pt-4 pb-3 flex items-center gap-1.5"><FiSmartphone className="h-3.5 w-3.5" aria-hidden />Student app preview</p>
              <div className="h-28 bg-brand-700 relative">
                {form.coverImage ? <img src={imageUrl(form.coverImage)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                <span className={`absolute top-3 left-3 h-6 px-2 rounded-md text-[11.5px] font-bold inline-flex items-center ${form.openStatus ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{form.openStatus ? 'Open now' : 'Closed'}</span>
              </div>
              <div className="p-5 -mt-8 relative">
                <Thumb src={form.logo} name={form.name} className="h-14 w-14 ring-4 ring-white" rounded="rounded-2xl" />
                <p className="font-extrabold text-ink text-[17px] mt-2">{form.name || 'Canteen name'}</p>
                <p className="text-[13px] text-muted flex items-center gap-1"><FiMapPin className="h-3.5 w-3.5" aria-hidden />{form.location || 'Location'}</p>
                {form.openingTime && form.closingTime ? <p className="text-[13px] text-muted flex items-center gap-1 mt-0.5"><FiClock className="h-3.5 w-3.5" aria-hidden />{to12h(form.openingTime)} – {to12h(form.closingTime)}</p> : null}
                {form.canteenDescription ? <p className="text-[13px] text-body mt-2 line-clamp-3">{form.canteenDescription}</p> : null}
              </div>
            </Card>
            <div className="flex flex-col gap-2">
              <Button type="submit" icon={FiCheck} loading={saving} disabled={!dirty || !!uploading}>Save changes</Button>
              <Button variant="ghost" onClick={() => { setForm(original); setTouched(false); setSaveError(''); }} disabled={!dirty || saving}>Discard changes</Button>
              {uploading ? <p className="text-[12.5px] text-muted text-center">Waiting for image upload…</p> : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
