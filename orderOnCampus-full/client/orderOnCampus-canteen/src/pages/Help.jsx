import { Link } from 'react-router-dom';
import { FiActivity, FiBarChart2, FiChevronDown, FiDollarSign, FiLifeBuoy, FiPlusCircle, FiToggleRight } from 'react-icons/fi';
import { Card, PageHeader } from '../components/ui/Display';
import { useDocumentTitle } from '../lib/hooks';

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

      <Card className="p-5 mt-8 flex gap-4 items-start">
        <span className="h-10 w-10 rounded-xl bg-saffron-100 text-saffron-700 flex items-center justify-center shrink-0"><FiLifeBuoy className="h-5 w-5" aria-hidden /></span>
        <div>
          <h2 className="font-bold">Contacting support</h2>
          <p className="text-[13.5px] text-body mt-1">Campus Rush doesn’t have an in-app support channel yet. For account access, password resets or server problems, contact the Campus Rush administrator at your college who set up your canteen account.</p>
        </div>
      </Card>
    </div>
  );
}
