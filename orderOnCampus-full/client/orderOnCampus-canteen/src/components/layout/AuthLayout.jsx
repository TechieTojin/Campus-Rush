import { FiActivity, FiBarChart2, FiBookOpen } from 'react-icons/fi';

const POINTS = [
  { icon: FiActivity, title: 'Live order queue', text: 'New orders appear automatically. Move them from preparing to ready in one click.' },
  { icon: FiBookOpen, title: 'Menu in your hands', text: 'Prices, photos and availability update in the student app as soon as you save.' },
  { icon: FiBarChart2, title: 'Know your numbers', text: 'Daily sales, best sellers and order trends from your real orders.' },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] bg-white">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-12 text-white">
        <div aria-hidden className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full border border-white/10" />
        <div aria-hidden className="absolute -right-10 top-20 h-[300px] w-[300px] rounded-full bg-saffron-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-extrabold text-[18px] tracking-tight">Campus Rush</p>
            <p className="text-brand-200 text-[12px] font-semibold uppercase tracking-[0.16em]">Canteen portal</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-white text-[34px] leading-[1.15] font-extrabold">Run your canteen counter without the chaos.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-saffron-400"><p.icon className="h-5 w-5" aria-hidden /></span>
                <span>
                  <span className="block font-bold">{p.title}</span>
                  <span className="block text-brand-100/80 text-[14px] mt-0.5">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-brand-200/70 text-[12.5px]">Orders placed in the Campus Rush student app arrive here in real time.</p>
      </section>
      <section className="flex flex-col justify-center px-5 sm:px-10 py-12">
        <div className="w-full max-w-[420px] mx-auto">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <img src="/favicon.svg" alt="" className="h-9 w-9" />
            <p className="font-extrabold text-ink text-[17px]">Campus Rush <span className="text-brand-600 font-semibold">Canteen</span></p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
