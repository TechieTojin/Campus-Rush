import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBookOpen, FiClock, FiEdit2, FiLayers, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button, { IconButton } from '../components/ui/Button';
import { Badge, Card, PageHeader, Thumb } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Checkbox, SearchInput, Segmented, Select, Toggle } from '../components/ui/Form';
import { ConfirmDialog } from '../components/ui/Overlay';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';
import { money } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import { useToast } from '../components/ui/useToast';
import { DIETARY } from '../lib/constants';

export default function Menu() {
  useDocumentTitle('Menu');
  const { canteen, isManager } = useSession();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.menu(canteen._id), [canteen._id]);
  // Admins can change this menu too; refresh when it changes elsewhere.
  useRealtime('menu.updated', () => reload({ silent: true }), { debounceMs: 400 });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const items = useMemo(() => data?.data || [], [data]);
  const categories = data?.categories || [];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) =>
      (!q || i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)) &&
      (category === 'all' || (category === '' ? !i.category : i.category === category)) &&
      (availability === 'all' || (availability === 'available' ? i.available : !i.available)));
  }, [items, query, category, availability]);

  const patchItem = (id, patch) => setData((d) => ({ ...d, data: d.data.map((i) => (i._id === id ? { ...i, ...patch } : i)) }));

  const toggle = async (item, available) => {
    setBusy((b) => ({ ...b, [item._id]: true }));
    patchItem(item._id, { available });
    try {
      await api.updateItem(canteen._id, item._id, { available });
      toast.success(`${item.name} is now ${available ? 'available' : 'unavailable'} in the student app`);
    } catch (e) {
      patchItem(item._id, { available: !available });
      toast.error(errorMessage(e), { title: 'Availability not changed' });
    } finally {
      setBusy((b) => ({ ...b, [item._id]: false }));
    }
  };

  const bulk = async (available) => {
    const ids = [...selected];
    setBulkBusy(true);
    try {
      await api.bulkAvailability(canteen._id, ids, available);
      setData((d) => ({ ...d, data: d.data.map((i) => (selected.has(i._id) ? { ...i, available } : i)) }));
      toast.success(`${ids.length} item${ids.length === 1 ? '' : 's'} marked ${available ? 'available' : 'unavailable'}`);
      setSelected(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBulkBusy(false);
    }
  };

  const archive = async () => {
    setArchiveBusy(true);
    try {
      await api.archiveItem(canteen._id, archiving._id);
      setData((d) => ({ ...d, data: d.data.filter((i) => i._id !== archiving._id) }));
      setSelected((s) => { const n = new Set(s); n.delete(archiving._id); return n; });
      toast.success(`${archiving.name} removed from the menu`);
      setArchiving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setArchiveBusy(false);
    }
  };

  const allShownSelected = shown.length > 0 && shown.every((i) => selected.has(i._id));
  const toggleAll = (on) => setSelected((s) => { const n = new Set(s); shown.forEach((i) => (on ? n.add(i._id) : n.delete(i._id))); return n; });
  const toggleOne = (id, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  const availableCount = items.filter((i) => i.available).length;

  return (
    <div className="animate-rise-in">
      <PageHeader
        title="Menu"
        description="Everything students can see in the app. Changes are live as soon as they're saved."
        actions={
          <>
            {isManager ? <Button variant="secondary" icon={FiLayers} to="/categories">Categories</Button> : null}
            {isManager ? <Button icon={FiPlus} to="/menu/new">Add menu item</Button> : null}
          </>
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Search menu items" className="lg:w-80" />
          <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className="lg:w-56">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="">Uncategorised</option>
          </Select>
          <Segmented
            label="Filter by availability"
            value={availability}
            onChange={setAvailability}
            options={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'available', label: 'Available', count: availableCount },
              { value: 'unavailable', label: 'Unavailable', count: items.length - availableCount },
            ]}
          />
        </div>
      </Card>

      {selected.size ? (
        <div className="sticky top-[72px] z-10 mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-ink text-white px-4 py-3 shadow-raised animate-rise-in" role="region" aria-label="Bulk actions">
          <span className="font-semibold">{selected.size} selected</span>
          <span className="flex-1" />
          <Button size="sm" variant="secondary" onClick={() => bulk(true)} loading={bulkBusy}>Mark available</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk(false)} disabled={bulkBusy}>Mark unavailable</Button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-[13px] font-semibold text-white/70 hover:text-white">Clear</button>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={6} className="h-16" /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !items.length ? (
          <EmptyState icon={FiBookOpen} title="Your menu is empty" message="Add your first dish — it appears in the student app right away." action={<Button icon={FiPlus} to="/menu/new">Add menu item</Button>} />
        ) : !shown.length ? (
          <EmptyState icon={FiBookOpen} title="No items match" message="Try a different search or filter." action={<Button variant="secondary" onClick={() => { setQuery(''); setCategory('all'); setAvailability('all'); }}>Clear filters</Button>} />
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-[14px] min-w-[720px]">
              <caption className="sr-only">Menu items</caption>
              <thead className="bg-canvas border-b border-line">
                <tr className="text-left text-[12px] uppercase tracking-wide text-muted">
                  <th scope="col" className="pl-5 pr-2 py-3 w-10"><Checkbox label="Select all shown items" checked={allShownSelected} indeterminate={!allShownSelected && shown.some((i) => selected.has(i._id))} onChange={toggleAll} /></th>
                  <th scope="col" className="font-semibold px-3 py-3">Item</th>
                  <th scope="col" className="font-semibold px-3 py-3">Category</th>
                  <th scope="col" className="font-semibold px-3 py-3 text-right">Price</th>
                  <th scope="col" className="font-semibold px-3 py-3">Available</th>
                  <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {shown.map((i) => (
                  <tr key={i._id} className={`hover:bg-canvas/70 ${selected.has(i._id) ? 'bg-brand-50/50' : ''}`}>
                    <td className="pl-5 pr-2 py-3"><Checkbox label={`Select ${i.name}`} checked={selected.has(i._id)} onChange={(on) => toggleOne(i._id, on)} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Thumb src={i.image} name={i.name} className="h-12 w-12" dimmed={!i.available} />
                        <div className="min-w-0">
                          <Link to={`/menu/${i._id}/edit`} className="font-semibold text-ink hover:text-brand-700 block truncate max-w-[320px]">{i.name}</Link>
                          <p className="text-[12.5px] text-muted truncate max-w-[320px]">{i.description || <span className="italic text-faint">No description</span>}</p>
                          <div className="flex gap-1.5 mt-1">
                            {DIETARY[i.dietary] ? <Badge tone={DIETARY[i.dietary].tone}>{DIETARY[i.dietary].label}</Badge> : null}
                            {i.prepTime ? <Badge icon={FiClock}>{i.prepTime} min</Badge> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{i.category ? <Badge tone="brand">{i.category}</Badge> : <span className="text-faint text-[13px]">Uncategorised</span>}</td>
                    <td className="px-3 py-3 text-right font-bold tabular text-ink">{money(i.price)}</td>
                    <td className="px-3 py-3">
                      <Toggle size="sm" checked={i.available} disabled={busy[i._id]} onChange={(v) => toggle(i, v)} label={i.available ? 'Available' : 'Sold out'} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {isManager ? <Button size="sm" variant="secondary" icon={FiEdit2} to={`/menu/${i._id}/edit`}>Edit</Button> : null}
                        {isManager ? <IconButton icon={FiTrash2} label={`Remove ${i.name} from menu`} className="text-red-600 hover:bg-red-50" onClick={() => setArchiving(i)} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {items.length ? <p className="text-[12.5px] text-muted mt-3">Showing {shown.length} of {items.length} items. Removing an item takes it off the student app; past orders keep their record.</p> : null}

      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={archive}
        loading={archiveBusy}
        title={`Remove "${archiving?.name}" from the menu?`}
        confirmLabel="Remove item"
        message="Students will no longer see or be able to order it. Past orders that include it are kept unchanged. To hide it temporarily, mark it unavailable instead."
      >
        {archiving?.available ? <Banner tone="info" className="mt-3">Tip: “Unavailable” keeps the item on the menu as sold out.</Banner> : null}
      </ConfirmDialog>
    </div>
  );
}
