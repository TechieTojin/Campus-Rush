import { FiAlertCircle, FiChevronDown, FiChevronUp, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button, { IconButton } from './ui/Button';
import { Badge } from './ui/Display';
import { TextInput, Toggle } from './ui/Form';
import { money } from '../lib/format';
import { emptyGroup, emptyOption, LIMITS, priceRange } from '../lib/customisation';

// Editor for a dish's customisation groups (Size, Toppings, Spice level…).
//
// Keys are generated once and then left alone: a key is what ties a student's existing cart line
// — and every past order — to this option, so renaming "Large" must never mint a new one.
export default function CustomisationEditor({ groups, onChange, errors = {}, showErrors }) {
  const set = (gi, patch) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setOption = (gi, oi, patch) => set(gi, { options: groups[gi].options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) });
  const move = (list, from, to) => {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };
  const err = (key) => (showErrors ? errors[key] : '');

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-canvas p-6 text-center">
          <p className="font-semibold text-ink">No choices on this dish yet</p>
          <p className="text-[13px] text-muted mt-1 max-w-md mx-auto">
            Add a group when students need to pick something — a size, a spice level, extra toppings.
            Options can add to the price, and a required group means an order cannot be placed without a choice.
          </p>
          <Button variant="secondary" icon={FiPlus} className="mt-4" onClick={() => onChange([emptyGroup()])}>
            Add a choice group
          </Button>
        </div>
      ) : null}

      {groups.map((group, gi) => {
        const groupError = err(`g${gi}`);
        return (
          <div key={group.key} className={`rounded-xl border bg-surface ${groupError ? 'border-red-300' : 'border-line'}`}>
            <div className="flex items-start gap-3 p-4 border-b border-divider">
              <div className="flex flex-col gap-1 pt-1">
                <IconButton icon={FiChevronUp} size="icon-sm" label="Move group up" disabled={gi === 0} onClick={() => onChange(move(groups, gi, gi - 1))} />
                <IconButton icon={FiChevronDown} size="icon-sm" label="Move group down" disabled={gi === groups.length - 1} onClick={() => onChange(move(groups, gi, gi + 1))} />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <TextInput
                  label="Group name"
                  placeholder="e.g. Size"
                  value={group.name}
                  onChange={(e) => set(gi, { name: e.target.value })}
                  error={groupError}
                  maxLength={LIMITS.name}
                />
                <TextInput
                  label="Helper text"
                  optional
                  placeholder="Shown under the group name in the app"
                  value={group.description}
                  onChange={(e) => set(gi, { description: e.target.value })}
                  maxLength={LIMITS.description}
                />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Toggle
                    size="sm"
                    checked={!!group.required}
                    onChange={(v) => set(gi, { required: v, min: v && group.multiple ? Math.max(1, Number(group.min) || 1) : group.min })}
                    label="Required"
                    description="Students must choose before ordering"
                  />
                  <Toggle
                    size="sm"
                    checked={!!group.multiple}
                    onChange={(v) => set(gi, { multiple: v, min: v ? (group.required ? 1 : 0) : 0, max: v ? Math.max(1, group.options.length) : 1 })}
                    label="Allow several"
                    description={group.multiple ? 'Students can pick more than one' : 'Students pick exactly one'}
                  />
                  <Toggle
                    size="sm"
                    checked={group.active !== false}
                    onChange={(v) => set(gi, { active: v })}
                    label="Shown in the app"
                    description={group.active === false ? 'Hidden from students' : 'Visible to students'}
                  />
                </div>
                {group.multiple ? (
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    <TextInput label="Choose at least" type="number" min="0" max={group.options.length} value={group.min} onChange={(e) => set(gi, { min: e.target.value })} />
                    <TextInput label="Up to" type="number" min="1" max={group.options.length} value={group.max} onChange={(e) => set(gi, { max: e.target.value })} />
                  </div>
                ) : null}
              </div>
              <IconButton icon={FiTrash2} variant="danger-soft" size="icon-sm" label={`Remove the ${group.name || 'unnamed'} group`} onClick={() => onChange(groups.filter((_, i) => i !== gi))} />
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wide text-faint">Options</p>
                <span className="text-[12px] text-muted">{group.options.length}/{LIMITS.options}</span>
              </div>
              {group.options.map((option, oi) => {
                const optionError = err(`g${gi}o${oi}`);
                return (
                  <div key={option.key} className="flex flex-wrap items-end gap-2 rounded-lg bg-canvas p-2.5">
                    <div className="flex flex-col gap-0.5">
                      <IconButton icon={FiChevronUp} size="icon-sm" label="Move option up" disabled={oi === 0} onClick={() => set(gi, { options: move(group.options, oi, oi - 1) })} />
                      <IconButton icon={FiChevronDown} size="icon-sm" label="Move option down" disabled={oi === group.options.length - 1} onClick={() => set(gi, { options: move(group.options, oi, oi + 1) })} />
                    </div>
                    <TextInput
                      className="flex-1 min-w-[150px]"
                      label={oi === 0 ? 'Label' : undefined}
                      placeholder="e.g. Large"
                      value={option.label}
                      onChange={(e) => setOption(gi, oi, { label: e.target.value })}
                      error={optionError}
                      maxLength={LIMITS.label}
                    />
                    <TextInput
                      className="w-32"
                      label={oi === 0 ? 'Extra charge' : undefined}
                      prefix="₹"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={option.priceDelta}
                      onChange={(e) => setOption(gi, oi, { priceDelta: e.target.value })}
                    />
                    <div className="pb-2.5">
                      <Toggle size="sm" checked={option.available !== false} onChange={(v) => setOption(gi, oi, { available: v })} label={option.available === false ? 'Sold out' : 'Available'} />
                    </div>
                    <div className="pb-1.5">
                      <IconButton
                        icon={FiTrash2}
                        variant="danger-soft"
                        size="icon-sm"
                        label={`Remove ${option.label || 'this option'}`}
                        disabled={group.options.length <= 1}
                        onClick={() => set(gi, { options: group.options.filter((_, j) => j !== oi) })}
                      />
                    </div>
                  </div>
                );
              })}
              {group.options.length < LIMITS.options ? (
                <Button variant="ghost" icon={FiPlus} onClick={() => set(gi, { options: [...group.options, emptyOption()] })}>Add option</Button>
              ) : null}
            </div>
          </div>
        );
      })}

      {groups.length > 0 && groups.length < LIMITS.groups ? (
        <Button variant="secondary" icon={FiPlus} onClick={() => onChange([...groups, emptyGroup()])}>Add another group</Button>
      ) : null}
    </div>
  );
}

