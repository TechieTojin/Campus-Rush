import { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiImage, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button, { IconButton } from '../components/ui/Button';
import { Badge, Card, PageHeader } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Segmented, Select, TextInput, Toggle } from '../components/ui/Form';
import ImageUpload from '../components/ui/ImageUpload';
import { ConfirmDialog, Dialog } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage, imageUrl } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

const TONES = { brand: 'from-brand-700 to-brand-900', saffron: 'from-accent-400 to-accent-600', dark: 'from-[#1b2b2a] to-[#081211]' };
const toLocal = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const EMPTY = { title: '', subtitle: '', image: '', tone: 'brand', targetType: 'none', canteen: '', query: '', active: true, sortOrder: 0, startsAt: '', endsAt: '' };

// What the student app renders (same proportions as the home screen card).
function Preview({ b }) {
  return (
    <div className={`relative aspect-[2.4/1] rounded-2xl overflow-hidden bg-gradient-to-br ${TONES[b.tone] || TONES.brand} text-white p-4 flex flex-col justify-end`}>
      {b.image ? <img src={imageUrl(b.image)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
      {b.image ? <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" /> : null}
      <p className="relative font-extrabold text-[17px] leading-tight drop-shadow">{b.title || 'Banner title'}</p>
      {b.subtitle ? <p className="relative text-[12.5px] text-white/90 drop-shadow">{b.subtitle}</p> : null}
    </div>
  );
}

function BannerDialog({ open, onClose, item, canteens, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(item ? { title: item.title, subtitle: item.subtitle, image: item.image, tone: item.tone, targetType: item.target?.type || 'none', canteen: item.target?.canteen?._id || '', query: item.target?.query || '', active: item.active, sortOrder: item.sortOrder, startsAt: toLocal(item.startsAt), endsAt: toLocal(item.endsAt) } : EMPTY);
  }, [open, item]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? v.target.value : v }));
  const save = async () => {
    setBusy(true);
    setError('');
    const body = {
      title: form.title.trim(), subtitle: form.subtitle.trim(), image: form.image, tone: form.tone, active: form.active, sortOrder: Number(form.sortOrder) || 0,
      target: form.targetType === 'canteen' ? { type: 'canteen', canteen: form.canteen } : form.targetType === 'search' ? { type: 'search', query: form.query.trim() } : { type: 'none' },
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };
    try {
      if (item) await api.updateBanner(item._id, body); else await api.createBanner(body);
      toast.success('The student app home screen updates within seconds.', { title: item ? 'Banner saved' : 'Banner created' });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title={item ? 'Edit banner' : 'New banner'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={save} loading={busy} disabled={uploading}>{item ? 'Save' : 'Create banner'}</Button></>}>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-5">
        <div className="space-y-4">
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <TextInput label="Title" value={form.title} onChange={set('title')} maxLength={60} required />
          <TextInput label="Subtitle" optional value={form.subtitle} onChange={set('subtitle')} maxLength={120} />
          <div><p className="label">Background</p><Segmented size="sm" label="Background" value={form.tone} onChange={set('tone')} options={[{ value: 'brand', label: 'Teal' }, { value: 'saffron', label: 'Saffron' }, { value: 'dark', label: 'Dark' }]} /></div>
          <Select label="When tapped" value={form.targetType} onChange={set('targetType')} hint="Only in-app destinations are allowed — no external links.">
            <option value="none">Do nothing</option>
            <option value="canteen">Open a canteen</option>
            <option value="search">Open search with text</option>
          </Select>
          {form.targetType === 'canteen' ? (
            <Select label="Canteen" value={form.canteen} onChange={set('canteen')} required>
              <option value="">Choose an active canteen…</option>
              {canteens.filter((c) => c.status === 'active').map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          ) : null}
          {form.targetType === 'search' ? <TextInput label="Search text" value={form.query} onChange={set('query')} maxLength={40} placeholder="e.g. dosa" /> : null}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TextInput label="Order" type="number" min="0" max="999" value={form.sortOrder} onChange={set('sortOrder')} hint="Lower first" />
            <TextInput label="Show from" optional type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
            <TextInput label="Show until" optional type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
          </div>
          <Toggle checked={form.active} onChange={set('active')} label={form.active ? 'Enabled' : 'Disabled'} />
        </div>
        <div className="space-y-4">
          <div><p className="label">Preview</p><Preview b={form} /></div>
          <ImageUpload label="Image" optional value={form.image} onChange={set('image')} onBusyChange={setUploading} aspect="aspect-[2.4/1]" hint="Wide · up to 2 MB" />
        </div>
      </div>
    </Dialog>
  );
}

export default function Banners() {
  useDocumentTitle('App banners');
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.banners(), []);
  const { data: canteens } = useAsync(() => api.canteens({}).then((r) => r.data), []);
  const [editing, setEditing] = useState(undefined);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  useRealtime('content.updated', useCallback(() => reload({ silent: true }), [reload]));
  const toggle = async (b) => {
    try { await api.updateBanner(b._id, { active: !b.active }); toast.success(b.active ? 'Banner disabled' : 'Banner enabled'); reload({ silent: true }); } catch (e) { toast.error(errorMessage(e)); }
  };
  return (
    <div className="animate-rise-in">
      <PageHeader title="App banners" description="Promotional cards on the student app home screen, shown in order." actions={<Button icon={FiPlus} onClick={() => setEditing(null)}>New banner</Button>} />
      {loading && !data ? <SkeletonRows rows={3} className="h-40" /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.length ? (
        <Card><EmptyState icon={FiImage} title="No banners yet" message="Without banners, the app home screen starts with canteens." action={<Button icon={FiPlus} onClick={() => setEditing(null)}>New banner</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.map((b) => (
            <Card key={b._id} className="p-4">
              <Preview b={b} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {b.live ? <Badge tone="success">Live</Badge> : b.active ? <Badge tone="info">Scheduled</Badge> : <Badge>Disabled</Badge>}
                <Badge>Order {b.sortOrder}</Badge>
                <span className="text-[12.5px] text-muted">{b.target?.type === 'canteen' ? `Opens ${b.target.canteen?.name || 'a canteen'}` : b.target?.type === 'search' ? `Searches “${b.target.query}”` : 'Not tappable'}</span>
              </div>
              {b.startsAt || b.endsAt ? <p className="text-[12px] text-muted mt-1">{b.startsAt ? `From ${formatDateTime(b.startsAt)}` : ''}{b.endsAt ? ` until ${formatDateTime(b.endsAt)}` : ''}</p> : null}
              <div className="mt-3 flex items-center gap-2">
                <Toggle size="sm" checked={b.active} onChange={() => toggle(b)} label="Enabled" />
                <span className="flex-1" />
                <Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => setEditing(b)}>Edit</Button>
                <IconButton icon={FiTrash2} label={`Delete ${b.title}`} className="text-danger hover:bg-danger/10" onClick={() => setRemoving(b)} />
              </div>
            </Card>
          ))}
        </div>
      )}
      <BannerDialog open={editing !== undefined} onClose={() => setEditing(undefined)} item={editing || null} canteens={canteens || []} onSaved={() => reload({ silent: true })} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} loading={busy} title={`Delete “${removing?.title}”?`} confirmLabel="Delete banner" message="It disappears from the student app immediately. This can’t be undone — disable it instead to keep it for later."
        onConfirm={async () => { setBusy(true); try { await api.deleteBanner(removing._id); toast.success('Banner deleted'); setRemoving(null); reload({ silent: true }); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } }} />
    </div>
  );
}
