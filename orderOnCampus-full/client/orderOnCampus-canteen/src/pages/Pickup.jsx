import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  FiAlertCircle, FiCamera, FiCameraOff, FiCheck, FiCheckCircle, FiCreditCard,
  FiList, FiMessageSquare, FiRefreshCw, FiXCircle,
} from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Card, KeyValue, PageHeader, StatusBadge } from '../components/ui/Display';
import { Banner, EmptyState, SkeletonRows } from '../components/ui/Feedback';
import { useToast } from '../components/ui/useToast';
import { api, errorMessage } from '../lib/api';
import { formatTime, money, orderRef } from '../lib/format';
import { useDocumentTitle, usePolling } from '../lib/hooks';
import { useCanteenId } from '../lib/sessionContext';
import { useRealtime } from '../lib/realtimeContext';

// Counter pickup: scan the student's QR, check what they ordered and whether it is paid, then
// hand it over.
//
// Nothing here decides anything. The QR is sent to the server, which verifies the credential,
// checks it belongs to this canteen, that the order is Ready and that payment has been recorded,
// and only then completes the order. The scanner just shows what the server said.
const DECODE_INTERVAL_MS = 120;

// Plain-language messages for the codes the server can return.
const REASONS = {
  INVALID_CODE: { title: 'Not a valid pickup code', hint: 'Ask the student to open the pickup code in their app again.' },
  EXPIRED: { title: 'That code has expired', hint: 'Codes last five minutes. Ask the student to refresh it in the app.' },
  ALREADY_USED: { title: 'This code has already been used', hint: 'The order has been collected. Check the orders list if this looks wrong.' },
  ALREADY_COLLECTED: { title: 'Order already collected', hint: 'Nothing more to do here.' },
  CANCELLED: { title: 'This order was cancelled', hint: 'There is nothing to hand over.' },
  NOT_READY: { title: 'Order is not ready yet', hint: 'Mark it ready on the live board first.' },
  WRONG_CANTEEN: { title: 'That order is for another canteen', hint: 'It cannot be collected here.' },
  PAYMENT_PENDING: { title: 'Payment not recorded yet', hint: 'Take the payment, record it below, then confirm collection.' },
};

