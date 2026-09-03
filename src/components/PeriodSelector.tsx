import { SegmentedControl } from '@/components/SegmentedControl';
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
  return (
    <SegmentedControl
      className="period-selector"
      value={value}
      onChange={onChange}
      options={OPTIONS}
      ariaLabel="Période affichée"
    />
  );
}
