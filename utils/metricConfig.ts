export type MetricType = 'reps' | 'time' | 'distance_weight' | 'cardio' | 'hybrid';

export type FieldConfig = {
  key: 'reps' | 'weight' | 'duration' | 'distance';
  label: string;
  isTimeInput?: boolean;
};

export type MetricConfig = {
  fields: FieldConfig[];
  hasDistanceUnit: boolean;
  unitOptions: string[];
  autoCompleteWhen: string[]; // all must be non-empty to auto-complete the set
};

export function getMetricConfig(metricType: string): MetricConfig {
  switch (metricType) {
    case 'time':
      return {
        fields: [{ key: 'duration', label: 'Time (MM:SS)', isTimeInput: true }],
        hasDistanceUnit: false,
        unitOptions: [],
        autoCompleteWhen: ['duration'],
      };

    case 'distance_weight':
      return {
        fields: [
          { key: 'distance', label: 'Dist' },
          { key: 'weight', label: 'Lbs' },
        ],
        hasDistanceUnit: true,
        unitOptions: ['miles', 'meters', 'feet', 'km'],
        autoCompleteWhen: ['distance', 'weight'],
      };

    case 'cardio':
      return {
        fields: [
          { key: 'distance', label: 'Dist' },
          { key: 'duration', label: 'Time (MM:SS)', isTimeInput: true },
        ],
        hasDistanceUnit: true,
        unitOptions: ['miles', 'meters', 'feet', 'floors', 'km'],
        autoCompleteWhen: ['distance', 'duration'],
      };

    case 'hybrid':
      return {
        fields: [
          { key: 'reps', label: 'Reps' },
          { key: 'duration', label: 'Time (MM:SS)', isTimeInput: true },
        ],
        hasDistanceUnit: false,
        unitOptions: [],
        autoCompleteWhen: [], // either field alone is valid
      };

    case 'reps':
    default:
      return {
        fields: [
          { key: 'reps', label: 'Reps' },
          { key: 'weight', label: 'Lbs' },
        ],
        hasDistanceUnit: false,
        unitOptions: [],
        autoCompleteWhen: ['reps', 'weight'],
      };
  }
}

// Clock-style input formatter — digits fill right to left, always MM:SS
// "4" → "00:04", "145" → "01:45", "1000" → "10:00", capped at 99:59
export function formatTimeInput(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  const padded = digits.slice(-4).padStart(4, '0');
  const mm = Math.min(parseInt(padded.slice(0, 2), 10), 99);
  const ss = Math.min(parseInt(padded.slice(2, 4), 10), 59);
  const formatted = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return formatted === '00:00' ? '' : formatted;
}

// "05:30" → 330 seconds
export function mmssToSeconds(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const parts = value.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  return null;
}

// 330 → "05:30"
export function secondsToMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
