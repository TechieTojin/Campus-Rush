import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiImage, FiRefreshCw, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { api, errorMessage, imageUrl } from '../../lib/api';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 2 * 1024 * 1024;

// value: server path ('' = none). onChange receives the stored path only after the upload succeeds.
// onBusyChange lets the parent block saving while an upload is in flight.
export default function ImageUpload({ value, onChange, label = 'Image', hint = 'JPG, PNG or WebP · up to 2 MB', aspect = 'aspect-[4/3]', onBusyChange, className = '' }) {
  const input = useRef(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file) => {
    if (!file) return;
    setError('');
    if (!TYPES.includes(file.type)) { setError('Choose a JPG, PNG or WebP image.'); return; }
    if (file.size > MAX) { setError(`That image is ${(file.size / 1048576).toFixed(1)} MB — the limit is 2 MB.`); return; }
    const local = URL.createObjectURL(file);
    setPreview(local);
    setProgress(0);
    onBusyChange?.(true);
    try {
      const res = await api.uploadImage(file, setProgress);
      onChange(res.url);
      setPreview('');
    } catch (e) {
      setError(`Upload failed: ${errorMessage(e)}`);
      setPreview('');
    } finally {
      setProgress(null);
      onBusyChange?.(false);
      if (input.current) input.current.value = '';
    }
  };

  const shown = preview || imageUrl(value);
  const uploading = progress !== null;

  return (
    <div className={className}>
      <p className="label">{label}</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
        className={`relative ${aspect} w-full rounded-2xl border-2 border-dashed overflow-hidden transition-colors ${dragging ? 'border-brand-500 bg-brand-50' : error ? 'border-red-300 bg-red-50/40' : 'border-line bg-canvas'}`}
      >
        {shown ? (
          <>
            <img src={shown} alt="Selected item" className={`absolute inset-0 h-full w-full object-cover ${uploading ? 'opacity-60' : ''}`} />
            {!uploading ? (
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button type="button" onClick={() => input.current?.click()} className="h-8 px-2.5 rounded-lg bg-white/95 text-ink text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow hover:bg-white">
                  <FiRefreshCw className="h-3.5 w-3.5" aria-hidden /> Replace
                </button>
                <button type="button" onClick={() => { onChange(''); setError(''); }} className="h-8 px-2.5 rounded-lg bg-white/95 text-red-700 text-[12.5px] font-semibold inline-flex items-center gap-1.5 shadow hover:bg-white">
                  <FiTrash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              </div>
            ) : null}
            {value && !uploading ? (
              <span className="absolute top-2 left-2 h-6 px-2 rounded-md bg-emerald-600 text-white text-[11.5px] font-semibold inline-flex items-center gap-1"><FiCheck className="h-3 w-3" aria-hidden /> Saved to server</span>
            ) : null}
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4 hover:bg-brand-50/50 transition-colors">
            <span className="h-11 w-11 rounded-xl bg-white border border-line flex items-center justify-center text-brand-600 shadow-sm">
              <FiUploadCloud className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-semibold text-ink">Click to upload or drag an image here</span>
            <span className="text-[12.5px] text-muted">{hint}</span>
          </button>
        )}
        {uploading ? (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink/70 to-transparent" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-white text-[12.5px] font-semibold mb-1.5"><span>Uploading…</span><span className="tabular">{progress}%</span></div>
            <div className="h-1.5 rounded-full bg-white/30 overflow-hidden"><div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        ) : null}
      </div>
      <input ref={input} type="file" accept={TYPES.join(',')} className="sr-only" tabIndex={-1} aria-label={`Upload ${label.toLowerCase()}`} onChange={(e) => pick(e.target.files?.[0])} />
      {error ? <p className="text-[12.5px] text-red-600 mt-1.5" role="alert">{error}</p> : !shown ? null : <p className="text-[12.5px] text-muted mt-1.5 flex items-center gap-1"><FiImage className="h-3.5 w-3.5" aria-hidden />{hint}</p>}
    </div>
  );
}
