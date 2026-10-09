import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFileText, FiLock } from 'react-icons/fi';
import { Badge, Card, PageHeader, Pagination, TableWrap } from '../components/ui/Display';
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { SearchInput, Select, TextInput } from '../components/ui/Form';
import { Drawer } from '../components/ui/Overlay';
import { api } from '../lib/api';
import { formatDateTime, todayKey } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';

export default function AuditLog() {
  useDocumentTitle('Audit log');
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(q);
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [actorType, setActorType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  useEffect(() => { const t = setTimeout(() => { setDebounced(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, error, loading, reload } = useAsync(() => api.audit({ q: debounced || undefined, action: action || undefined, result: result || undefined, actorType: actorType || undefined, from: from || undefined, to: to || undefined, page }), [debounced, action, result, actorType, from, to, page]);

  return (
    <div className="animate-rise-in">
      <PageHeader title="Audit log" description="Append-only record of sign-ins and every administrative change. Entries can’t be edited or deleted." />
      <p className="text-[13px] text-muted mb-4 flex items-start gap-1.5"><FiLock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Passwords, tokens and cookies are never recorded.</p>
      <Card className="p-4 mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SearchInput value={q} onChange={setQ} placeholder="Search actor, action or target" className="md:col-span-3 xl:col-span-2" />
        <Select aria-label="Action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {(data?.actions || []).map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select aria-label="Result" value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }}><option value="">Any result</option><option value="success">Success</option><option value="failure">Failure</option></Select>
        <TextInput aria-label="From date" type="date" value={from} max={to || todayKey()} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <TextInput aria-label="To date" type="date" value={to} min={from} max={todayKey()} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <Select aria-label="Actor type" value={actorType} onChange={(e) => { setActorType(e.target.value); setPage(1); }} className="xl:col-start-6"><option value="">Any actor</option><option value="admin">Admins</option><option value="system">System (failed sign-ins)</option></Select>
      </Card>
      <Card className="overflow-hidden">
        {loading && !data ? <div className="p-4"><SkeletonRows rows={8} className="h-12" /></div> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? <EmptyState icon={FiFileText} title="No entries match" /> : (
          <>
            <TableWrap minWidth={900} caption="Audit entries">
              <thead className="bg-sunken/60 border-b border-line"><tr><th className="th">When</th><th className="th">Actor</th><th className="th">Action</th><th className="th">Target</th><th className="th">Result</th></tr></thead>
              <tbody className="divide-y divide-divider">
                {data.data.map((a) => (
                  <tr key={a._id} className="hover:bg-sunken/50 cursor-pointer" onClick={() => setOpen(a)}>
                    <td className="td text-muted whitespace-nowrap">{formatDateTime(a.at)}</td>
                    <td className="td"><span className="block text-ink font-medium">{a.actor?.name || (a.actor?.type === 'system' ? 'System' : '—')}</span><span className="text-[12px] text-muted">{a.actor?.type}{a.actor?.role ? ` · ${a.actor.role}` : ''}</span></td>
                    <td className="td"><button type="button" onClick={(e) => { e.stopPropagation(); setOpen(a); }} className="font-mono text-[12.5px] text-ink hover:text-brand">{a.action}</button></td>
                    <td className="td text-[13px] text-body max-w-[260px] truncate">{a.target?.label || a.target?.type || '—'}{a.target?.id ? <span className="text-faint font-mono"> · {String(a.target.id).slice(-6)}</span> : null}</td>
                    <td className="td"><Badge tone={a.result === 'success' ? 'success' : 'danger'}>{a.result}{a.status ? ` · ${a.status}` : ''}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <div className="px-5 py-3 border-t border-divider"><Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} label="entries" /></div>
          </>
        )}
      </Card>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.action || ''} subtitle={open ? formatDateTime(open.at) : ''}>
        {open ? (
          <div className="space-y-4 text-[13.5px]">
            <p><strong className="text-ink">Actor:</strong> {open.actor?.name || open.actor?.type} {open.actor?.role ? `(${open.actor.role})` : ''}</p>
            <p><strong className="text-ink">Target:</strong> {open.target?.type} {open.target?.label || ''} {open.target?.id ? <span className="font-mono">{open.target.id}</span> : null}</p>
            <p><strong className="text-ink">Result:</strong> {open.result} {open.status ? `(HTTP ${open.status})` : ''}</p>
            {open.ip ? <p><strong className="text-ink">IP:</strong> {open.ip}</p> : null}
            <div><p className="font-bold text-ink mb-1">Details</p><pre className="rounded-xl bg-sunken p-3 text-[12px] overflow-x-auto whitespace-pre-wrap break-words text-body">{JSON.stringify(open.details || {}, null, 2)}</pre></div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
