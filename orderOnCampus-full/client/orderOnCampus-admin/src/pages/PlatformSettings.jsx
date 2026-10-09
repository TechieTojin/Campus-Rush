import { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import { Card, CardHeader, PageHeader } from '../components/ui/Display';
import { Banner, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { TextInput, Toggle } from '../components/ui/Form';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useAsync, useDocumentTitle, useUnsavedWarning } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';

const pick = (s) => ({
  platformName: s.platformName || '',
  ordering: { maxItemsPerOrder: String(s.ordering?.maxItemsPerOrder ?? 20), maxQuantityPerItem: String(s.ordering?.maxQuantityPerItem ?? 10) },
  onboarding: { staffSignupEnabled: !!s.onboarding?.staffSignupEnabled, requireCanteenApproval: !!s.onboarding?.requireCanteenApproval },
});

export default function PlatformSettings() {
  useDocumentTitle('Platform settings');
  const toast = useToast();
  const { admin } = useSession();
  const canEdit = !!admin?.permissions?.platformSettings;
  const { data, error, loading, reload, setData } = useAsync(() => api.settings(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => { if (data) setForm(pick(data)); }, [data]);
  const dirty = form && data && JSON.stringify(form) !== JSON.stringify(pick(data));
  useUnsavedWarning(dirty);

  if (loading && !data) return <Card className="p-6"><SkeletonRows rows={5} /></Card>;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!form) return null;
  const setPart = (part, key) => (v) => setForm((f) => ({ ...f, [part]: { ...f[part], [key]: v && v.target ? v.target.value : v } }));

  const save = async () => {
    setBusy(true);
    setSaveError('');
    try {
      const updated = await api.updateSettings({
        platformName: form.platformName,
        ordering: { maxItemsPerOrder: Number(form.ordering.maxItemsPerOrder), maxQuantityPerItem: Number(form.ordering.maxQuantityPerItem) },
        onboarding: form.onboarding,
      });
      setData(updated);
      toast.success('Settings saved and enforced immediately.');
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise-in max-w-4xl">
      <PageHeader title="Platform settings" description="Rules the Campus Rush server enforces for every canteen and student." actions={canEdit ? <Button onClick={save} loading={busy} disabled={!dirty}>Save changes</Button> : null} />
      {!canEdit ? <Banner tone="info" className="mb-5">Only super admins can change platform settings. You can view them.</Banner> : null}
      {saveError ? <Banner tone="danger" className="mb-5">{saveError}</Banner> : null}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Platform" />
          <div className="px-5 pb-5"><TextInput disabled={!canEdit} label="Platform name" value={form.platformName} onChange={(e) => setForm({ ...form, platformName: e.target.value })} maxLength={40} hint="Returned by the app configuration API." /></div>
        </Card>
        <Card>
          <CardHeader title="Ordering policy" subtitle="Checked by the server on every order" />
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput disabled={!canEdit} label="Maximum items per order" type="number" min="1" max="100" value={form.ordering.maxItemsPerOrder} onChange={setPart('ordering', 'maxItemsPerOrder')} hint="1–100 units in total" />
            <TextInput disabled={!canEdit} label="Maximum of the same item" type="number" min="1" max="50" value={form.ordering.maxQuantityPerItem} onChange={setPart('ordering', 'maxQuantityPerItem')} hint="1–50 units per dish" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Canteen onboarding" />
          <div className="px-5 pb-5 space-y-5">
            <Toggle disabled={!canEdit} checked={form.onboarding.staffSignupEnabled} onChange={setPart('onboarding', 'staffSignupEnabled')} label="Allow canteen self sign-up" description="When off, only admins can create staff accounts (from the Staff page). In production, self sign-up also requires the STAFF_SIGNUP_CODE invite code." />
            <Toggle disabled={!canEdit} checked={form.onboarding.requireCanteenApproval} onChange={setPart('onboarding', 'requireCanteenApproval')} label="New canteens need admin approval" description="Self-registered canteens stay hidden from students as “Pending approval” until approved on the Canteens page." />
          </div>
        </Card>
        <p className="text-[12.5px] text-muted">Last changed {data.updatedAt ? formatDateTime(data.updatedAt) : 'never'}. Maintenance mode and student app options are on the Student app config page; your theme is on your Profile.</p>
      </div>
    </div>
  );
}