export default function Pickup() {
  useDocumentTitle('Pickup scanner');
  const canteenId = useCanteenId();
  const toast = useToast();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lastDecode = useRef(0);
  const busyRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState(null);     // { order, requiresPayment, code }
  const [problem, setProblem] = useState(null);   // { code, message }
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState(null);         // the collected order
  const [showManual, setShowManual] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  // Always release the camera when leaving the page.
  useEffect(() => stopCamera, [stopCamera]);

  const handleCode = useCallback(async (code) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('verify');
    setProblem(null);
    try {
      const data = await api.verifyPickup(canteenId, code);
      setResult({ ...data, code });
      setDone(null);
      stopCamera();
    } catch (e) {
      const serverCode = e?.response?.data?.code;
      setProblem({ code: serverCode, message: errorMessage(e) });
      setResult(null);
    } finally {
      busyRef.current = false;
      setBusy('');
    }
  }, [canteenId, stopCamera]);

  // Decode loop: draw the current video frame to an offscreen canvas and hand the pixels to jsQR.
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    const now = Date.now();
    if (now - lastDecode.current < DECODE_INTERVAL_MS) return;
    lastDecode.current = now;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    const found = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
    if (found?.data) handleCode(found.data.trim());
  }, [handleCode]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setProblem(null);
    setResult(null);
    setDone(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser cannot use a camera. Use the order list below instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      lastDecode.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const name = e?.name || '';
      setCameraError(
        name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in your browser settings, or use the order list below.'
          : name === 'NotFoundError' ? 'No camera found on this device. Use the order list below.'
            : 'Could not start the camera. Use the order list below.'
      );
      setScanning(false);
    }
  }, [tick]);

  const recordPayment = async () => {
    if (!result?.order) return;
    setBusy('pay');
    try {
      await api.setPayment(canteenId, result.order._id, true);
      // Re-verify so the panel reflects what the server now believes.
      const data = await api.verifyPickup(canteenId, result.code);
      setResult({ ...data, code: result.code });
      toast.success('Payment recorded.', { title: orderRef(result.order._id) });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const collect = async (body, label) => {
    setBusy(label);
    try {
      const data = await api.collectPickup(canteenId, body);
      setDone(data.order);
      setResult(null);
      setProblem(null);
      toast.success(`${orderRef(data.order._id)} handed over.`, { title: 'Collected' });
    } catch (e) {
      const serverCode = e?.response?.data?.code;
      if (serverCode === 'PAYMENT_PENDING' && e.response.data.data?.order) {
        setResult({ order: e.response.data.data.order, requiresPayment: true, code: body.code });
      }
      setProblem({ code: serverCode, message: errorMessage(e) });
    } finally {
      setBusy('');
    }
  };

  const reset = () => { setResult(null); setProblem(null); setDone(null); };

  return (
    <div className="animate-rise-in max-w-5xl">
      <PageHeader
        title="Pickup scanner"
        description="Scan the code on the student's phone to check the order and hand it over. The server verifies every scan."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ---- camera ---- */}
        <Card className="p-4 space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-ink">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted aria-label="Camera preview" />
            <canvas ref={canvasRef} className="hidden" />
            {!scanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink text-white/80 p-6 text-center">
                <FiCamera className="h-9 w-9" aria-hidden />
                <p className="text-[13.5px]">The camera is off.</p>
              </div>
            ) : (
              <>
                {/* A plain frame: the scanner needs the code unobstructed. */}
                <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                <p className="absolute bottom-3 inset-x-0 text-center text-[12.5px] text-white/90">Hold the student&rsquo;s code inside the frame</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {scanning ? (
              <Button variant="secondary" icon={FiCameraOff} className="flex-1" onClick={stopCamera}>Stop camera</Button>
            ) : (
              <Button icon={FiCamera} className="flex-1" onClick={startCamera} loading={busy === 'verify'}>Start camera</Button>
            )}
            <Button variant="ghost" icon={FiList} onClick={() => setShowManual((v) => !v)}>
              {showManual ? 'Hide orders' : 'No camera?'}
            </Button>
          </div>
          {cameraError ? <Banner tone="warning">{cameraError}</Banner> : null}
          <p className="text-[12.5px] text-muted">
            Browsers only allow the camera on a secure connection — that means https, or localhost during development.
          </p>
        </Card>

        {/* ---- result ---- */}
        <div className="space-y-4">
          {done ? (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 shrink-0 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><FiCheckCircle className="h-6 w-6" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-[18px] text-ink">Collected</h2>
                  <p className="text-[13.5px] text-muted">{orderRef(done._id)} · {done.customer?.name} · {money(done.totalPrice)}</p>
                  <p className="text-[13px] text-muted mt-2">The student&rsquo;s app has already updated. The code cannot be used again.</p>
                </div>
              </div>
              <Button className="mt-4 w-full" icon={FiCamera} onClick={startCamera}>Scan the next order</Button>
            </Card>
          ) : null}

          {problem ? (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 shrink-0 rounded-full bg-red-50 text-red-700 flex items-center justify-center"><FiXCircle className="h-6 w-6" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-[17px] text-ink">{REASONS[problem.code]?.title || 'Could not verify that code'}</h2>
                  <p className="text-[13.5px] text-muted mt-0.5">{REASONS[problem.code]?.hint || problem.message}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" icon={FiRefreshCw} onClick={reset}>Clear</Button>
                <Button icon={FiCamera} onClick={startCamera}>Scan again</Button>
              </div>
            </Card>
          ) : null}

          {result?.order ? (
            <Card className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-[19px] text-ink tabular">{orderRef(result.order._id)}</h2>
                <StatusBadge status={result.order.status} long />
                {result.requiresPayment
                  ? <span className="rounded-full bg-saffron-100 px-2.5 py-1 text-[12px] font-bold text-saffron-700">Payment due</span>
                  : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-bold text-emerald-700">Paid</span>}
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <KeyValue label="Customer">{result.order.customer?.name || 'Student'}</KeyValue>
                <KeyValue label="Items">{result.order.itemCount}</KeyValue>
                <KeyValue label="Ready since">{result.order.readyAt ? formatTime(result.order.readyAt) : '—'}</KeyValue>
                <KeyValue label="Total">{money(result.order.totalPrice)}</KeyValue>
              </dl>

              <div className="rounded-xl border border-line divide-y divide-divider">
                {result.order.lines.map((l, i) => (
                  <div key={`${l.name}-${i}`} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink"><span className="tabular text-brand-700">{l.quantity}×</span> {l.name}</p>
                      <p className="tabular text-muted">{money(l.price * l.quantity)}</p>
                    </div>
                    {(l.selections || []).length ? (
                      <p className="text-[12.5px] text-muted mt-1">{l.selections.map((s) => `${s.groupName}: ${s.label}`).join(' · ')}</p>
                    ) : null}
                    {l.instructions ? (
                      <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-saffron-50 border border-saffron-200 px-2 py-1.5 text-[12.5px] text-ink">
                        <FiMessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-saffron-600" aria-hidden />
                        <span><span className="font-semibold">Note:</span> {l.instructions}</span>
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              {result.requiresPayment ? (
                <Banner tone="warning">
                  Take {money(result.order.totalPrice)} at the counter and record it before handing the order over.
                </Banner>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {result.requiresPayment ? (
                  <Button icon={FiCreditCard} loading={busy === 'pay'} disabled={!!busy} onClick={recordPayment}>
                    Record {money(result.order.totalPrice)} payment
                  </Button>
                ) : null}
                <Button
                  variant={result.requiresPayment ? 'secondary' : 'primary'}
                  icon={FiCheck}
                  loading={busy === 'collect'}
                  disabled={!!busy || result.requiresPayment}
                  onClick={() => collect({ code: result.code }, 'collect')}
                >
                  Confirm collection
                </Button>
                <Button variant="ghost" onClick={reset}>Cancel</Button>
              </div>
            </Card>
          ) : null}

          {!result && !problem && !done ? (
            <Card className="p-6">
              <EmptyState
                icon={FiCamera}
                title="Nothing scanned yet"
                message="Start the camera and point it at the pickup code in the student's app. You'll see the order here before anything is handed over."
              />
            </Card>
          ) : null}

          {showManual ? <ManualCollect canteenId={canteenId} busy={busy} onCollect={collect} /> : null}
        </div>
      </div>
    </div>
  );
}

// Fallback for when a camera isn't available. This is not a way round the QR: it is the same
// authority staff already have to complete one of their own orders, and the server applies
// exactly the same status and payment rules.
function ManualCollect({ canteenId, busy, onCollect }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.liveOrders(canteenId);
      setOrders((res.data || []).filter((o) => o.status === 'Ready'));
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [canteenId]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 20000);
  useRealtime(['order.created', 'order.updated'], load, { debounceMs: 400 });

  return (
    <Card className="p-5">
      <h3 className="font-bold text-[15px] mb-1">Collect without scanning</h3>
      <p className="text-[13px] text-muted mb-3">
        For when the camera is unavailable. Check the student&rsquo;s order number against the list before handing anything over.
      </p>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {!orders ? <SkeletonRows rows={3} /> : orders.length === 0 ? (
        <p className="text-[13.5px] text-muted">No orders are waiting to be collected.</p>
      ) : (
        <ul className="divide-y divide-divider">
          {orders.map((o) => (
            <li key={o._id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="font-extrabold tabular text-ink">{orderRef(o._id)}</span>
              <span className="text-[13.5px] text-muted flex-1 min-w-0 truncate">{o.customer?.name} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {money(o.totalPrice)}</span>
              {o.paymentStatus !== 'paid' ? (
                <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-[11.5px] font-bold text-saffron-700 inline-flex items-center gap-1">
                  <FiAlertCircle className="h-3 w-3" aria-hidden />Payment due
                </span>
              ) : null}
              <Button size="sm" variant="secondary" disabled={!!busy} loading={busy === `m${o._id}`} onClick={() => onCollect({ orderId: o._id }, `m${o._id}`)}>
                Collect
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