// What a student will actually see, so staff can sanity-check before saving.
export function CustomisationPreview({ groups, basePrice }) {
  const live = groups.filter((g) => g.active !== false && (g.name || '').trim());
  if (!live.length) return null;
  const range = priceRange(groups, Number.isFinite(basePrice) ? basePrice : 0);
  const impossible = live.some((g) => g.required && !g.options.some((o) => o.available !== false));

  return (
    <div className="rounded-xl bg-canvas p-3 space-y-3">
      <p className="text-[12px] font-bold uppercase tracking-wide text-faint">What students choose</p>
      {live.map((g) => (
        <div key={g.key}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[13.5px] text-ink">{g.name.trim()}</span>
            {g.required ? <Badge tone="brand">Required</Badge> : <Badge>Optional</Badge>}
            <span className="text-[12px] text-muted">{g.multiple ? `up to ${g.max || 1}` : 'choose 1'}</span>
          </div>
          <p className="text-[12.5px] text-muted mt-0.5">
            {g.options.filter((o) => o.available !== false).map((o) => `${o.label.trim() || '—'}${Number(o.priceDelta) ? ` +${money(Number(o.priceDelta))}` : ''}`).join(' · ') || 'No available options'}
          </p>
        </div>
      ))}
      {Number.isFinite(basePrice) && basePrice > 0 ? (
        <p className="text-[12.5px] text-muted border-t border-divider pt-2">
          Students pay from <strong className="text-ink tabular">{money(range.from)}</strong>
          {range.varies ? <> up to <strong className="text-ink tabular">{money(range.to)}</strong></> : null}
        </p>
      ) : null}
      {impossible ? (
        <p className="flex items-start gap-1.5 text-[12.5px] text-red-600">
          <FiAlertCircle className="h-4 w-4 shrink-0 mt-px" aria-hidden />
          A required group has no available options, so this dish cannot be ordered.
        </p>
      ) : null}
    </div>
  );
}
