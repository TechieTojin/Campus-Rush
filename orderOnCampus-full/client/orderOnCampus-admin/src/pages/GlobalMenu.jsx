import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiBookOpen, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import MenuItemDialog from '../components/MenuItemDialog';
import Button, { IconButton } from '../components/ui/Button';
import { Badge, Card, PageHeader, TableWrap, Thumb } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Segmented, Select, Toggle } from '../components/ui/Form';
import { ConfirmDialog, Drawer } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { DIETARY } from '../lib/constants';
import { formatDateTime, money, relativeTime } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

function ActivityDrawer({ item, onClose }) {
  const { data, loading } = useAsync(() => (item ? api.itemActivity(item._id) : Promise.resolve(null)), [item?._id]);
  return (
    <Drawer open={!!item} onClose={onClose} title={item ? `${item.name} — history` : ''} subtitle={item?.canteen.name}>
      {loading || !data ? <SkeletonRows rows={5} /> : (
        <div className="space-y-6">
          <section>
            <h3 className="font-bold mb-2">Canteen activity</h3>
            {data.activity.length ? <ul className="space-y-2 text-[13.5px]">{data.activity.map((a) => <li key={a._id}><p className="text-ink">{a.message}</p><p className="text-[12px] text-muted">{a.actor} · {relativeTime(a.createdAt)}</p></li>)}</ul> : <p className="text-muted">No changes recorded.</p>}
          </section>
          <section>
            <h3 className="font-bold mb-2">Admin changes (audit log)</h3>
            {data.audit.length ? <ul className="space-y-2 text-[13.5px]">{data.audit.map((a, i) => <li key={i}><p className="text-ink"><span className="font-mono text-[12.5px]">{a.action}</span> · {a.result}</p><p className="text-[12px] text-muted">{a.actor} · {formatDateTime(a.at)}{a.changes ? ` · ${Object.entries(a.changes).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')}` : ''}</p></li>)}</ul> : <p className="text-muted">No admin changes.</p>}
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default function GlobalMenu() {
  useDocumentTitle('Global menu');
  const toast = useToast();
  const [canteen, setCanteen] = useState('all');
  const [q, setQ] = useState('');
  const [availability, setAvailability] = useState('all');
  const [editing, setEditing] = useState(undefined);
  const [archiving, setArchiving] = useState(null);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState({});
  const { data, error, loading, reload, setData } = useAsync(() => api.menu({ canteen: canteen === 'all' ? undefined : canteen, q: q.trim() || undefined, availability: availability === 'all' ? undefined : availability }), [canteen, q, availability]);
  useRealtime('menu.updated', useCallback(() => reload({ silent: true }), [reload]), { debounceMs: 400 });
  const canteens = data?.canteens || [];

  const toggle = async (item, available) => {
    setBusy((b) => ({ ...b, [item._id]: true }));
    try {
      await api.updateItem(item.canteen._id, item._id, { available });
      setData((d) => ({ ...d, data: d.data.map((i) => (i._id === item._id ? { ...i, available } : i)) }));
      toast.success(`${item.name} is ${available ? 'available' : 'sold out'} at ${item.canteen.name}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy((b) => ({ ...b, [item._id]: false }));
    }
  };
  const archive = async () => {
    setBusy((b) => ({ ...b, archive: true }));
    try {
      await api.archiveItem(archiving.canteen._id, archiving._id);
      toast.success(`${archiving.name} removed from ${archiving.canteen.name}`);
      setArchiving(null);
      reload({ silent: true });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy((b) => ({ ...b, archive: false }));
    }
  };
  const editCanteen = editing ? canteens.find((c) => c._id === editing.canteen._id) : null;

  return (
    <div className="animate-rise-in">
      <PageHeader title="Global menu" description="Menu items across all canteens. Edits here change the same records the canteen website and student app use." actions={<Button icon={FiPlus} onClick={() => setEditing(null)}>Add item</Button>} />
      <Card className="p-4 mb-4 flex flex-col xl:flex-row gap-3 xl:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search item names" className="xl:w-80" />
        <Select aria-label="Filter by canteen" value={canteen} onChange={(e) => setCanteen(e.target.value)} className="xl:w-64">
          <option value="all">All canteens</option>
          {canteens.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
        <Segmented label="Filter by availability" value={availability} onChange={setAvailability} options={[{ value: 'all', label: 'All' }, { value: 'available', label: 'Available' }, { value: 'unavailable', label: 'Sold out' }]} />
      </Card>
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={6} className="h-16" /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? (
          <EmptyState icon={FiBookOpen} title="No items match" action={<Button icon={FiPlus} onClick={() => setEditing(null)}>Add item</Button>} />
        ) : (
          <TableWrap minWidth={940} caption="Menu items">
            <thead className="bg-sunken/60 border-b border-line"><tr><th className="th">Item</th><th className="th">Canteen</th><th className="th">Category</th><th className="th text-right">Price</th><th className="th">Available</th><th className="th">Updated</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-divider">
              {data.data.map((i) => (
                <tr key={i._id} className="hover:bg-sunken/40">
                  <td className="td"><div className="flex items-center gap-3"><Thumb src={i.image} name={i.name} className="h-11 w-11" dimmed={!i.available} /><span className="min-w-0"><span className="block font-semibold text-ink truncate max-w-[240px]">{i.name}</span><span className="flex gap-1.5 mt-0.5">{DIETARY[i.dietary] ? <Badge tone={DIETARY[i.dietary].tone}>{DIETARY[i.dietary].label}</Badge> : null}{i.prepTime ? <Badge>{i.prepTime} min</Badge> : null}</span></span></div></td>
                  <td className="td"><Link to={`/canteens/${i.canteen._id}`} className="text-ink hover:text-brand font-medium">{i.canteen.name}</Link></td>
                  <td className="td">{i.category ? <Badge tone="brand">{i.category}</Badge> : <span className="text-faint text-[13px]">—</span>}</td>
                  <td className="td text-right tabular font-bold text-ink">{money(i.price)}</td>
                  <td className="td"><Toggle size="sm" checked={i.available} disabled={busy[i._id]} onChange={(v) => toggle(i, v)} label={i.available ? 'Available' : 'Sold out'} /></td>
                  <td className="td text-muted whitespace-nowrap text-[13px]">{i.updatedAt ? relativeTime(i.updatedAt) : '—'}</td>
                  <td className="td"><div className="flex justify-end gap-1">
                    <IconButton icon={FiActivity} label={`History of ${i.name}`} onClick={() => setHistory(i)} />
                    <Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => setEditing(i)}>Edit</Button>
                    <IconButton icon={FiTrash2} label={`Remove ${i.name}`} className="text-danger hover:bg-danger/10" onClick={() => setArchiving(i)} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <MenuItemDialog open={editing !== undefined} onClose={() => setEditing(undefined)} item={editing || null} canteen={editCanteen ? { _id: editCanteen._id, name: editCanteen.name, categories: editCanteen.categories } : null} canteens={canteens} onSaved={() => reload({ silent: true })} />
      <ConfirmDialog open={!!archiving} onClose={() => setArchiving(null)} onConfirm={archive} loading={busy.archive} title={`Remove “${archiving?.name}” from ${archiving?.canteen.name}?`} confirmLabel="Remove item"
        message="Students can no longer see or order it. Past orders keep their record and price. To hide it temporarily, mark it sold out instead." />
      <ActivityDrawer item={history} onClose={() => setHistory(null)} />
    </div>
  );
}
