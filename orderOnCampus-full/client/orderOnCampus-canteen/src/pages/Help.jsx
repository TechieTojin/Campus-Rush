import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiActivity, FiBarChart2, FiChevronDown, FiDollarSign, FiLifeBuoy, FiPlusCircle, FiToggleRight } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Badge, Card, PageHeader } from '../components/ui/Display';
import { Banner } from '../components/ui/Feedback';
import { Select, TextArea, TextInput } from '../components/ui/Form';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { relativeTime } from '../lib/format';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { useRealtime } from '../lib/realtimeContext';
import { useSession } from '../lib/sessionContext';

const GUIDES = [
  {
    icon: FiPlusCircle,
    title: 'Adding a menu item',
    link: { to: '/menu/new', label: 'Add menu item' },
    steps: [
      'Open Add menu item from the sidebar or the dashboard.',
      'Enter a name and a price in rupees. Description, category, photo, preparation time and dietary info are optional.',
      'Upload a JPG, PNG or WebP photo up to 2 MB. Wait for “Saved to server” before saving the item.',
      'Click Save item — or Save & add another to keep going. The item is in the student app straight away.',
    ],
  },
  {
    icon: FiActivity,
    title: 'Managing orders',
    link: { to: '/live', label: 'Live orders' },
    steps: [
      'New orders land in the New column of Live orders, with a chime and a notification.',
      'Accept & start preparing moves an order to Preparing — or Reject it if you can’t make it.',
      'Mark ready for pickup when it’s at the counter. The student sees “Ready” in their app.',
      'When the student collects and pays, Record payment and Mark collected.',
      'Allowed steps: New → Preparing or Rejected; Preparing → Ready or Collected; Ready → Collected. Completed and cancelled orders are final.',
    ],
  },
  {
    icon: FiToggleRight,
    title: 'Updating availability',
    link: { to: '/availability', label: 'Availability' },
    steps: [
      'Flip an item’s switch to Sold out the moment it runs out. Students see “Sold out” and can’t order it.',
      'Use Mark all sold out / available on the Availability page for bulk changes, or select rows on the Menu page.',
      'To stop all orders (closing early, rush hour), use the Open for orders switch in the top bar instead.',
    ],
  },
  {
    icon: FiDollarSign,
    title: 'Changing prices',
    link: { to: '/menu', label: 'Menu' },
    steps: [
      'Open the item from Menu and click Edit, change the price, then Save changes.',
      'New orders use the new price. The server always calculates totals from your current menu, so students can’t pay an old price.',
      'Past orders keep the price they were placed at.',
    ],
  },
  {
    icon: FiBarChart2,
    title: 'Viewing sales',
    link: { to: '/analytics', label: 'Sales & analytics' },
    steps: [
      'Sales & analytics shows orders, order value, completed sales and collected revenue for any date range.',
      'Collected revenue only counts orders where you recorded the counter payment.',
      'Export daily totals or item sales as CSV for your records.',
    ],
  },
];

const FAQ = [
  { q: 'A student says the app shows an old price or item.', a: 'The app loads the menu when the student opens your canteen; pulling down refreshes it. At checkout the app re-checks prices and availability, and the server always charges the current price.' },
  { q: '“Cannot transition from … to …” when updating an order.', a: 'The order was already moved by someone else, or that step isn’t allowed (for example, completed orders can’t be reopened). The board refreshes automatically to show the current status.' },
  { q: '“Image is larger than 2 MB” or “not a valid image”.', a: 'Use a JPG, PNG or WebP under 2 MB. Photos straight from a phone camera are often bigger — take a screenshot or resize before uploading.' },
  { q: 'My session expired.', a: 'Sessions last 24 hours. Sign in again; you’ll be returned to the page you were on.' },
  { q: 'Can’t reach the server.', a: 'Check your internet connection. If it persists, the Campus Rush server may be down — contact your administrator.' },
  { q: 'Can I remove an item that was ordered before?', a: 'Yes. Removing takes it off the menu for students, but past orders keep their record. If it’s only temporarily unavailable, mark it sold out instead.' },
];

const TICKET_STATUS = { open: ['Open', 'saffron'], in_progress: ['In progress', 'info'], resolved: ['Resolved', 'success'], closed: ['Closed', 'neutral'] };

