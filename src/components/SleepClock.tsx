import { Card } from '@/components/ui';
import type { SleepSession } from '@/db/types';
import { addLocalCoverage, formatMinuteCount } from '@/lib/dates';

const SLOTS = 96;
const CX = 100;
const CY = 108;
const R_OUT = 78;
const R_IN = 44;
const SLOT_MIN = (24 * 60) / SLOTS;

type Props = {
  sleeps: SleepSession[];
  now: number;
};

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function slotDeg(i: number) {
  return -90 + (i + 0.5) * (360 / SLOTS);
}

function polarAreaPath(values: number[], max: number): string {
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const t = max > 0 ? values[i] / max : 0;
    const r = t <= 0 ? R_IN : R_IN + (R_OUT - R_IN) * Math.pow(t, 0.72);
    const o = polar(r, slotDeg(i));
    const inn = polar(R_IN, slotDeg(i));
    outer.push(`${o.x.toFixed(2)} ${o.y.toFixed(2)}`);
    inner.push(`${inn.x.toFixed(2)} ${inn.y.toFixed(2)}`);
  }
  inner.reverse();
  return `M${outer.join(' L')} Z M${inner.join(' L')} Z`;
}

function peakHint(values: number[]): string | null {
  const max = Math.max(...values);
  if (max <= 0) return null;
  const n = values.length;
  const threshold = max * 0.72;
  let bestStart = 0;
  let bestLen = 0;
  let i = 0;
  while (i < n * 2) {
    if (values[i % n] < threshold) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < n * 2 && values[j % n] >= threshold && j - i < n) j += 1;
    const len = j - i;
    if (len > bestLen) {
      bestLen = len;
      bestStart = i % n;
    }
    i = j;
  }
  const startH = Math.floor((bestStart * SLOT_MIN) / 60);
  const endH = Math.ceil(((bestStart + bestLen) * SLOT_MIN) / 60) % 24;
  if (bestLen <= 4) return `Plus longues vers ${startH} h`;
  return `Plus longues entre ${startH} h et ${endH === 0 ? 24 : endH} h`;
}

export function SleepClock({ sleeps, now }: Props) {
  const values = Array.from({ length: SLOTS }, () => 0);
  for (const row of sleeps) {
    addLocalCoverage(values, row.startedAt, row.endedAt, now);
  }
  const max = Math.max(0, ...values);
  const napCount = sleeps.length;
  const sleepMin = sleeps.reduce((sum, row) => {
    const end = row.endedAt ? new Date(row.endedAt).getTime() : now;
    return sum + Math.max(0, end - new Date(row.startedAt).getTime());
  }, 0);
  const hint = peakHint(values);
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
              aria-label="Cadran 24 heures des siestes les plus longues">
              <defs>
                <radialGradient id="sleep-clock-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="42%" stopColor="#a8b6d4" />
                  <stop offset="100%" stopColor="#3d4f73" />
                </radialGradient>
              </defs>
              <circle
                cx={CX}
                cy={CY}
                r={R_OUT}
                fill="none"
                stroke="var(--border)"
                strokeWidth="1"
              />
              {max > 0 ? (
                <path
                  d={polarAreaPath(values, max)}
                  fill="url(#sleep-clock-grad)"
                  fillRule="evenodd"
                />
              ) : null}
              <circle cx={CX} cy={CY} r={R_IN} fill="var(--surface)" />
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
            <span>Court</span>
            <span className="sleep-clock-scale-bar" />
            <span>Longues</span>
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
