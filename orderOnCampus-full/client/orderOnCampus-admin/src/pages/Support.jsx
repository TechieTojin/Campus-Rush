import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiLifeBuoy, FiLock, FiMessageSquare } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Badge, Card, KeyValue, PageHeader, TableWrap, Tabs } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Segmented, Select, TextArea } from '../components/ui/Form';
import { Drawer } from '../components/ui/Overlay';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { TICKET_STATUS } from '../lib/constants';
import { formatDateTime, money, orderRef, relativeTime } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';
import { useSession } from '../lib/sessionContext';

function TicketDrawer({ id, admins, onClose, onChanged }) {
  const toast = useToast();
  const { data: t, error, loading, reload } = useAsync(() => (id ? api.ticket(id) : Promise.resolve(null)), [id]);
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState('reply');
  const [busy, setBusy] = useState(false);
  useRealtime('support.updated', useCallback((e) => { if (e.type === 'resync' || e.ticketId === id) reload({ silent: true }); }, [id, reload]));
  const update = async (body, message) => {
    try { await api.updateTicket(t._id, body); toast.success(message); await reload({ silent: true }); onChanged(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const addNote = async () => {
    if (note.trim().length < 2) return;
    setBusy(true);
    try {
      await api.addTicketNote(t._id, note.trim(), visibility);
      toast.success(visibility === 'reply' ? 'Reply sent — the requester sees it in their app or website.' : 'Internal note added');
      setNote('');
      await reload({ silent: true });
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer open={!!id} onClose={onClose} title={t ? `${t.ref} · ${t.subject}` : 'Support request'} subtitle={t ? `${t.source === 'student' ? 'Student' : 'Canteen'} · ${t.requester.name}` : ''} width="max-w-2xl">
      {loading && !t ? <SkeletonRows rows={6} /> : error && !t ? <ErrorState message={error} onRetry={reload} /> : t ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Status" value={t.status} onChange={(e) => update({ status: e.target.value }, 'Status updated')}>{Object.entries(TICKET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
            <Select label="Priority" value={t.priority} onChange={(e) => update({ priority: e.target.value }, 'Priority updated')}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></Select>
            <Select label="Assigned to" value={t.assignedTo?._id || ''} onChange={(e) => update({ assignedTo: e.target.value || null }, 'Assignment updated')}>
              <option value="">Unassigned</option>
              {admins.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </Select>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <KeyValue label="Category">{t.category}</KeyValue>
            <KeyValue label="Opened">{formatDateTime(t.createdAt)}</KeyValue>
            {t.canteen ? <KeyValue label="Canteen">{t.canteen.name}</KeyValue> : null}
            {t.order ? <KeyValue label="Order">{orderRef(t.order._id)} · {t.order.status} · {money(t.order.totalPrice)}</KeyValue> : null}
          </dl>
          <div className="rounded-xl bg-sunken/70 p-4"><p className="text-[12px] font-semibold uppercase tracking-wide text-faint mb-1">Message</p><p className="text-ink whitespace-pre-line">{t.message}</p></div>
          <section>
            <h3 className="font-bold mb-2">Conversation & notes</h3>
            {t.notes.length ? (
              <ul className="space-y-2.5">
                {t.notes.map((n, i) => (
                  <li key={i} className={`rounded-xl p-3 border ${n.visibility === 'reply' ? 'border-brand/30 bg-brand/5' : 'border-line bg-surface'}`}>
                    <p className="text-[12px] text-muted flex items-center gap-1.5">{n.visibility === 'reply' ? <FiMessageSquare className="h-3.5 w-3.5" aria-hidden /> : <FiLock className="h-3.5 w-3.5" aria-hidden />}{n.visibility === 'reply' ? 'Reply to requester' : 'Internal note'} · {n.byName} · {formatDateTime(n.at)}</p>
                    <p className="text-ink mt-1 whitespace-pre-line">{n.text}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">No replies yet.</p>}
            <div className="mt-4 space-y-3">
              <Segmented size="sm" label="Note type" value={visibility} onChange={setVisibility} options={[{ value: 'reply', label: 'Reply to requester' }, { value: 'internal', label: 'Internal note' }]} />
              <TextArea label={visibility === 'reply' ? 'Reply (visible to the requester)' : 'Internal note (admins only)'} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} />
              <Button onClick={addNote} loading={busy} disabled={note.trim().length < 2}>{visibility === 'reply' ? 'Send reply' : 'Add note'}</Button>
              <p className="text-[12.5px] text-muted">Replies appear in the student app or canteen website — Campus Rush doesn’t send email.</p>
            </div>
          </section>
          <section>
            <h3 className="font-bold mb-2">History</h3>
            <ul className="text-[13px] text-muted space-y-1">{t.history.map((h, i) => <li key={i}>{TICKET_STATUS[h.status]?.label || h.status} · {h.by} · {formatDateTime(h.at)}</li>)}</ul>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

export default function Support() {
  useDocumentTitle('Support');
  const { admin } = useSession();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('unresolved');
  const [source, setSource] = useState('all');
  const { data, error, loading, reload } = useAsync(() => api.tickets({ status: tab === 'all' ? undefined : tab, source: source === 'all' ? undefined : source, assigned: tab === 'mine' ? 'me' : undefined }), [tab, source]);
  const { data: admins } = useAsync(() => (admin?.permissions?.manageAdmins ? api.admins() : Promise.resolve([{ _id: admin._id, name: admin.name }])), [admin?._id]);
  useRealtime('support.updated', useCallback(() => reload({ silent: true }), [reload]));
  const counts = data?.counts || {};
  return (
    <div className="animate-rise-in">
      <PageHeader title="Support" description="Help requests from students (app) and canteen staff (website)." />
      <Tabs label="Ticket status" value={tab} onChange={setTab} tabs={[
        { value: 'unresolved', label: 'Needs attention', count: (counts.open || 0) + (counts.in_progress || 0) },
        { value: 'mine', label: 'Assigned to me' },
        { value: 'resolved', label: 'Resolved', count: counts.resolved || 0 },
        { value: 'closed', label: 'Closed', count: counts.closed || 0 },
        { value: 'all', label: 'All' },
      ]} />
      <Segmented label="Source" className="mb-4" value={source} onChange={setSource} options={[{ value: 'all', label: 'Everyone' }, { value: 'student', label: 'Students' }, { value: 'canteen', label: 'Canteens' }]} />
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={4} /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? <EmptyState icon={FiLifeBuoy} title="Nothing here" message="New requests from the app and canteen website appear here instantly." /> : (
          <TableWrap minWidth={820} caption="Support requests">
            <thead className="bg-sunken/60 border-b border-line"><tr><th className="th">Request</th><th className="th">From</th><th className="th">Status</th><th className="th">Priority</th><th className="th">Assigned</th><th className="th">Updated</th></tr></thead>
            <tbody className="divide-y divide-divider">
              {data.data.map((t) => (
                <tr key={t._id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => setParams({ open: t._id })}>
                  <td className="td"><button type="button" onClick={(e) => { e.stopPropagation(); setParams({ open: t._id }); }} className="text-left"><span className="block font-semibold text-ink">{t.subject}</span><span className="block text-[12.5px] text-muted font-mono">{t.ref} · {t.category}</span></button></td>
                  <td className="td text-[13px]"><span className="block text-ink">{t.requester}</span><span className="text-muted">{t.source === 'student' ? 'Student' : `Canteen · ${t.canteen?.name || ''}`}</span></td>
                  <td className="td"><Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge></td>
                  <td className="td">{t.priority === 'high' ? <Badge tone="danger">High</Badge> : t.priority === 'low' ? <Badge>Low</Badge> : <span className="text-muted text-[13px]">Normal</span>}</td>
                  <td className="td text-[13px] text-ink">{t.assignedTo?.name || <span className="text-faint">—</span>}</td>
                  <td className="td text-muted whitespace-nowrap">{relativeTime(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <TicketDrawer id={params.get('open')} admins={admins || []} onClose={() => setParams({}, { replace: true })} onChanged={() => reload({ silent: true })} />
    </div>
  );
}
