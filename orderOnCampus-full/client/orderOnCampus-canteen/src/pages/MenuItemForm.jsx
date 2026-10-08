import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiPlus, FiSmartphone } from 'react-icons/fi';
import Button from '../components/ui/Button';
import { Badge, Card, PageHeader, Thumb } from '../components/ui/Display';
import { Banner, ErrorState, SkeletonRows } from '../components/ui/Feedback';
import { Select, TextArea, TextInput, Toggle } from '../components/ui/Form';
import ImageUpload from '../components/ui/ImageUpload';
import { ConfirmDialog } from '../components/ui/Overlay';
import { api, errorMessage } from '../lib/api';
import { useDocumentTitle, useUnsavedWarning } from '../lib/hooks';
import { money } from '../lib/format';
import { useSession } from '../lib/sessionContext';
import { useToast } from '../components/ui/useToast';
import { DIETARY } from '../lib/constants';

const FIX_FIELDS = 'Fix the highlighted fields and try again.';
const EMPTY = { name: '', description: '', price: '', category: '', image: '', available: true, prepTime: '', dietary: '' };

const validate = (f) => {
  const e = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = 'Enter an item name (at least 2 characters)';
  else if (name.length > 80) e.name = 'Keep the name under 80 characters';
  const price = Number(f.price);
  if (f.price === '' || f.price === null) e.price = 'Enter a price';
  else if (!Number.isFinite(price) || price <= 0) e.price = 'Price must be more than ₹0';
  else if (price > 100000) e.price = 'Price looks too high';
  else if (Math.abs(Math.round(price * 100) - price * 100) > 1e-6) e.price = 'Use at most 2 decimal places';
  if (f.prepTime !== '' && (!Number.isInteger(Number(f.prepTime)) || Number(f.prepTime) < 1 || Number(f.prepTime) > 240)) e.prepTime = 'Whole minutes between 1 and 240';
  if (f.description.length > 500) e.description = 'Keep the description under 500 characters';
  return e;
};

const toBody = (f) => ({
  name: f.name.trim(),
  description: f.description.trim(),
  price: Number(f.price),
  category: f.category,
  image: f.image,
  available: f.available,
  prepTime: f.prepTime === '' ? null : Number(f.prepTime),
  dietary: f.dietary,
});

