import { useMemo, useState } from 'react';
import { FiCheckCircle, FiInfo, FiSlash, FiToggleRight } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Card, CardHeader, PageHeader, Thumb } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Toggle } from '../components/ui/Form';
import { ConfirmDialog } from '../components/ui/Overlay';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';
import { money, relativeTime } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import { useToast } from '../components/ui/useToast';

function ItemRow({ item, busy, onToggle }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Thumb src={item.image} name={item.name} className="h-11 w-11" dimmed={!item.available} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink truncate">{item.name}</p>
        <p className="text-[12.5px] text-muted">{money(item.price)}{item.category ? ` · ${item.category}` : ''}{item.updatedAt ? ` · changed ${relativeTime(item.updatedAt)}` : ''}</p>
      </div>
      <Toggle size="sm" checked={item.available} disabled={busy} onChange={(v) => onToggle(item, v)} label={item.available ? 'Available' : 'Sold out'} />
    </li>
  );
}

export default function Availability() {
  useDocumentTitle('Availability');
  const { canteen } = useSession();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.menu(canteen._id), [canteen._id]);
  useRealtime('menu.updated', () => reload({ silent: true }), { debounceMs: 400 });
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState({});
  const [confirmAll, setConfirmAll] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const items = useMemo(() => data?.data || [], [data]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => items.filter((i) => !q || i.name.toLowerCase().includes(q)), [items, q]);
  const out = filtered.filter((i) => !i.available);
  const on = filtered.filter((i) => i.available);

  const toggle = async (item, available) => {
    setBusy((b) => ({ ...b, [item._id]: true }));
    try {
      const updated = await api.updateItem(canteen._id, item._id, { available });
      setData((d) => ({ ...d, data: d.data.map((i) => (i._id === item._id ? updated : i)) }));
      toast.success(available ? `${item.name} is back on sale` : `${item.name} marked sold out`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy((b) => ({ ...b, [item._id]: false }));
    }
  };

  const setAll = async () => {
    const available = confirmAll === 'on';
    const ids = items.filter((i) => i.available !== available).map((i) => i._id);
    setBulkBusy(true);
    try {
      await api.bulkAvailability(canteen._id, ids, available);
      await reload({ silent: true });
      toast.success(`${ids.length} item${ids.length === 1 ? '' : 's'} marked ${available ? 'available' : 'sold out'}`);
      setConfirmAll(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader
        title="Availability"
        description="Mark dishes sold out the moment they run out, and back on when they're ready again."
        actions={items.length ? (
          <>
            <Button variant="secondary" onClick={() => setConfirmAll('off')} disabled={!items.some((i) => i.available)}>Mark all sold out</Button>
            <Button variant="secondary" onClick={() => setConfirmAll('on')} disabled={!items.some((i) => !i.available)}>Mark all available</Button>
          </>
        ) : null}
      />
      <Banner tone="info" className="mb-6" title="Availability, not stock counts">
        Campus Rush doesn’t track ingredient or portion quantities. An item is either available or sold out — sold-out items stay visible to students but can’t be ordered, and the server rejects orders for them even from an out-of-date app.
      </Banner>

      {loading && !data ? <Card className="p-4"><SkeletonRows rows={6} /></Card> : error ? <ErrorState message={error} onRetry={reload} /> : !items.length ? (
        <Card><EmptyState icon={FiToggleRight} title="No menu items yet" message="Add items to your menu to manage their availability." action={<Button to="/menu/new">Add menu item</Button>} /></Card>
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Find an item" className="mb-4 sm:w-80" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><FiSlash className="h-4 w-4 text-red-600" aria-hidden />Sold out ({out.length})</span>} subtitle="Students can't order these" />
              {out.length ? <ul className="divide-y divide-divider border-t border-divider">{out.map((i) => <ItemRow key={i._id} item={i} busy={busy[i._id]} onToggle={toggle} />)}</ul>
                : <p className="px-5 pb-5 text-muted flex items-center gap-2"><FiCheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />Nothing is sold out{q ? ' in this search' : ''}.</p>}
            </Card>
            <Card>
              <CardHeader title={<span className="flex items-center gap-2"><FiCheckCircle className="h-4 w-4 text-emerald-600" aria-hidden />Available ({on.length})</span>} subtitle="Open for ordering" />
              {on.length ? <ul className="divide-y divide-divider border-t border-divider">{on.map((i) => <ItemRow key={i._id} item={i} busy={busy[i._id]} onToggle={toggle} />)}</ul>
                : <p className="px-5 pb-5 text-muted flex items-center gap-2"><FiInfo className="h-4 w-4" aria-hidden />No available items{q ? ' in this search' : ''}.</p>}
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirmAll}
        onClose={() => setConfirmAll(null)}
        onConfirm={setAll}
        loading={bulkBusy}
        tone={confirmAll === 'off' ? 'danger' : 'primary'}
        title={confirmAll === 'off' ? 'Mark every item sold out?' : 'Mark every item available?'}
        confirmLabel={confirmAll === 'off' ? 'Mark all sold out' : 'Mark all available'}
        message={confirmAll === 'off' ? 'Students won’t be able to order anything until you turn items back on. To stop all orders temporarily, you can also pause ordering from the top bar.' : 'Every item on your menu becomes orderable in the student app.'}
      />
    </div>
  );
}
