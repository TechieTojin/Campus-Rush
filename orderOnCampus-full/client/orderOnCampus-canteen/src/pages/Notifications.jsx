import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiRadio, FiAlertCircle, FiBell, FiBookOpen, FiCheck, FiCheckCircle, FiCreditCard, FiEdit3, FiLayers, FiPackage, FiRefreshCw, FiToggleRight, FiTrash2 } from 'react-icons/fi';

import { OrderDrawer } from '../components/orders';
import Button from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Display';
import { Banner, EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Segmented } from '../components/ui/Form';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle, usePolling } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';
import { formatDateTime, relativeTime } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import { useToast } from '../components/ui/useToast';
import { useShell } from '../components/layout/useShell';

const ICONS = {
  order_placed: { icon: FiPackage, color: 'bg-saffron-100 text-saffron-700' },
  order_status: { icon: FiCheckCircle, color: 'bg-sky-50 text-sky-700' },
  payment_recorded: { icon: FiCreditCard, color: 'bg-emerald-50 text-emerald-700' },
  item_created: { icon: FiBookOpen, color: 'bg-brand-50 text-brand-700' },
  item_updated: { icon: FiEdit3, color: 'bg-brand-50 text-brand-700' },
  item_archived: { icon: FiTrash2, color: 'bg-red-50 text-red-700' },
  availability: { icon: FiToggleRight, color: 'bg-violet-50 text-violet-700' },
  canteen_updated: { icon: FiEdit3, color: 'bg-sunken text-body' },
  category: { icon: FiLayers, color: 'bg-sunken text-body' },
};

// Announcements from Campus Rush admins (in-app only), with per-staff read state.
function AnnouncementsPanel() {
  const { canteen } = useSession();
  const { refreshCounts } = useShell();
  const { data, reload } = useAsync(() => api.announcements(canteen._id), [canteen._id]);
  useRealtime('announcement.updated', () => reload({ silent: true }));
  if (!data?.length) return null;
  const markRead = async (id) => {
    try { await api.markAnnouncementRead(canteen._id, id); } catch { /* best effort */ }
    reload({ silent: true });
    refreshCounts();
  };
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-center gap-2"><FiRadio className="h-4 w-4 text-brand-600" aria-hidden /><h2 className="font-bold">From Campus Rush</h2></div>
      <ul className="divide-y divide-divider">
        {data.map((a) => (
          <li key={a._id} className={`px-5 py-3.5 flex items-start gap-3 ${a.read ? '' : 'bg-brand-50/40'}`}>
            <div className="flex-1 min-w-0">
              <p className={`${a.read ? 'text-body' : 'font-semibold text-ink'}`}>{a.title}{a.targeted ? <span className="ml-2 text-[11.5px] font-semibold text-brand-700">For your canteen</span> : null}</p>
              <p className="text-[13.5px] text-body whitespace-pre-line mt-0.5">{a.body}</p>
              <p className="text-[12.5px] text-muted mt-1">{relativeTime(a.createdAt)}</p>
            </div>
            {!a.read ? <Button size="sm" variant="secondary" onClick={() => markRead(a._id)}>Mark read</Button> : <span className="text-[12px] text-faint">Read</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Notifications() {
  useDocumentTitle('Notifications');
  const { canteen } = useSession();
  const { refreshCounts } = useShell();
  const toast = useToast();
  const [type, setType] = useState('all');
  const [marking, setMarking] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);
  const { data, error, loading, reload } = useAsync(() => api.activity(canteen._id, { limit: 80, type: type === 'all' ? undefined : type }), [canteen._id, type]);
  usePolling(() => reload({ silent: true }), 60000);
  useRealtime(['order.created', 'order.updated', 'menu.updated', 'canteen.updated'], () => reload({ silent: true }), { debounceMs: 500 });

  const markRead = async () => {
    setMarking(true);
    try {
      await api.markActivitySeen(canteen._id);
      await reload({ silent: true });
      refreshCounts();
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="animate-rise-in max-w-4xl">
      <PageHeader
        title="Notifications"
        description="New orders, status changes and menu updates for your canteen."
        actions={
          <>
            <Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()} loading={loading && !!data}>Refresh</Button>
            <Button variant="secondary" icon={FiCheck} onClick={markRead} loading={marking} disabled={!data?.unread}>Mark all as read</Button>
          </>
        }
      />
      <AnnouncementsPanel />
      {data?.waiting ? (
        <Banner tone="warning" className="mb-4" title={`${data.waiting} order${data.waiting === 1 ? ' is' : 's are'} waiting to be accepted`} action={<Button size="sm" to="/live">Open live board</Button>}>
          Students are waiting for you to start preparing.
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Segmented label="Filter notifications" value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'orders', label: 'Orders' }, { value: 'menu', label: 'Menu & canteen' }]} />
        <p className="text-[12.5px] text-muted flex items-center gap-1.5"><FiAlertCircle className="h-3.5 w-3.5" aria-hidden />In-app only · checks every 15–20 seconds while open</p>
      </div>
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={6} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? (
          <EmptyState icon={FiBell} title="Nothing here yet" message="Activity appears as orders come in and your menu changes." />
        ) : (
          <ul className="divide-y divide-divider">
            {data.data.map((a) => {
              const meta = ICONS[a.type] || ICONS.canteen_updated;
              const body = (
                <>
                  <span className={`h-10 w-10 rounded-xl shrink-0 flex items-center justify-center ${meta.color}`}><meta.icon className="h-[18px] w-[18px]" aria-hidden /></span>
                  <span className="flex-1 min-w-0">
                    <span className={`block ${a.unread ? 'font-semibold text-ink' : 'text-body'}`}>{a.message}</span>
                    <span className="block text-[12.5px] text-muted" title={formatDateTime(a.createdAt)}>{relativeTime(a.createdAt)}{a.actor === 'student' ? ' · from student app' : ''}</span>
                  </span>
                  {a.unread ? <span className="h-2.5 w-2.5 rounded-full bg-brand-600 shrink-0 mt-2" aria-label="Unread" /> : null}
                </>
              );
              return (
                <li key={a._id} className={a.unread ? 'bg-brand-50/40' : ''}>
                  {a.order ? (
                    <button type="button" onClick={() => setOpenOrder(a.order)} className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-canvas">{body}</button>
                  ) : a.item && a.type !== 'item_archived' ? (
                    <Link to={`/menu/${a.item}/edit`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-canvas">{body}</Link>
                  ) : (
                    <div className="flex items-start gap-3 px-5 py-3.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <OrderDrawer orderId={openOrder} onClose={() => setOpenOrder(null)} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
