import { FiActivity, FiLock, FiShield } from 'react-icons/fi';

const POINTS = [
  { icon: FiActivity, title: 'One live view of every canteen', text: 'Orders, menus and availability across campus, updating as they change.' },
  { icon: FiShield, title: 'Controls with guardrails', text: 'Every sensitive action is permission-checked on the server and written to the audit log.' },
  { icon: FiLock, title: 'Private by design', text: 'Students and canteens only see their own data. You see what you need to run the platform.' },
];

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] bg-surface">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-nav p-12 text-white">
        <div aria-hidden className="absolute -right-32 -top-32 h-[460px] w-[460px] rounded-full border border-white/[0.06]" />
        <div aria-hidden className="absolute -left-20 bottom-10 h-[320px] w-[320px] rounded-full bg-accent/10 blur-3xl" />
        <div aria-hidden className="absolute right-10 top-40 h-[260px] w-[260px] rounded-full bg-brand-600/25 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <div className="leading-tight">
            <p className="font-extrabold text-[18px] tracking-tight">Campus Rush</p>
            <p className="text-accent text-[11.5px] font-bold uppercase tracking-[0.2em]">Super Admin</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-white text-[34px] leading-[1.15] font-extrabold">The control room for every canteen on campus.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="h-10 w-10 shrink-0 rounded-xl bg-white/[0.07] flex items-center justify-center text-accent"><p.icon className="h-5 w-5" aria-hidden /></span>
                <span>
                  <span className="block font-bold">{p.title}</span>
                  <span className="block text-nav-text text-[14px] mt-0.5">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-nav-text/60 text-[12.5px]">Restricted area. Access is limited to authorised Campus Rush administrators.</p>
      </section>
      <section className="flex flex-col justify-center px-5 sm:px-10 py-12">
        <div className="w-full max-w-[420px] mx-auto">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <img src="/favicon.svg" alt="" className="h-9 w-9" />
            <p className="font-extrabold text-ink text-[17px]">Campus Rush <span className="text-accent font-bold">Admin</span></p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
