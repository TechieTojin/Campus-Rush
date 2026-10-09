import { FiActivity, FiAlertTriangle, FiCheckCircle, FiDatabase, FiRadio, FiRefreshCw, FiServer, FiXCircle } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Card, CardHeader, KeyValue, PageHeader } from '../components/ui/Display';
import { Banner, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { api } from '../lib/api';
import { formatDateTime, formatTime, relativeTime } from '../lib/format';
import { useAsync, useDocumentTitle, usePolling } from '../lib/hooks';
import { useRealtimeStatus } from '../lib/realtimeContext';

const Status = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1.5 font-semibold ${ok ? 'text-success' : 'text-danger'}`}>{ok ? <FiCheckCircle className="h-4 w-4" aria-hidden /> : <FiXCircle className="h-4 w-4" aria-hidden />}{label}</span>
);

const duration = (s) => (s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${(s / 3600).toFixed(1)} h` : `${(s / 86400).toFixed(1)} days`);

export default function SystemHealth() {
  useDocumentTitle('System health');
  const { data: h, error, loading, reload } = useAsync(() => api.health(), []);
  const { status: rt, lastEventAt } = useRealtimeStatus();
  usePolling(() => reload({ silent: true }), 15000);
  if (loading && !h) return <Card className="p-6"><SkeletonRows rows={5} /></Card>;
  if (error && !h) return <ErrorState message={`The API isn’t responding: ${error}`} onRetry={reload} />;
  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader title="System health" description="What this server can observe about itself right now. Refreshes every 15 seconds."
        actions={<><span className="text-[12.5px] text-muted">Checked {formatTime(h.checkedAt)}</span><Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()}>Check now</Button></>} />
      {h.warnings.length ? (
        <Banner tone="warning" className="mb-5" title="Warnings"><ul className="list-disc pl-5">{h.warnings.map((w) => <li key={w}>{w}</li>)}</ul></Banner>
      ) : <Banner tone="success" className="mb-5">All observed services are healthy.</Banner>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FiServer className="h-4 w-4 text-brand" aria-hidden />API server</span>} />
          <dl className="px-5 pb-5 grid grid-cols-2 gap-4">
            <KeyValue label="Status"><Status ok={h.api.ok} label="Responding" /></KeyValue>
            <KeyValue label="Uptime">{duration(h.api.uptimeSeconds)}</KeyValue>
            <KeyValue label="Runtime">Node {h.api.node}</KeyValue>
            <KeyValue label="Mode">{h.api.environment}</KeyValue>
          </dl>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FiDatabase className="h-4 w-4 text-brand" aria-hidden />Database</span>} />
          <dl className="px-5 pb-5 grid grid-cols-2 gap-4">
            <KeyValue label="Status"><Status ok={h.database.ok} label={h.database.state} /></KeyValue>
            <KeyValue label="Ping">{h.database.pingMs != null ? `${h.database.pingMs} ms` : '—'}</KeyValue>
            <KeyValue label="Last order">{h.lastOrderAt ? relativeTime(h.lastOrderAt) : '—'}</KeyValue>
            <KeyValue label="Last activity">{h.lastActivityAt ? relativeTime(h.lastActivityAt) : '—'}</KeyValue>
          </dl>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FiRadio className="h-4 w-4 text-brand" aria-hidden />Realtime</span>} subtitle="Socket.IO connections on this server" />
          <dl className="px-5 pb-5 grid grid-cols-2 gap-4">
            <KeyValue label="Server"><Status ok={h.realtime.ok} label={h.realtime.ok ? 'Attached' : 'Not attached'} /></KeyValue>
            <KeyValue label="This browser"><Status ok={rt === 'live'} label={rt} /></KeyValue>
            <KeyValue label="Connected now">{h.realtime.connected.admin} admin · {h.realtime.connected.staff} staff · {h.realtime.connected.student} student</KeyValue>
            <KeyValue label="Events since start">{h.realtime.eventsSinceStart} · {h.realtime.rejectedConnections} rejected</KeyValue>
            <KeyValue label="Last event received here">{lastEventAt ? formatTime(lastEventAt) : 'None yet'}</KeyValue>
            <KeyValue label="Counting since">{formatDateTime(h.realtime.since)}</KeyValue>
          </dl>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FiAlertTriangle className="h-4 w-4 text-brand" aria-hidden />Server errors</span>} subtitle="HTTP 5xx responses since the server started" />
          <div className="px-5 pb-5">
            <p className="text-ink font-semibold">{h.errors.lastHour} in the last hour</p>
            {h.errors.recent.length ? <ul className="mt-2 space-y-1 text-[13px] font-mono">{h.errors.recent.map((e, i) => <li key={i} className="text-body">{formatTime(e.at)} · {e.status} · {e.method} {e.path}</li>)}</ul> : <p className="text-muted mt-1">None recorded.</p>}
          </div>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader title={<span className="flex items-center gap-2"><FiActivity className="h-4 w-4 text-brand" aria-hidden />Recent sync events</span>} subtitle="Change notifications the server sent to apps and websites (types and audiences only)" />
        {h.realtime.recentEvents.length ? (
          <ul className="px-5 pb-5 space-y-1 text-[13px]">{h.realtime.recentEvents.map((e, i) => <li key={i} className="flex gap-3"><span className="text-muted tabular w-24 shrink-0">{formatTime(e.at)}</span><span className="font-mono text-ink">{e.type}</span><span className="text-muted">→ {e.scope}</span></li>)}</ul>
        ) : <p className="px-5 pb-5 text-muted">No events since the server started.</p>}
      </Card>
      <p className="text-[12.5px] text-muted mt-4">This page reports only what the server can observe directly. There is no external uptime monitoring, log aggregation or alerting configured.</p>
    </div>
  );
}
