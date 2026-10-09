import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowDown, FiArrowUp, FiCheck, FiEdit2, FiLayers, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import Button, { IconButton } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Select, TextInput } from '../components/ui/Form';
import { Dialog } from '../components/ui/Overlay';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useSession } from '../lib/sessionContext';
import ManagerOnly from '../components/ManagerOnly';
import { useToast } from '../components/ui/useToast';

const validName = (n, list, except) => {
  const v = n.trim();
  if (v.length < 2 || v.length > 40) return 'Use 2–40 characters';
  if (list.some((c) => c.name.toLowerCase() === v.toLowerCase() && c.name !== except)) return 'A category with this name already exists';
  return '';
};

export default function Categories() {
  useDocumentTitle('Categories');
  const { canteen, isManager } = useSession();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.categories(canteen._id), [canteen._id]);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [moveTo, setMoveTo] = useState('');

  const list = data?.categories || [];
  if (!isManager) return <ManagerOnly what="menu categories" />;

  const add = async (e) => {
    e.preventDefault();
    const err = validName(name, list);
    setNameError(err);
    if (err || adding) return;
    setAdding(true);
    try {
      setData(await api.createCategory(canteen._id, name.trim()));
      toast.success(`Category "${name.trim()}" created`);
      setName('');
    } catch (e2) {
      setNameError(errorMessage(e2));
    } finally {
      setAdding(false);
    }
  };

  const rename = async (from) => {
    const err = validName(editName, list, from);
    if (err) { toast.error(err); return; }
    if (editName.trim() === from) { setEditing(null); return; }
    setBusy(true);
    try {
      setData(await api.renameCategory(canteen._id, from, editName.trim()));
      toast.success(`Renamed to "${editName.trim()}" — items moved with it`);
      setEditing(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const move = async (index, dir) => {
    const order = list.map((c) => c.name);
    const [x] = order.splice(index, 1);
    order.splice(index + dir, 0, x);
    setBusy(true);
    try {
      setData(await api.reorderCategories(canteen._id, order));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      setData(await api.removeCategory(canteen._id, removing.name, moveTo));
      toast.success(`Category "${removing.name}" removed`);
      setRemoving(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-rise-in max-w-4xl">
      <PageHeader title="Categories" description="Sections of your menu, shown to students in this order. Assign items to a category from the item's edit page." />

      <Card className="p-5 mb-6">
        <form onSubmit={add} noValidate className="flex flex-col sm:flex-row gap-3 sm:items-start">
          <TextInput label="New category" placeholder="e.g. Breakfast, Beverages, Snacks" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} error={nameError} maxLength={40} className="flex-1" />
          <Button type="submit" icon={FiPlus} loading={adding} className="sm:mt-[26px]">Add category</Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={4} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !list.length ? (
          <EmptyState icon={FiLayers} title="No categories yet" message="Students currently see one flat menu. Add categories to group items into sections." />
        ) : (
          <ul className="divide-y divide-divider">
            {list.map((c, i) => (
              <li key={c.name} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex flex-col">
                  <IconButton icon={FiArrowUp} size="icon-sm" label={`Move ${c.name} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)} />
                  <IconButton icon={FiArrowDown} size="icon-sm" label={`Move ${c.name} down`} disabled={i === list.length - 1 || busy} onClick={() => move(i, 1)} />
                </div>
                {editing === c.name ? (
                  <form className="flex-1 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); rename(c.name); }}>
                    <input aria-label={`Rename ${c.name}`} className="input" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={40} autoFocus onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} />
                    <IconButton icon={FiCheck} label="Save name" variant="primary" type="submit" disabled={busy} />
                    <IconButton icon={FiX} label="Cancel rename" onClick={() => setEditing(null)} />
                  </form>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink truncate">{c.name}</p>
                      <p className="text-[12.5px] text-muted">{c.itemCount} item{c.itemCount === 1 ? '' : 's'}</p>
                    </div>
                    <Button size="sm" variant="ghost" icon={FiEdit2} onClick={() => { setEditing(c.name); setEditName(c.name); }}>Rename</Button>
                    <IconButton icon={FiTrash2} label={`Remove ${c.name}`} className="text-red-600 hover:bg-red-50" onClick={() => { setRemoving(c); setMoveTo(''); }} />
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {data ? (
          <div className="px-5 py-3 border-t border-divider bg-canvas/60 text-[13px] text-muted flex justify-between">
            <span>{data.uncategorised} item{data.uncategorised === 1 ? '' : 's'} without a category</span>
            <Link to="/menu" className="font-semibold text-brand-700 hover:underline">Go to menu</Link>
          </div>
        ) : null}
      </Card>

      <Dialog
        open={!!removing}
        onClose={() => !busy && setRemoving(null)}
        title={`Remove "${removing?.name}"?`}
        size="sm"
        footer={<><Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>Cancel</Button><Button variant="danger" onClick={remove} loading={busy}>Remove category</Button></>}
      >
        {removing?.itemCount ? (
          <div className="space-y-3">
            <p>{removing.itemCount} item{removing.itemCount === 1 ? ' is' : 's are'} in this category. No items are deleted — choose where they go:</p>
            <Select label="Move items to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="">Uncategorised</option>
              {list.filter((c) => c.name !== removing.name).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </Select>
          </div>
        ) : <p>This category is empty. Removing it won’t affect any menu items.</p>}
      </Dialog>
    </div>
  );
}
