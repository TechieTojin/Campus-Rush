import { FiCompass } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { useDocumentTitle } from '../lib/hooks';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return <EmptyState icon={FiCompass} title="Page not found" message="That page doesn’t exist in the admin portal." action={<Button to="/">Go to overview</Button>} className="py-24" />;
}
