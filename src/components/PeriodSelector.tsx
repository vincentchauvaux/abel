import type { Period } from '@/lib/dates';

const OPTIONS: { key: Period; label: string; ariaLabel: string }[] = [
  { key: 'today', label: 'Jour', ariaLabel: "Aujourd'hui" },
  { key: '7d', label: '7 j', ariaLabel: '7 jours' },
  { key: '30d', label: '30 j', ariaLabel: '30 jours' },
  { key: 'all', label: 'Tout', ariaLabel: 'Tout' },
];

type Props = {
  value: Period;
  onChange: (period: Period) => void;
};

export function PeriodSelector({ value, onChange }: Props) {
  const index = Math.max(0, OPTIONS.findIndex((opt) => opt.key === value));

  return (
    <div className="period-selector" role="group" aria-label="Période affichée">
      <div className="period-selector-track">
        <div
          className="period-selector-thumb"
          style={{ '--index': index, '--count': OPTIONS.length } as React.CSSProperties}
          aria-hidden
        />
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`period-selector-btn ${value === opt.key ? 'on' : ''}`}
            onClick={() => onChange(opt.key)}
            aria-label={opt.ariaLabel}
            aria-pressed={value === opt.key}
            title={opt.ariaLabel}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
