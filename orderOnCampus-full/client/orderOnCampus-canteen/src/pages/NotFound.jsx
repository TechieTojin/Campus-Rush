import { FiCompass } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { useDocumentTitle } from '../lib/hooks';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <EmptyState
      icon={FiCompass}
      title="Page not found"
      message="That page doesn't exist in the canteen portal."
      action={<Button to="/dashboard">Go to dashboard</Button>}
      className="py-24"
    />
  );
}
