import { RatioPie } from '@/components/RatioPie';
import { formatMinuteCount } from '@/lib/dates';

type Props = {
  breastCount: number;
  bottleCount: number;
  otherCount: number;
  feedingMinutes: number;
  bottleMl: number;
};

function recapLine(parts: string[]): string {
  return parts.length > 0 ? parts.join(' · ') : 'Pas encore de repas';
}

export function MealPie({ breastCount, bottleCount, otherCount, feedingMinutes, bottleMl }: Props) {
  const totalMeals = breastCount + bottleCount + otherCount;
  const recap: string[] = [];
  if (breastCount > 0) recap.push(`${breastCount} sein`);
  if (bottleCount > 0) recap.push(`${bottleCount} biberon`);
  if (otherCount > 0) recap.push(`${otherCount} autre${otherCount > 1 ? 's' : ''}`);
  if (feedingMinutes > 0) recap.push(formatMinuteCount(feedingMinutes));
  if (bottleMl > 0) recap.push(`${bottleMl} ml`);

  return (
    <RatioPie
      slices={[
        { key: 'breast', label: 'Sein', value: breastCount, color: 'var(--primary)', legendClass: 'leg-breast' },
        { key: 'bottle', label: 'Biberon', value: bottleCount, color: 'var(--accent, #c45)', legendClass: 'leg-bottle' },
        { key: 'other', label: 'Autre', value: otherCount, color: '#c9a227', legendClass: 'leg-other' },
      ]}
      centerValue={totalMeals}
      centerLabel="repas"
      detail={recapLine(recap)}
    />
  );
}
