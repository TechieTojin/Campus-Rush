import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import Button from './ui/Button';
import { Banner } from './ui/Feedback';
import { TextArea } from './ui/Form';
import { Dialog } from './ui/Overlay';
import { useToast } from './ui/useToast';

const COPY = {
  approve: { status: 'active', title: 'Approve canteen?', button: 'Approve', tone: 'primary', text: 'It becomes visible to students. Staff still choose when to open for orders.' },
  reactivate: { status: 'active', title: 'Reactivate canteen?', button: 'Reactivate', tone: 'primary', text: 'Students can find it again. Staff need to switch ordering back on themselves.' },
  suspend: { status: 'suspended', title: 'Suspend canteen?', button: 'Suspend canteen', tone: 'danger', reason: true, text: 'Students can’t discover it or place new orders, and ordering is switched off. Orders already placed stay with the canteen so they can be completed, and no history is deleted.' },
  reject: { status: 'rejected', title: 'Reject application?', button: 'Reject', tone: 'danger', reason: true, text: 'The canteen stays hidden from students. Staff see your reason on their dashboard.' },
};

export default function CanteenStatusDialog({ canteen, action, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setReason(''); setError(''); }, [action]);
  const c = COPY[action];
  if (!c || !canteen) return null;
  const submit = async () => {
    if (c.reason && reason.trim().length < 5) { setError('Give a reason of at least 5 characters'); return; }
    setBusy(true);
    try {
      await api.setCanteenStatus(canteen._id, c.status, reason.trim());
      toast.success(`${canteen.name} is now ${c.status}.`, { title: 'Canteen updated' });
      onDone?.();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={busy ? () => {} : onClose} title={`${c.title.replace('canteen', canteen.name)}`} size="sm"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button variant={c.tone} onClick={submit} loading={busy}>{c.button}</Button></>}>
      <p className="text-body">{c.text}</p>
      {c.reason ? <TextArea className="mt-4" label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} hint="Shown to the canteen’s staff and recorded in the audit log." /> : null}
      {error ? <Banner tone="danger" className="mt-3">{error}</Banner> : null}
    </Dialog>
  );
}