export default function MenuItemForm() {
  const { itemId } = useParams();
  const editing = !!itemId;
  useDocumentTitle(editing ? 'Edit menu item' : 'Add menu item');
  const { canteen } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const nameRef = useRef(null);
  const saving = useRef(false);

  const [form, setForm] = useState(EMPTY);
  const [original, setOriginal] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [touched, setTouched] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [menu, item] = await Promise.all([api.menu(canteen._id), editing ? api.menuItem(canteen._id, itemId) : null]);
        if (!alive) return;
        setCategories(menu.categories || []);
        const initial = item
          ? { name: item.name, description: item.description || '', price: String(item.price), category: item.category || '', image: item.image || '', available: item.available !== false, prepTime: item.prepTime ? String(item.prepTime) : '', dietary: item.dietary || '' }
          : EMPTY;
        setForm(initial);
        setOriginal(initial);
        setLoadError('');
      } catch (e) {
        if (alive) setLoadError(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [canteen._id, itemId, editing]);

  const errors = useMemo(() => validate(form), [form]);
  const dirty = JSON.stringify(form) !== JSON.stringify(original);
  useUnsavedWarning(dirty && !submitting);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? v.target.value : v }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const show = (k) => (touched[k] || touched.all ? errors[k] : '');

  const submit = async (mode) => {
    setTouched({ all: true });
    if (Object.keys(errors).length) {
      setSubmitError(FIX_FIELDS);
      return;
    }
    if (saving.current || uploading) return;
    saving.current = true;
    setSubmitting(mode);
    setSubmitError('');
    try {
      const body = toBody(form);
      if (editing) {
        await api.updateItem(canteen._id, itemId, body);
        toast.success(`${body.name} saved. Students see the change next time they open or refresh your menu.`, { title: 'Item updated' });
        setOriginal(form);
        navigate('/menu');
      } else {
        const created = await api.createItem(canteen._id, body);
        toast.success(`${created.name} is on your menu at ${money(created.price)}.`, { title: 'Item added' });
        if (mode === 'another') {
          setForm({ ...EMPTY, category: form.category });
          setOriginal({ ...EMPTY, category: form.category });
          setTouched({});
          nameRef.current?.focus();
        } else {
          setOriginal(form);
          navigate('/menu');
        }
      }
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      saving.current = false;
      setSubmitting(null);
    }
  };

  const cancel = () => (dirty ? setLeaving(true) : navigate('/menu'));

  if (loading) return <Card className="p-6 max-w-5xl"><SkeletonRows rows={6} /></Card>;
  if (loadError) return <ErrorState message={loadError} onRetry={() => navigate(0)} />;

  const price = Number(form.price);
  return (
    <div className="animate-rise-in max-w-6xl">
      <PageHeader
        back={<Link to="/menu" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink mb-3"><FiArrowLeft className="h-4 w-4" aria-hidden />Back to menu</Link>}
        title={editing ? `Edit ${original.name || 'menu item'}` : 'Add a new menu item'}
        description={editing ? 'Changes apply to new orders only — past orders keep the name and price they were placed with.' : 'Saved items appear in the student app straight away.'}
      />

      <form onSubmit={(e) => { e.preventDefault(); submit('save'); }} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {submitError && !(submitError === FIX_FIELDS && !Object.keys(errors).length) ? <Banner tone="danger">{submitError}</Banner> : null}
            <Card className="p-5 sm:p-6 space-y-5">
              <h2 className="font-bold text-[16px]">Item details</h2>
              <TextInput ref={nameRef} label="Item name" placeholder="e.g. Campus Special Sandwich" value={form.name} onChange={set('name')} onBlur={blur('name')} error={show('name')} maxLength={80} required autoFocus={!editing} />
              <TextArea label="Description" optional placeholder="What's in it? Students see this on the item page." value={form.description} onChange={set('description')} onBlur={blur('description')} error={show('description')} maxLength={500} rows={3} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput label="Price" prefix="₹" type="number" inputMode="decimal" min="1" step="0.5" placeholder="0" value={form.price} onChange={set('price')} onBlur={blur('price')} error={show('price')} hint="Students pay this at the counter" required />
                <Select label="Category" value={form.category} onChange={set('category')} hint={categories.length ? undefined : 'No categories yet'}>
                  <option value="">Uncategorised</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              {!categories.length ? <p className="text-[13px] text-muted -mt-2">Group your menu (e.g. Breakfast, Beverages) on the <Link to="/categories" className="font-semibold text-brand-700 hover:underline">Categories page</Link>.</p> : null}
            </Card>

            <Card className="p-5 sm:p-6 space-y-5">
              <h2 className="font-bold text-[16px]">Preparation & dietary</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput label="Preparation time" optional type="number" min="1" max="240" step="1" suffix="minutes" value={form.prepTime} onChange={set('prepTime')} onBlur={blur('prepTime')} error={show('prepTime')} />
                <Select label="Dietary" optional value={form.dietary} onChange={set('dietary')}>
                  <option value="">Not specified</option>
                  {Object.entries(DIETARY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <Toggle
                checked={form.available}
                onChange={set('available')}
                label={form.available ? 'Available to order' : 'Unavailable (sold out)'}
                description={form.available ? 'Students can add this item to their cart.' : 'Shown as sold out in the app; it cannot be ordered.'}
              />
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <ImageUpload label="Food photo" value={form.image} onChange={set('image')} onBusyChange={setUploading} />
            </Card>
            <Card className="p-5">
              <p className="text-[12px] font-bold uppercase tracking-wide text-faint mb-3 flex items-center gap-1.5"><FiSmartphone className="h-3.5 w-3.5" aria-hidden />Student app preview</p>
              <div className="flex gap-3 rounded-xl bg-canvas p-3">
                <Thumb src={form.image} name={form.name || '?'} className="h-16 w-16" dimmed={!form.available} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink truncate">{form.name.trim() || 'Item name'}</p>
                  <p className="text-[12.5px] text-muted line-clamp-2">{form.description.trim() || 'Description'}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-extrabold text-ink tabular">{Number.isFinite(price) && price > 0 ? money(price) : '₹—'}</span>
                    {form.available ? <Badge tone="brand">ADD +</Badge> : <Badge tone="danger">Sold out</Badge>}
                  </div>
                </div>
              </div>
              {form.category ? <p className="text-[12.5px] text-muted mt-2">Listed under <strong className="text-ink">{form.category}</strong></p> : null}
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-canvas/90 backdrop-blur border-t border-line flex flex-wrap items-center gap-2 justify-end">
          {uploading ? <span className="text-[13px] text-muted mr-auto">Waiting for the image upload to finish…</span> : dirty ? <span className="text-[13px] text-muted mr-auto">Unsaved changes</span> : null}
          <Button variant="ghost" onClick={cancel} disabled={!!submitting}>Cancel</Button>
          {!editing ? <Button variant="secondary" icon={FiPlus} onClick={() => submit('another')} loading={submitting === 'another'} disabled={!!submitting || uploading}>Save & add another</Button> : null}
          <Button type="submit" icon={FiCheck} loading={submitting === 'save'} disabled={!!submitting || uploading}>{editing ? 'Save changes' : 'Save item'}</Button>
        </div>
      </form>

      <ConfirmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={() => { setOriginal(form); navigate('/menu'); }}
        title="Discard unsaved changes?"
        confirmLabel="Discard"
        message="You'll lose what you've entered on this page."
      />
    </div>
  );
}
