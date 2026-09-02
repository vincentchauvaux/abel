import { Card } from '@/components/ui';
import type { Measurement } from '@/db/types';
import { formatDate, formatDateTime, localDateKey } from '@/lib/dates';
import { computeImc, formatImc, imcLevel, imcLevelClass, imcToneLabel } from '@/lib/imc';

type Props = {
  weights: Measurement[];
  heights: Measurement[];
  bornOn?: string | null;
};

const W = 320;
const H = 96;
const PAD_L = 36;
const PAD_R = 10;
const PAD_T = 8;
const PAD_B = 8;

function byTimeAsc(rows: Measurement[]): Measurement[] {
  return [...rows].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

function niceRange(values: number[]): { min: number; max: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1 };
  const span = hi - lo;
  const pad = span === 0 ? Math.max(0.25, Math.abs(lo) * 0.06) : span * 0.18;
  return { min: Math.max(0, lo - pad), max: hi + pad };
}

function xAt(iso: string, tMin: number, tMax: number): number {
  const t = new Date(iso).getTime();
  if (tMax <= tMin) return PAD_L + (W - PAD_L - PAD_R) / 2;
  return PAD_L + ((t - tMin) / (tMax - tMin)) * (W - PAD_L - PAD_R);
}

function yAt(value: number, min: number, max: number): number {
  if (max <= min) return PAD_T + (H - PAD_T - PAD_B) / 2;
  const plotH = H - PAD_T - PAD_B;
  return PAD_T + (1 - (value - min) / (max - min)) * plotH;
}

function ticks(min: number, max: number): number[] {
  if (max <= min) return [min];
  const raw = [min, (min + max) / 2, max];
  const seen = new Set<string>();
  const out: number[] = [];
  for (const n of raw) {
    const key = fmtTick(n);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function fmtTick(n: number): string {
  const rounded = Math.abs(n) >= 10 ? n.toFixed(0) : n.toFixed(1);
  return rounded.replace('.', ',');
}

function SeriesChart({
  rows,
  tMin,
  tMax,
  tone,
  unit,
}: {
  rows: Measurement[];
  tMin: number;
  tMax: number;
  tone: 'weight' | 'height';
  unit: string;
}) {
  if (rows.length === 0) return null;
  const range = niceRange(rows.map((row) => row.value));
  const points = rows
    .map((row) => `${xAt(row.measuredAt, tMin, tMax).toFixed(1)},${yAt(row.value, range.min, range.max).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="growth-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Courbe ${unit}`}>
      {ticks(range.min, range.max).map((tick) => {
        const y = yAt(tick, range.min, range.max);
        return (
          <g key={`${tone}-${tick}`}>
            <line className="growth-grid" x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} />
            <text className="growth-axis growth-axis-left" x={PAD_L - 4} y={y + 3}>
              {fmtTick(tick)}
            </text>
          </g>
        );
      })}
      {rows.length >= 2 ? (
        <polyline className={`growth-line growth-line-${tone}`} fill="none" points={points} />
      ) : null}
      {rows.map((row) => (
        <circle
          key={row.id}
          className={`growth-dot growth-dot-${tone}`}
          cx={xAt(row.measuredAt, tMin, tMax)}
          cy={yAt(row.value, range.min, range.max)}
          r="4"
        />
      ))}
    </svg>
  );
}

export function GrowthChart({ weights, heights, bornOn }: Props) {
  const weightPts = byTimeAsc(weights);
  const heightPts = byTimeAsc(heights);
  if (weightPts.length + heightPts.length < 2 && !(weightPts.length >= 1 && heightPts.length >= 1)) {
    return null;
  }

  const allTimes = [...weightPts, ...heightPts].map((row) => new Date(row.measuredAt).getTime());
  const tMin = Math.min(...allTimes);
  const tMax = Math.max(...allTimes);

  const lastW = [...weights].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const lastH = [...heights].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const imc = lastW && lastH ? computeImc(lastW.value, lastH.value) : null;
  const imcAt =
    lastW && lastH ? new Date(lastW.measuredAt > lastH.measuredAt ? lastW.measuredAt : lastH.measuredAt) : new Date();
  const level = imc != null ? imcLevel(imc, bornOn, imcAt) : null;
  const sameDay = lastW && lastH && localDateKey(lastW.measuredAt) === localDateKey(lastH.measuredAt);

  const uniqDays = [...new Set([...weightPts, ...heightPts].map((row) => localDateKey(row.measuredAt)))].sort();
  const labelDays =
    uniqDays.length <= 4
      ? uniqDays
      : [uniqDays[0], uniqDays[Math.floor(uniqDays.length / 2)], uniqDays[uniqDays.length - 1]];

  return (
    <Card>
      <h2>Poids et taille</h2>
      {weightPts.length > 0 ? (
        <>
          <p className="growth-series-label growth-leg-weight">Poids (kg)</p>
          <SeriesChart rows={weightPts} tMin={tMin} tMax={tMax} tone="weight" unit="kg" />
        </>
      ) : null}
      {heightPts.length > 0 ? (
        <>
          <p className="growth-series-label growth-leg-height">Taille (cm)</p>
          <SeriesChart rows={heightPts} tMin={tMin} tMax={tMax} tone="height" unit="cm" />
        </>
      ) : null}
      <p className="muted growth-x-caption">{labelDays.map((day) => formatDate(`${day}T12:00:00`)).join(' → ')}</p>
      {imc != null && level ? (
        <div className="growth-imc">
          <p className={imcLevelClass(level)}>
            IMC {formatImc(imc)} · {imcToneLabel(imc, level, bornOn, imcAt)}
          </p>
          <p className="muted growth-imc-note">
            Indicatif, pas un avis médical
            {lastW && lastH
              ? ` · ${sameDay ? formatDate(lastW.measuredAt) : `${formatDateTime(lastW.measuredAt)} / ${formatDateTime(lastH.measuredAt)}`}`
              : ''}
          </p>
        </div>
      ) : lastW || lastH ? (
        <p className="muted">Ajoute poids et taille pour afficher l’IMC.</p>
      ) : null}
    </Card>
  );
}
