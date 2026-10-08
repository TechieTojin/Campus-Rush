import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { OrderDetail } from '../components/orders';
import Button from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Display';
import { ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle, usePolling } from '../lib/hooks';
import { money, orderRef } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import useOrderActions from '../components/useOrderActions';

export default function OrderPage() {
  const { orderId } = useParams();
  const { canteen } = useSession();
  useDocumentTitle(`Order ${orderRef(orderId)}`);
  const { data: order, error, loading, reload } = useAsync(() => api.order(canteen._id, orderId), [canteen._id, orderId]);
  const refresh = useCallback(() => reload({ silent: true }), [reload]);
  const actions = useOrderActions(refresh);
  usePolling(refresh, 15000, !!order && !['Completed', 'Cancelled'].includes(order.status));

  return (
    <div className="animate-rise-in max-w-4xl">
      <PageHeader
        back={<Link to="/orders" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink mb-3"><FiArrowLeft className="h-4 w-4" aria-hidden />All orders</Link>}
        title={`Order ${orderRef(orderId)}`}
        description={order ? `${order.itemCount} item${order.itemCount === 1 ? '' : 's'} · ${money(order.totalPrice)}` : null}
        actions={<Button variant="secondary" icon={FiRefreshCw} onClick={() => reload()} loading={loading && !!order}>Refresh</Button>}
      />
      <Card className="p-5 sm:p-6">
        {loading && !order ? <SkeletonRows rows={6} /> : error && !order ? <ErrorState message={error} onRetry={reload} /> : <OrderDetail order={order} actions={actions} />}
      </Card>
      {actions.cancelDialog}
    </div>
  );
}
