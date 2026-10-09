import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FiWifiOff } from 'react-icons/fi';
import AppShell from './components/layout/AppShell';
import Button from './components/ui/Button';
import { Spinner } from './components/ui/Feedback';
import { useSession } from './lib/sessionContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import SetupPassword from './pages/SetupPassword';
import { RealtimeProvider } from './lib/realtime';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderPage from './pages/OrderPage';
import LiveOrders from './pages/LiveOrders';
import Menu from './pages/Menu';
import MenuItemForm from './pages/MenuItemForm';
import Categories from './pages/Categories';
import Availability from './pages/Availability';
import Analytics from './pages/Analytics';
import Customers from './pages/Customers';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Help from './pages/Help';
import NotFound from './pages/NotFound';

function FullScreen({ children }) {
  return <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">{children}</div>;
}

// Signed-in staff with a canteen only. Unauthenticated visitors go to /login and come back afterwards.
function RequireCanteen({ children }) {
  const { status, canteen, refresh, staff } = useSession();
  const location = useLocation();
  if (status === 'loading') return <FullScreen><Spinner className="h-7 w-7 text-brand-600" /><p className="text-muted">Loading your canteen…</p></FullScreen>;
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
  if (status === 'signedIn' && !canteen) return <Navigate to="/setup" replace />;
  // Live updates for this account's canteens; if the server ends the socket (access changed), re-check the session.
  return (
    <RealtimeProvider enabled={status === 'signedIn'} sessionKey={`${staff?._id}:${(staff?.ownedCanteens || []).map((c) => c._id).join(',')}`} onAccessChanged={refresh}>
      {children}
    </RealtimeProvider>
  );
}

function PublicOnly({ children }) {
  const { status, canteen } = useSession();
  if (status === 'loading') return <FullScreen><Spinner className="h-7 w-7 text-brand-600" /></FullScreen>;
  if (status === 'signedIn') return <Navigate to={canteen ? '/dashboard' : '/setup'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/setup-password" element={<SetupPassword />} />
      <Route element={<RequireCanteen><AppShell /></RequireCanteen>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="live" element={<LiveOrders />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:orderId" element={<OrderPage />} />
        <Route path="menu" element={<Menu />} />
        <Route path="menu/new" element={<MenuItemForm />} />
        <Route path="menu/:itemId/edit" element={<MenuItemForm />} />
        <Route path="categories" element={<Categories />} />
        <Route path="availability" element={<Availability />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="customers" element={<Customers />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="help" element={<Help />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      {/* Old dashboard URLs */}
      <Route path="/canteenStaff/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/registerCanteen" element={<Navigate to="/setup" replace />} />
    </Routes>
  );
}
