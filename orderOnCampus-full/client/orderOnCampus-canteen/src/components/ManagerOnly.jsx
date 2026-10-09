import { FiLock } from 'react-icons/fi';
import Button from './ui/Button';
import { EmptyState } from './ui/Feedback';

// Shown to the 'staff' role on manager-only screens. The server enforces the same rule.
export default function ManagerOnly({ what = 'this page' }) {
  return (
    <EmptyState
      icon={FiLock}
      title="Managers only"
      message={`Your account handles orders and availability. Ask your canteen manager or a Campus Rush admin to change ${what}.`}
      action={<Button variant="secondary" to="/live">Go to live orders</Button>}
      className="py-20"
    />
  );
}
