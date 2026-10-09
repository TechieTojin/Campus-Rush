import { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiInfo, FiPlus, FiRadio } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Badge, Card, PageHeader } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Segmented, Select, TextArea, TextInput, Toggle } from '../components/ui/Form';
import { Dialog } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { AUDIENCES, TONE_STYLES } from '../lib/constants';
import { formatDateTime } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

const toLocal = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const EMPTY = { title: '', body: '', audience: 'students', canteen: '', tone: 'info', active: true, startsAt: '', endsAt: '' };

function AnnouncementDialog({ open, onClose, item, canteens, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(item ? { title: item.title, body: item.body, audience: item.audience, canteen: item.canteen?._id || '', tone: item.tone, active: item.active, startsAt: toLocal(item.startsAt), endsAt: toLocal(item.endsAt) } : EMPTY);
  }, [open, item]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? v.target.value : v }));
  const save = async () => {
    if (form.title.trim().length < 3) { setError('Title must be at least 3 characters'); return; }
    if (form.body.trim().length < 3) { setError('Write a message'); return; }
    setBusy(true);
    setError('');
    const body = { ...form, title: form.title.trim(), body: form.body.trim(), canteen: form.audience === 'students' ? null : form.canteen || null, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null };
    try {
      if (item) await api.updateAnnouncement(item._id, body); else await api.createAnnouncement(body);
      toast.success(form.active ? 'Open apps and websites in the audience show it within seconds.' : 'Saved as inactive.', { title: item ? 'Announcement updated' : 'Announcement published' });
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} title={item ? 'Edit announcement' : 'New announcement'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={save} loading={busy}>{item ? 'Save' : 'Publish'}</Button></>}>
      <div className="space-y-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <TextInput label="Title" value={form.title} onChange={set('title')} maxLength={100} required autoFocus />
        <TextArea label="Message" value={form.body} onChange={set('body')} maxLength={1000} rows={4} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Audience" value={form.audience} onChange={set('audience')}>
            {Object.entries(AUDIENCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          {form.audience !== 'students' ? (
            <Select label="Canteens" value={form.canteen} onChange={set('canteen')} hint="Students always get all-campus announcements.">
              <option value="">Every canteen</option>
              {canteens.map((c) => <option key={c._id} value={c._id}>Only {c.name}</option>)}
            </Select>
          ) : <div />}
          <div>
            <p className="label">Style</p>
            <Segmented label="Style" value={form.tone} onChange={set('tone')} options={Object.entries(TONE_STYLES).map(([k, v]) => ({ value: k, label: v.label }))} size="sm" />
          </div>
          <div className="pt-6"><Toggle checked={form.active} onChange={set('active')} label={form.active ? 'Active' : 'Inactive'} /></div>
          <TextInput label="Show from" optional type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
          <TextInput label="Show until" optional type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
        </div>
      </div>
    </Dialog>
  );
}

export default function Announcements() {
  useDocumentTitle('Announcements');
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.announcements(), []);
  const { data: canteens } = useAsync(() => api.canteens({}).then((r) => r.data), []);
  const [editing, setEditing] = useState(undefined);
  useRealtime('announcement.updated', useCallback(() => reload({ silent: true }), [reload]));
  const toggle = async (a) => {
    try {
      await api.updateAnnouncement(a._id, { active: !a.active });
      toast.success(a.active ? 'Announcement hidden' : 'Announcement shown');
      await reload({ silent: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader title="Announcements" description="Messages for students (app home screen) and canteen staff (website notifications)." actions={<Button icon={FiPlus} onClick={() => setEditing(null)}>New announcement</Button>} />
      <Banner tone="info" className="mb-5"><span className="inline-flex gap-1.5"><FiInfo className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Delivery is in-app only: open apps and websites update within seconds, others see it next time they open. There are no push notifications, emails or SMS.</span></Banner>
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={4} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.length ? (
          <EmptyState icon={FiRadio} title="No announcements yet" action={<Button icon={FiPlus} onClick={() => setEditing(null)}>New announcement</Button>} />
        ) : (
          <ul className="divide-y divide-divider">
            {data.map((a) => (
              <li key={a._id} className="px-5 py-4 flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-ink">{a.title}</h3>
                    <Badge tone={TONE_STYLES[a.tone]?.tone}>{TONE_STYLES[a.tone]?.label}</Badge>
                    {a.live ? <Badge tone="success">Live</Badge> : a.active ? <Badge tone="info">Scheduled</Badge> : <Badge>Inactive</Badge>}
                  </div>
                  <p className="text-body text-[13.5px] whitespace-pre-line">{a.body}</p>
                  <p className="text-[12.5px] text-muted mt-1.5">
                    {AUDIENCES[a.audience]}{a.canteen ? ` · only ${a.canteen.name}` : ''} · {formatDateTime(a.createdAt)}{a.createdBy ? ` by ${a.createdBy.name}` : ''}
                    {a.startsAt ? ` · from ${formatDateTime(a.startsAt)}` : ''}{a.endsAt ? ` · until ${formatDateTime(a.endsAt)}` : ''}
                    {a.audience !== 'students' ? ` · read by ${a.readCount} staff` : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Toggle size="sm" checked={a.active} onChange={() => toggle(a)} label={a.active ? 'Active' : 'Off'} />
                  <Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => setEditing(a)}>Edit</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <AnnouncementDialog open={editing !== undefined} onClose={() => setEditing(undefined)} item={editing || null} canteens={canteens || []} onSaved={() => reload({ silent: true })} />
    </div>
  );
}
