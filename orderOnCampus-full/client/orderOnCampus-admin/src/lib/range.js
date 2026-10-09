import { dayKeyOffset, todayKey } from './format';

export const PRESETS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];

// Returns { from, to, invalid } for a preset/custom range (India time day keys).
export const resolveRange = (preset, custom) => {
  const today = todayKey();
  if (preset === 'custom') return { ...custom, invalid: !custom.from || !custom.to || custom.from > custom.to };
  return { from: dayKeyOffset(today, -(Number(preset) - 1)), to: today, invalid: false };
};
