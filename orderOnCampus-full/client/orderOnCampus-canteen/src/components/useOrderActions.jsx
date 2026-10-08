import { useCallback, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { STATUS } from '../lib/constants';
import { money, orderRef } from '../lib/format';
import { useCanteenId } from '../lib/sessionContext';
import { useShell } from './layout/useShell';
import { ConfirmDialog } from './ui/Overlay';
import { useToast } from './ui/useToast';

// Status/payment mutations with confirmation for cancellations and conflict handling.
export default function useOrderActions(onChanged) {
  const cid = useCanteenId();
  const toast = useToast();
  const { refreshCounts } = useShell();
  const [busy, setBusy] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(null);

  const run = useCallback(async (order, status) => {
    setBusy(`${order._id}:${status}`);
    try {
      await api.setStatus(order._id, status);
      toast.success(`${orderRef(order._id)} → ${STATUS[status].long}`);
      refreshCounts();
      await onChanged?.(order, status);
    } catch (e) {
      const conflict = e.response?.status === 409 || e.response?.status === 400;
      toast.error(errorMessage(e), { title: conflict ? 'Order changed — refreshed' : 'Status not updated' });
      await onChanged?.(order, null);
    } finally {
      setBusy(null);
    }
  }, [toast, refreshCounts, onChanged]);

  const advance = useCallback((order, status) => {
    if (status === 'Cancelled') setPendingCancel(order);
    else run(order, status);
  }, [run]);

  const setPaid = useCallback(async (order, paid) => {
    setBusy(`${order._id}:pay`);
    try {
      await api.setPayment(cid, order._id, paid);
      toast.success(paid ? `Payment of ${money(order.totalPrice)} recorded for ${orderRef(order._id)}` : `Payment record removed for ${orderRef(order._id)}`);
      await onChanged?.(order, 'payment');
    } catch (e) {
      toast.error(errorMessage(e), { title: 'Payment not recorded' });
    } finally {
      setBusy(null);
    }
  }, [cid, toast, onChanged]);

  const cancelDialog = (
    <ConfirmDialog
      open={!!pendingCancel}
      onClose={() => setPendingCancel(null)}
      loading={!!pendingCancel && busy === `${pendingCancel._id}:Cancelled`}
      onConfirm={async () => { await run(pendingCancel, 'Cancelled'); setPendingCancel(null); }}
      title={`Reject order ${pendingCancel ? orderRef(pendingCancel._id) : ''}?`}
      confirmLabel="Reject order"
      message="The student will see this order as cancelled. This can't be undone — they would need to place a new order."
    />
  );

  return { advance, setPaid, busy, cancelDialog };
}
