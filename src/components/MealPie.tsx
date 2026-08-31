import { formatMinuteCount } from '@/lib/dates';

type Props = {
  breastCount: number;
  bottleCount: number;
  otherCount: number;
  feedingMinutes: number;
  bottleMl: number;
};

function pieGradient(breast: number, bottle: number, other: number): string {
  const total = breast + bottle + other;
  if (total <= 0) return 'var(--muted-bg)';
  const a = (breast / total) * 360;
  const b = a + (bottle / total) * 360;
  if (other <= 0) {
    if (bottle <= 0) return 'var(--primary)';
    if (breast <= 0) return 'var(--accent, #c45)';
    return `conic-gradient(var(--primary) 0deg ${a}deg, var(--accent, #c45) ${a}deg 360deg)`;
  }
  return `conic-gradient(var(--primary) 0deg ${a}deg, var(--accent, #c45) ${a}deg ${b}deg, #c9a227 ${b}deg 360deg)`;
}

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
    <div className="meal-pie-wrap">
      <div className="meal-pie-chart">
        <div
          className="meal-pie"
          style={{ background: pieGradient(breastCount, bottleCount, otherCount) }}
          aria-hidden
        />
        <div className="meal-pie-center">
          <b>{totalMeals}</b>
          <span className="muted">repas</span>
        </div>
      </div>
      {(breastCount > 0 || bottleCount > 0 || otherCount > 0) && (
        <div className="meal-pie-legend">
          {breastCount > 0 ? <span className="leg-breast">Sein</span> : null}
          {bottleCount > 0 ? <span className="leg-bottle">Biberon</span> : null}
          {otherCount > 0 ? <span className="leg-other">Autre</span> : null}
        </div>
      )}
      <p className="muted meal-pie-detail">{recapLine(recap)}</p>
    </div>
  );
}
