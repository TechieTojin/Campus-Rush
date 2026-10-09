import { Segmented, TextInput } from './ui/Form';
import { todayKey } from '../lib/format';
import { PRESETS } from '../lib/range';

export default function DateRange({ preset, onPreset, custom, onCustom }) {
  const today = todayKey();
  const invalid = preset === 'custom' && (!custom.from || !custom.to || custom.from > custom.to);
  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      <Segmented label="Date range" value={preset} onChange={onPreset} options={PRESETS} />
      {preset === 'custom' ? (
        <div className="flex gap-3">
          <TextInput label="From" type="date" value={custom.from} max={custom.to || today} onChange={(e) => onCustom({ ...custom, from: e.target.value })} />
          <TextInput label="To" type="date" value={custom.to} min={custom.from} max={today} onChange={(e) => onCustom({ ...custom, to: e.target.value })} error={invalid ? 'Check the dates' : ''} />
        </div>
      ) : null}
    </div>
  );
}
