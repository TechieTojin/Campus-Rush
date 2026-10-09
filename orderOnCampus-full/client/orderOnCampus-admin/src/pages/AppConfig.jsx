import { useEffect, useState } from 'react';
import { FiInfo, FiSmartphone } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Card, CardHeader, PageHeader } from '../components/ui/Display';
import { Banner, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Checkbox, TextArea, TextInput, Toggle } from '../components/ui/Form';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAsync, useDocumentTitle, useUnsavedWarning } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';

const pick = (s) => ({
  maintenance: { enabled: !!s.maintenance?.enabled, message: s.maintenance?.message || '' },
  support: { email: s.support?.email || '', phone: s.support?.phone || '', hours: s.support?.hours || '' },
  studentApp: { featuredCanteens: (s.studentApp?.featuredCanteens || []).map(String), showPopularItems: s.studentApp?.showPopularItems !== false, enableFavorites: s.studentApp?.enableFavorites !== false },
});

// Remote configuration limited to settings the installed student app explicitly supports.
// Everything is validated on the server; nothing here can run code in the app.
export default function AppConfig() {
  useDocumentTitle('Student app config');
  const toast = useToast();
  const { admin } = useSession();
  const canEdit = !!admin?.permissions?.platformSettings;
  const { data, error, loading, reload, setData } = useAsync(() => api.settings(), []);
  const { data: canteens } = useAsync(() => api.canteens({ status: 'active' }).then((r) => r.data), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => { if (data) setForm(pick(data)); }, [data]);
  const dirty = form && data && JSON.stringify(form) !== JSON.stringify(pick(data));
  useUnsavedWarning(dirty);

  if (loading && !data) return <Card className="p-6"><SkeletonRows rows={6} /></Card>;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!form) return null;

  const setPart = (part, key) => (v) => setForm((f) => ({ ...f, [part]: { ...f[part], [key]: v && v.target ? v.target.value : v } }));
  const featured = form.studentApp.featuredCanteens;
  const save = async () => {
    setBusy(true);
    setSaveError('');
    try {
      const updated = await api.updateSettings(form);
      setData(updated);
      toast.success('Open student apps refresh their configuration within seconds.', { title: 'App configuration saved' });
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader title="Student app configuration" description="Settings the Campus Rush app reads from the server. Changes apply without a new app release."
        actions={canEdit ? <Button onClick={save} loading={busy} disabled={!dirty}>Save changes</Button> : null} />
      {!canEdit ? <Banner tone="info" className="mb-5">Only super admins can change these settings. You can view them.</Banner> : null}
      {saveError ? <Banner tone="danger" className="mb-5">{saveError}</Banner> : null}
      <Banner tone="info" className="mb-5"><span className="inline-flex gap-1.5"><FiInfo className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Only the switches below are remotely configurable — they’re validated on the server and the app only understands these specific settings. New screens or behaviour still need an app update.</span></Banner>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={form.maintenance.enabled ? 'ring-2 ring-warning/50' : ''}>
          <CardHeader title="Maintenance mode" subtitle="Blocks all new orders on the server and shows a notice in the app" />
          <div className="px-5 pb-5 space-y-4">
            <Toggle disabled={!canEdit} checked={form.maintenance.enabled} onChange={setPart('maintenance', 'enabled')} label={form.maintenance.enabled ? 'Maintenance mode is ON' : 'Off'} description="Students can still browse menus and track existing orders." />
            <TextArea disabled={!canEdit} label="Message shown to students" value={form.maintenance.message} onChange={setPart('maintenance', 'message')} maxLength={200} rows={2} placeholder="We’re updating Campus Rush. Ordering will be back by 2 PM." />
          </div>
        </Card>
        <Card>
          <CardHeader title="Home screen" subtitle="Sections of the app home screen" />
          <div className="px-5 pb-5 space-y-4">
            <Toggle disabled={!canEdit} checked={form.studentApp.showPopularItems} onChange={setPart('studentApp', 'showPopularItems')} label="Show “Popular right now”" description="Best-selling dishes across canteens." />
            <Toggle disabled={!canEdit} checked={form.studentApp.enableFavorites} onChange={setPart('studentApp', 'enableFavorites')} label="Allow favorites" description="Hides the heart buttons; the server also refuses new favorites while off." />
          </div>
        </Card>
        <Card>
          <CardHeader title="Featured canteens" subtitle="Shown first on the home screen (up to 6, active canteens only)" />
          <div className="px-5 pb-5">
            <ul className="rounded-xl border border-line divide-y divide-divider">
              {(canteens || []).map((c) => (
                <li key={c._id}>
                  <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-sunken/60">
                    <Checkbox label={c.name} disabled={!canEdit || (!featured.includes(c._id) && featured.length >= 6)} checked={featured.includes(c._id)} onChange={(on) => setPart('studentApp', 'featuredCanteens')(on ? [...featured, c._id] : featured.filter((x) => x !== c._id))} />
                    <span className="flex-1 text-ink">{c.name}</span>
                    {featured.includes(c._id) ? <span className="text-[12px] text-muted">#{featured.indexOf(c._id) + 1}</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card>
          <CardHeader title="Support contact" subtitle="Shown on the app’s Help screen" />
          <div className="px-5 pb-5 space-y-4">
            <TextInput disabled={!canEdit} label="Support email" optional type="email" value={form.support.email} onChange={setPart('support', 'email')} maxLength={120} />
            <TextInput disabled={!canEdit} label="Support phone" optional value={form.support.phone} onChange={setPart('support', 'phone')} maxLength={20} />
            <TextInput disabled={!canEdit} label="Support hours" optional value={form.support.hours} onChange={setPart('support', 'hours')} maxLength={80} placeholder="Mon–Fri, 9 AM – 5 PM" />
          </div>
        </Card>
      </div>
      <p className="text-[12.5px] text-muted mt-5 flex items-center gap-1.5"><FiSmartphone className="h-4 w-4" aria-hidden />Last changed {data?.updatedAt ? formatDateTime(data.updatedAt) : 'never'}.</p>
    </div>
  );
}
