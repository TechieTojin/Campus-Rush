import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FiWifiOff } from 'react-icons/fi';
import AppShell from './components/layout/AppShell';
import Button from './components/ui/Button';
import { Spinner } from './components/ui/Feedback';
import { RealtimeProvider } from './lib/realtime';
import { useSession } from './lib/sessionContext';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Overview from './pages/Overview';
import LiveMonitor from './pages/LiveMonitor';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import Canteens from './pages/Canteens';
import CanteenDetail from './pages/CanteenDetail';
import Staff from './pages/Staff';
import Students from './pages/Students';
import GlobalMenu from './pages/GlobalMenu';
import Categories from './pages/Categories';
import Announcements from './pages/Announcements';
import Banners from './pages/Banners';
import AppConfig from './pages/AppConfig';
import Support from './pages/Support';
import PlatformSettings from './pages/PlatformSettings';
import Admins from './pages/Admins';
import AuditLog from './pages/AuditLog';
import SystemHealth from './pages/SystemHealth';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function FullScreen({ children }) {
  return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">{children}</div>;
}

// Admin pages require a server-verified admin session; the role always comes from the API, never the browser.
function RequireAdmin({ children }) {
  const { status, refresh } = useSession();
  const location = useLocation();
  if (status === 'loading') return <FullScreen><Spinner className="h-7 w-7 text-brand" /><p className="text-muted">Checking your session…</p></FullScreen>;
  if (status === 'offline') {
    return (
      <FullScreen>
        <div className="h-14 w-14 rounded-2xl bg-sunken flex items-center justify-center"><FiWifiOff className="h-6 w-6 text-muted" /></div>
        <h1 className="text-xl font-bold">Can’t reach the Campus Rush server</h1>
        <p className="text-muted max-w-sm">Check your connection, or that the backend is running, then try again.</p>
        <Button onClick={refresh}>Try again</Button>
      </FullScreen>
    );
  }
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <RealtimeProvider enabled={status === 'signedIn'}>{children}</RealtimeProvider>;
}

function RequirePermission({ perm, children }) {
  const { admin } = useSession();
  if (perm && !admin?.permissions?.[perm]) {
    return <FullScreen><h1 className="text-xl font-bold">Not available for your role</h1><p className="text-muted">Only super admins can open this page.</p><Button to="/">Back to overview</Button></FullScreen>;
  }
  return children;
}

function PublicOnly({ children }) {
  const { status } = useSession();
  if (status === 'loading') return <FullScreen><Spinner className="h-7 w-7 text-brand" /></FullScreen>;
  if (status === 'signedIn') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/setup" element={<PublicOnly><Setup /></PublicOnly>} />
      <Route element={<RequireAdmin><AppShell /></RequireAdmin>}>
        <Route index element={<Overview />} />
        <Route path="live" element={<LiveMonitor />} />
        <Route path="orders" element={<Orders />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="canteens" element={<Canteens />} />
        <Route path="canteens/:canteenId" element={<CanteenDetail />} />
        <Route path="staff" element={<Staff />} />
        <Route path="students" element={<Students />} />
        <Route path="menu" element={<GlobalMenu />} />
        <Route path="categories" element={<Categories />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="banners" element={<Banners />} />
        <Route path="app-config" element={<AppConfig />} />
        <Route path="support" element={<Support />} />
        <Route path="settings" element={<PlatformSettings />} />
        <Route path="admins" element={<RequirePermission perm="manageAdmins"><Admins /></RequirePermission>} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="system" element={<SystemHealth />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
