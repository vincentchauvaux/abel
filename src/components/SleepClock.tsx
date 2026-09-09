import { Card } from '@/components/ui';
import type { SleepSession } from '@/db/types';
import { addLocalCoverage, formatMinuteCount } from '@/lib/dates';

const SLOTS = 48;
const CX = 100;
const CY = 108;
const R_OUT = 78;
const R_IN = 44;
const GAP = 0.35;

type Props = {
  sleeps: SleepSession[];
  now: number;
};

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function donutSlice(a0: number, a1: number): string {
  const large = (a1 - a0) % 360 > 180 ? 1 : 0;
  const p0 = polar(R_OUT, a0);
  const p1 = polar(R_OUT, a1);
  const p2 = polar(R_IN, a1);
  const p3 = polar(R_IN, a0);
  return `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A${R_OUT} ${R_OUT} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L${p2.x.toFixed(2)} ${p2.y.toFixed(2)} A${R_IN} ${R_IN} 0 ${large} 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} Z`;
}

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function sleepFill(count: number, max: number): string {
  if (count <= 0) return 'var(--muted-bg)';
  const t = Math.max(0.18, count / max);
  return `rgb(${mix(197, 61, t)},${mix(208, 79, t)},${mix(227, 115, t)})`;
}

function peakHint(counts: number[]): string | null {
  const max = Math.max(...counts);
  if (max <= 0) return null;
  const n = counts.length;
  let bestStart = 0;
  let bestLen = 0;
  let i = 0;
  while (i < n * 2) {
    if (counts[i % n] !== max) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < n * 2 && counts[j % n] === max && j - i < n) j += 1;
    const len = j - i;
    if (len > bestLen) {
      bestLen = len;
      bestStart = i % n;
    }
    i = j;
  }
  const startH = Math.floor((bestStart * 30) / 60);
  const endH = Math.ceil(((bestStart + bestLen) * 30) / 60) % 24;
  if (bestLen <= 2) return `Plus souvent vers ${startH} h`;
  return `Plus souvent entre ${startH} h et ${endH === 0 ? 24 : endH} h`;
}

export function SleepClock({ sleeps, now }: Props) {
  const counts = Array.from({ length: SLOTS }, () => 0);
  for (const row of sleeps) {
    addLocalCoverage(counts, row.startedAt, row.endedAt, now);
  }
  const max = Math.max(0, ...counts);
  const napCount = sleeps.length;
  const sleepMin = sleeps.reduce((sum, row) => {
    const end = row.endedAt ? new Date(row.endedAt).getTime() : now;
    return sum + Math.max(0, end - new Date(row.startedAt).getTime());
  }, 0);
  const hint = peakHint(counts);
  const hours = [0, 6, 12, 18];

  return (
    <Card>
      <h2>Heures de sieste</h2>
      {napCount === 0 ? (
        <p className="muted">Aucune sieste sur cette période.</p>
      ) : (
        <>
          <div className="sleep-clock">
            <svg
              className="sleep-clock-svg"
              viewBox="0 0 200 230"
              role="img"
              aria-label="Cadran 24 heures des siestes">
              {counts.map((count, i) => {
                const a0 = -90 + i * (360 / SLOTS) + GAP;
                const a1 = -90 + (i + 1) * (360 / SLOTS) - GAP;
                return <path key={i} d={donutSlice(a0, a1)} fill={sleepFill(count, max)} />;
              })}
              {hours.map((hour) => {
                const deg = -90 + hour * 15;
                const tick0 = polar(R_OUT + 2, deg);
                const tick1 = polar(R_OUT + 8, deg);
                const label = polar(R_OUT + 18, deg);
                return (
                  <g key={hour}>
                    <line
                      x1={tick0.x}
                      y1={tick0.y}
                      x2={tick1.x}
                      y2={tick1.y}
                      stroke="var(--text-muted)"
                      strokeWidth="1.5"
                    />
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="sleep-clock-hour">
                      {hour} h
                    </text>
                  </g>
                );
              })}
              <text x={CX} y={CY - 6} textAnchor="middle" className="sleep-clock-center-value">
                {napCount}
              </text>
              <text x={CX} y={CY + 10} textAnchor="middle" className="sleep-clock-center-label">
                sieste{napCount > 1 ? 's' : ''}
              </text>
            </svg>
          </div>
          <div className="sleep-clock-scale" aria-hidden>
            <span>Rare</span>
            <span className="sleep-clock-scale-bar" />
            <span>Fréquent</span>
          </div>
          <p className="muted pie-detail">
            {[sleepMin > 0 ? formatMinuteCount(Math.round(sleepMin / 60_000)) : null, hint]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
    </Card>
  );
}
