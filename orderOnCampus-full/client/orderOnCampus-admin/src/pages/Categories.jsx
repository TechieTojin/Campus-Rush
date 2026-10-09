import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiArrowDown, FiArrowUp, FiCheck, FiEdit2, FiLayers, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import Button, { IconButton } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Select, TextInput } from '../components/ui/Form';
import { Dialog } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';

// Categories are per canteen (each canteen organises its own menu). Changes apply to the canteen
// website and the student app's menu sections immediately; removing a category never deletes items.
export default function Categories() {
  useDocumentTitle('Categories');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data: canteens } = useAsync(() => api.canteens({}).then((r) => r.data), []);
  const cid = params.get('canteen') || canteens?.[0]?._id || '';
  const { data, error, loading, reload, setData } = useAsync(() => (cid ? api.categories(cid) : Promise.resolve(null)), [cid]);
  useRealtime('menu.updated', useCallback((e) => { if (e.type === 'resync' || e.canteenId === cid) reload({ silent: true }); }, [cid, reload]));
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [removing, setRemoving] = useState(null);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const list = data?.categories || [];
  const canteenName = canteens?.find((c) => c._id === cid)?.name;

  const run = async (fn, message) => {
    setBusy(true);
    try {
      setData(await fn());
      if (message) toast.success(message);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const add = async (e) => {
    e.preventDefault();
    const v = name.trim();
    if (v.length < 2 || v.length > 40) { setNameError('Use 2–40 characters'); return; }
    if (list.some((c) => c.name.toLowerCase() === v.toLowerCase())) { setNameError('That category already exists'); return; }
    if (await run(() => api.createCategory(cid, v), `“${v}” added to ${canteenName}`)) setName('');
  };
  const move = (i, dir) => {
    const order = list.map((c) => c.name);
    const [x] = order.splice(i, 1);
    order.splice(i + dir, 0, x);
    run(() => api.reorderCategories(cid, order));
  };

  return (
    <div className="animate-rise-in max-w-4xl">
      <PageHeader title="Categories" description="Each canteen organises its menu into its own categories, shown to students in this order." />
      <Card className="p-4 mb-4">
        <Select label="Canteen" value={cid} onChange={(e) => setParams({ canteen: e.target.value }, { replace: true })}>
          {(canteens || []).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
      </Card>
      {cid ? (
        <>
          <Card className="p-5 mb-4">
            <form onSubmit={add} noValidate className="flex flex-col sm:flex-row gap-3 sm:items-start">
              <TextInput label={`New category for ${canteenName || 'this canteen'}`} placeholder="e.g. Breakfast, Beverages" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} error={nameError} maxLength={40} className="flex-1" />
              <Button type="submit" icon={FiPlus} loading={busy} className="sm:mt-[26px]">Add category</Button>
            </form>
          </Card>
          <Card className="overflow-hidden">
            {loading && !data ? <div className="p-4"><SkeletonRows rows={4} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !list.length ? (
              <EmptyState icon={FiLayers} title="No categories yet" message="Students see one flat menu for this canteen until categories are added." />
            ) : (
              <ul className="divide-y divide-divider">
                {list.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex flex-col">
                      <IconButton icon={FiArrowUp} size="icon-sm" label={`Move ${c.name} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)} />
                      <IconButton icon={FiArrowDown} size="icon-sm" label={`Move ${c.name} down`} disabled={i === list.length - 1 || busy} onClick={() => move(i, 1)} />
                    </div>
                    {editing === c.name ? (
                      <form className="flex-1 flex items-center gap-2" onSubmit={async (e) => { e.preventDefault(); if (editName.trim() === c.name) { setEditing(null); return; } if (await run(() => api.renameCategory(cid, c.name, editName.trim()), 'Category renamed — its items moved with it')) setEditing(null); }}>
                        <input aria-label={`Rename ${c.name}`} className="input" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} autoFocus onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} />
                        <IconButton icon={FiCheck} label="Save name" variant="primary" type="submit" disabled={busy} />
                        <IconButton icon={FiX} label="Cancel rename" onClick={() => setEditing(null)} />
                      </form>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0"><p className="font-semibold text-ink truncate">{c.name}</p><p className="text-[12.5px] text-muted">{c.itemCount} item{c.itemCount === 1 ? '' : 's'}</p></div>
                        <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => { setEditing(c.name); setEditName(c.name); }}>Rename</Button>
                        <IconButton icon={FiTrash2} label={`Remove ${c.name}`} className="text-danger hover:bg-danger/10" onClick={() => { setRemoving(c); setMoveTo(''); }} />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {data ? <p className="px-5 py-3 border-t border-divider text-[13px] text-muted">{data.uncategorised} item{data.uncategorised === 1 ? '' : 's'} without a category</p> : null}
          </Card>
        </>
      ) : null}
      <Dialog open={!!removing} onClose={() => !busy && setRemoving(null)} size="sm" title={`Remove “${removing?.name}”?`}
        footer={<><Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>Cancel</Button><Button variant="danger" loading={busy} onClick={async () => { if (await run(() => api.removeCategory(cid, removing.name, moveTo), 'Category removed')) setRemoving(null); }}>Remove category</Button></>}>
        {removing?.itemCount ? (
          <div className="space-y-3">
            <p>{removing.itemCount} item{removing.itemCount === 1 ? ' is' : 's are'} in this category. No items are deleted — choose where they go:</p>
            <Select label="Move items to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="">Uncategorised</option>
              {list.filter((c) => c.name !== removing.name).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </Select>
          </div>
        ) : <p>This category is empty. Removing it won’t affect any items.</p>}
      </Dialog>
    </div>
  );
}