// Requests go to Campus Rush admins (Support page in the admin portal); replies show up here.
function SupportSection() {
  const { canteen } = useSession();
  const toast = useToast();
  const { data: tickets, reload } = useAsync(() => api.supportTickets(canteen._id), [canteen._id]);
  const { data: config } = useAsync(() => api.appConfig(), []);
  useRealtime('support.updated', () => reload({ silent: true }));
  const [form, setForm] = useState({ category: 'menu', subject: '', message: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errors = {
    subject: form.subject.trim().length < 4 ? 'Add a short subject (4+ characters)' : '',
    message: form.message.trim().length < 10 ? 'Describe the problem (10+ characters)' : '',
  };
  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (errors.subject || errors.message || busy) return;
    setBusy(true);
    setError('');
    try {
      const t = await api.createSupportTicket(canteen._id, { ...form, subject: form.subject.trim(), message: form.message.trim() });
      toast.success(`Request ${t.ref} sent. Replies appear here.`, { title: 'Sent to Campus Rush' });
      setForm({ category: 'menu', subject: '', message: '' });
      setTouched(false);
      reload({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const support = config?.support || {};
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-10">
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-10 w-10 rounded-xl bg-saffron-100 text-saffron-700 flex items-center justify-center shrink-0"><FiLifeBuoy className="h-5 w-5" aria-hidden /></span>
          <div><h2 className="font-bold">Contact Campus Rush support</h2><p className="text-[13px] text-muted">Goes to the Campus Rush admin team. No email is sent — replies appear on this page.</p></div>
        </div>
        {error ? <Banner tone="danger" className="mb-3">{error}</Banner> : null}
        <form onSubmit={submit} noValidate className="space-y-3">
          <Select label="Topic" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="menu">Menu or items</option><option value="order">An order</option><option value="payment">Payments</option><option value="account">Account or access</option><option value="app">Website problem</option><option value="other">Something else</option>
          </Select>
          <TextInput label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} error={touched ? errors.subject : ''} maxLength={120} />
          <TextArea label="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} error={touched ? errors.message : ''} maxLength={2000} rows={4} />
          <Button type="submit" loading={busy}>Send request</Button>
        </form>
        {support.email || support.phone ? <p className="text-[13px] text-muted mt-4">Urgent? {support.phone ? `Call ${support.phone}` : ''}{support.phone && support.email ? ' or ' : ''}{support.email ? `email ${support.email}` : ''}{support.hours ? ` (${support.hours})` : ''}.</p> : null}
      </Card>
      <Card className="p-5">
        <h2 className="font-bold mb-3">Your requests</h2>
        {!tickets ? <p className="text-muted">Loading…</p> : !tickets.length ? <p className="text-muted">No requests yet.</p> : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t._id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-ink">{t.subject}</span><Badge tone={TICKET_STATUS[t.status][1]}>{TICKET_STATUS[t.status][0]}</Badge></div>
                <p className="text-[12.5px] text-muted font-mono">{t.ref} · {relativeTime(t.createdAt)}</p>
                {t.replies.map((r, i) => <div key={i} className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-[13.5px] text-brand-800"><p className="font-semibold text-[12px]">{r.by} · {relativeTime(r.at)}</p><p className="whitespace-pre-line">{r.text}</p></div>)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function Help() {
  useDocumentTitle('Help & support');
  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader title="Help & support" description="How to run your canteen day to day on Campus Rush." />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Card key={g.title} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><g.icon className="h-5 w-5" aria-hidden /></span>
              <h2 className="font-bold text-[16px] flex-1">{g.title}</h2>
              <Link to={g.link.to} className="text-[13px] font-semibold text-brand-700 hover:underline">{g.link.label}</Link>
            </div>
            <ol className="list-decimal pl-5 space-y-1.5 text-[13.5px] marker:text-faint marker:font-semibold">
              {g.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </Card>
        ))}
      </div>

      <h2 className="text-[18px] font-bold mt-10 mb-4">Common problems</h2>
      <Card className="divide-y divide-divider">
        {FAQ.map((f) => (
          <details key={f.q} className="group px-5">
            <summary className="flex items-center justify-between gap-3 py-4 cursor-pointer list-none font-semibold text-ink">
              {f.q}
              <FiChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180 shrink-0" aria-hidden />
            </summary>
            <p className="pb-4 -mt-1 text-[13.5px] text-body">{f.a}</p>
          </details>
        ))}
      </Card>

      <SupportSection />
    </div>
  );
}
