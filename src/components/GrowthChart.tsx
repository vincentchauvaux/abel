import { useLayoutEffect, useRef, useState } from 'react';

import { Card } from '@/components/ui';
import type { Measurement } from '@/db/types';
import { formatDate, formatDateTime, localDateKey } from '@/lib/dates';
import { computeImc, formatImc, imcLevel, imcLevelClass, imcToneLabel } from '@/lib/imc';

type Props = {
  weights: Measurement[];
  heights: Measurement[];
  bornOn?: string | null;
};

const PAD_L = 36;
const H = 96;
const PAD_T = 8;
const PAD_B = 8;
const VISIBLE_DAYS = 6;
const SLOT_MIN = 48;

function byTimeAsc(rows: Measurement[]): Measurement[] {
  return [...rows].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

function lastValueByDay(rows: Measurement[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of byTimeAsc(rows)) {
    map.set(localDateKey(row.measuredAt), row.value);
  }
  return map;
}

function niceRange(values: number[]): { min: number; max: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1 };
  const span = hi - lo;
  const pad = span === 0 ? Math.max(0.25, Math.abs(lo) * 0.06) : span * 0.18;
  return { min: Math.max(0, lo - pad), max: hi + pad };
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

function axisDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  const day = String(d.getDate());
  const month = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  return `${day}\n${month}`;
}

function xPos(index: number, slot: number): number {
  return (index + 0.5) * slot;
}

type Seg = { x1: number; y1: number; x2: number; y2: number };

function seriesSegments(values: (number | null)[], slot: number, min: number, max: number): { solid: Seg[]; dashed: Seg[] } {
  const solid: Seg[] = [];
  const dashed: Seg[] = [];
  let lastIdx = -1;
  let lastVal = 0;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value == null) continue;
    if (lastIdx >= 0) {
      const seg = {
        x1: xPos(lastIdx, slot),
        y1: yAt(lastVal, min, max),
        x2: xPos(i, slot),
        y2: yAt(value, min, max),
      };
      if (i === lastIdx + 1) solid.push(seg);
      else dashed.push(seg);
    }
    lastIdx = i;
    lastVal = value;
  }
  if (lastIdx >= 0 && lastIdx < values.length - 1) {
    const y = yAt(lastVal, min, max);
    dashed.push({
      x1: xPos(lastIdx, slot),
      y1: y,
      x2: xPos(values.length - 1, slot),
      y2: y,
    });
  }
  return { solid, dashed };
}

function YAxis({ min, max }: { min: number; max: number }) {
  return (
    <svg className="growth-y-svg" viewBox={`0 0 ${PAD_L} ${H}`} width={PAD_L} height={H} aria-hidden>
      {ticks(min, max).map((tick) => {
        const y = yAt(tick, min, max);
        return (
          <text key={tick} className="growth-axis growth-axis-left" x={PAD_L - 4} y={y + 3}>
            {fmtTick(tick)}
          </text>
        );
      })}
    </svg>
  );
}

function SeriesPlot({
  values,
  slot,
  tone,
  unit,
}: {
  values: (number | null)[];
  slot: number;
  tone: 'weight' | 'height';
  unit: string;
}) {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  const range = niceRange(present);
  const width = Math.max(slot * values.length, slot);
  const { solid, dashed } = seriesSegments(values, slot, range.min, range.max);
  return (
    <svg className="growth-plot" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`Courbe ${unit}`}>
      {ticks(range.min, range.max).map((tick) => {
        const y = yAt(tick, range.min, range.max);
        return <line key={`${tone}-${tick}`} className="growth-grid" x1={0} y1={y} x2={width} y2={y} />;
      })}
      {solid.map((seg, i) => (
        <line
          key={`s-${i}`}
          className={`growth-line growth-line-${tone}`}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
        />
      ))}
      {dashed.map((seg, i) => (
        <line
          key={`d-${i}`}
          className={`growth-line growth-line-dashed growth-line-${tone}`}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
        />
      ))}
      {values.map((value, i) =>
        value == null ? null : (
          <circle
            key={`${tone}-${i}`}
            className={`growth-dot growth-dot-${tone}`}
            cx={xPos(i, slot)}
            cy={yAt(value, range.min, range.max)}
            r="4"
          />
        ),
      )}
    </svg>
  );
}

export function GrowthChart({ weights, heights, bornOn }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState(SLOT_MIN);

  const weightPts = byTimeAsc(weights);
  const heightPts = byTimeAsc(heights);
  const days = [...new Set([...weightPts, ...heightPts].map((row) => localDateKey(row.measuredAt)))].sort();
  const weightByDay = lastValueByDay(weightPts);
  const heightByDay = lastValueByDay(heightPts);
  const weightValues = days.map((day) => weightByDay.get(day) ?? null);
  const heightValues = days.map((day) => heightByDay.get(day) ?? null);
  const hasWeight = weightValues.some((value) => value != null);
  const hasHeight = heightValues.some((value) => value != null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const plotW = Math.max(120, el.clientWidth - PAD_L);
      const next =
        days.length <= VISIBLE_DAYS ? plotW / Math.max(days.length, 1) : Math.max(SLOT_MIN, plotW / VISIBLE_DAYS);
      setSlot((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [days.length, hasWeight, hasHeight]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  }, [days.length, slot, hasWeight, hasHeight]);

  if (weightPts.length + heightPts.length < 2 && !(weightPts.length >= 1 && heightPts.length >= 1)) {
    return null;
  }

  const lastW = [...weights].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const lastH = [...heights].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const imc = lastW && lastH ? computeImc(lastW.value, lastH.value) : null;
  const imcAt =
    lastW && lastH ? new Date(lastW.measuredAt > lastH.measuredAt ? lastW.measuredAt : lastH.measuredAt) : new Date();
  const level = imc != null ? imcLevel(imc, bornOn, imcAt) : null;
  const sameDay = lastW && lastH && localDateKey(lastW.measuredAt) === localDateKey(lastH.measuredAt);
  const weightRange = niceRange(weightValues.filter((value): value is number => value != null));
  const heightRange = niceRange(heightValues.filter((value): value is number => value != null));

  return (
    <Card>
      <h2>Poids et taille</h2>
      <div className="growth-scroll" ref={scrollRef}>
        <div className="growth-inner">
          {hasWeight ? (
            <div className="growth-series-block">
              <p className="growth-series-label growth-leg-weight">Poids (kg)</p>
              <div className="growth-series">
                <YAxis min={weightRange.min} max={weightRange.max} />
                <SeriesPlot values={weightValues} slot={slot} tone="weight" unit="kg" />
              </div>
            </div>
          ) : null}
          {hasHeight ? (
            <div className="growth-series-block">
              <p className="growth-series-label growth-leg-height">Taille (cm)</p>
              <div className="growth-series">
                <YAxis min={heightRange.min} max={heightRange.max} />
                <SeriesPlot values={heightValues} slot={slot} tone="height" unit="cm" />
              </div>
            </div>
          ) : null}
          <div className="growth-x-row">
            <span className="growth-y-spacer" style={{ width: PAD_L }} />
            {days.map((day) => (
              <span key={day} className="growth-x-label" style={{ width: slot }}>
                {axisDateLabel(day)}
              </span>
            ))}
          </div>
        </div>
      </div>
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
