import { useLayoutEffect, useRef, useState } from 'react';
import { ChartColumn, ChartSpline, ZoomIn, ZoomOut } from 'lucide-react';

import { Card } from '@/components/ui';
import type { Measurement } from '@/db/types';
import { formatDate, formatDateTime, localDateKey } from '@/lib/dates';
import { computeImc, formatImc, imcLevel, imcLevelClass, imcToneLabel } from '@/lib/imc';
import {
  ageMonthsExact,
  sampleWhoCurve,
  WHO_MAX_MONTHS,
  type WhoPercentiles,
} from '@/lib/who-growth';

type Props = {
  weights: Measurement[];
  heights: Measurement[];
  bornOn?: string | null;
  hideTitle?: boolean;
};

type ChartView = 'history' | 'who';

const VIEW_KEY = 'abel.growth-chart-view';
const ZOOM_KEY = 'abel.growth-who-zoom';
const PAD_L = 36;
const PAD_R_WHO = 28;
const H = 112;
const H_WHO = 210;
const PAD_T = 14;
const PAD_B = 10;
const VISIBLE_DAYS = 6;
const SLOT_MIN = 48;

const WHO_PCT_STYLE: { key: keyof WhoPercentiles; label: string; className: string }[] = [
  { key: 'p97', label: '97', className: 'growth-who-p97' },
  { key: 'p85', label: '85', className: 'growth-who-p85' },
  { key: 'p50', label: '50', className: 'growth-who-p50' },
  { key: 'p15', label: '15', className: 'growth-who-p15' },
  { key: 'p3', label: '3', className: 'growth-who-p3' },
];

/** Zones colorées transparentes entre percentiles (rouge / orange / vert). */
const WHO_ZONES: { lo: keyof WhoPercentiles; hi: keyof WhoPercentiles; className: string }[] = [
  { lo: 'p3', hi: 'p15', className: 'growth-who-zone-red' },
  { lo: 'p15', hi: 'p85', className: 'growth-who-zone-green' },
  { lo: 'p85', hi: 'p97', className: 'growth-who-zone-orange' },
];

function readView(): ChartView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'who' ? 'who' : 'history';
  } catch {
    return 'history';
  }
}

function writeView(view: ChartView) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* ignore */
  }
}

function readWhoZoomed(): boolean {
  try {
    const v = localStorage.getItem(ZOOM_KEY);
    if (v === '0' || v === 'full') return false;
    return true;
  } catch {
    return true;
  }
}

function writeWhoZoomed(zoomed: boolean) {
  try {
    localStorage.setItem(ZOOM_KEY, zoomed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

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

function yAt(value: number, min: number, max: number, height = H): number {
  if (max <= min) return PAD_T + (height - PAD_T - PAD_B) / 2;
  const plotH = height - PAD_T - PAD_B;
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

function seriesSegments(
  values: (number | null)[],
  slot: number,
  min: number,
  max: number,
): { solid: Seg[]; dashed: Seg[] } {
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

function YAxis({ min, max, height = H }: { min: number; max: number; height?: number }) {
  return (
    <svg className="growth-y-svg" viewBox={`0 0 ${PAD_L} ${height}`} width={PAD_L} height={height} aria-hidden>
      {ticks(min, max).map((tick) => {
        const y = yAt(tick, min, max, height);
        return (
          <text key={tick} className="growth-axis growth-axis-left" x={PAD_L - 4} y={y + 3}>
            {fmtTick(tick)}
          </text>
        );
      })}
    </svg>
  );
}

function WhoYAxis({ min, max, height = H_WHO }: { min: number; max: number; height?: number }) {
  return (
    <svg className="growth-y-svg" viewBox={`0 0 ${PAD_L} ${height}`} width={PAD_L} height={height} aria-hidden>
      {whoYTicks(min, max).map((tick) => {
        const y = yAt(tick, min, max, height);
        return (
          <text key={tick} className="growth-axis growth-axis-left" x={PAD_L - 4} y={y + 3}>
            {fmtTick(tick)}
          </text>
        );
      })}
    </svg>
  );
}

function fmtPoint(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace('.', ',');
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
      {values.map((value, i) => {
        if (value == null) return null;
        const label = fmtPoint(value);
        const r = label.length > 4 ? 15 : 13;
        return (
          <g key={`${tone}-${i}`}>
            <circle
              className={`growth-dot growth-dot-${tone}`}
              cx={xPos(i, slot)}
              cy={yAt(value, range.min, range.max)}
              r={r}>
              <title>
                {label} {unit}
              </title>
            </circle>
            <text
              className="growth-dot-label"
              x={xPos(i, slot)}
              y={yAt(value, range.min, range.max)}
              textAnchor="middle"
              dominantBaseline="central">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Fenêtre d’âge zoomée : 1 mois (ou un peu plus si les mesures dépassent). */
function whoDisplayMonthMax(
  weightPts: { months: number }[],
  heightPts: { months: number }[],
  babyAgeMonths: number | null,
  zoomed: boolean,
): number {
  if (!zoomed) return WHO_MAX_MONTHS;
  const lastMeasure = Math.max(0, ...weightPts.map((p) => p.months), ...heightPts.map((p) => p.months));
  const ref = Math.max(lastMeasure, babyAgeMonths ?? 0);
  // Zoom = 1 mois ; on élargit seulement si l’âge / les mesures vont au-delà.
  return Math.min(WHO_MAX_MONTHS, Math.max(1, Math.ceil((ref + 0.1) * 10) / 10));
}

/** Échelle Y : zoom = zone autour des mesures ; dézoom = bande P3–P97 sur toute la fenêtre. */
function whoRange(
  samples: { month: number; pct: WhoPercentiles }[],
  maxMonth: number,
  points: { months: number; value: number }[],
  zoomed: boolean,
): { min: number; max: number } {
  const windowSamples = samples.filter((s) => s.month <= maxMonth + 0.01);
  if (windowSamples.length === 0) return { min: 0, max: 1 };
  const pointVals = points.map((p) => p.value);

  if (zoomed && points.length > 0) {
    const ageMin = Math.min(...points.map((p) => p.months));
    const ageMax = Math.max(...points.map((p) => p.months));
    const nearby = windowSamples.filter(
      (s) => s.month >= Math.max(0, ageMin - 0.75) && s.month <= ageMax + 1.25,
    );
    const local = nearby.length ? nearby : windowSamples.slice(-6);
    const band = local.flatMap((s) => [s.pct.p3, s.pct.p97]);
    const lo = Math.min(...pointVals, ...band);
    const hi = Math.max(...pointVals, ...band);
    const span = hi - lo || 0.5;
    return { min: Math.max(0, lo - span * 0.18), max: hi + span * 0.16 };
  }

  const band = windowSamples.flatMap((s) => [s.pct.p3, s.pct.p97]);
  const lo = Math.min(...band, ...(pointVals.length ? pointVals : band));
  const hi = Math.max(...band, ...(pointVals.length ? pointVals : band));
  const span = hi - lo || 0.5;
  return { min: Math.max(0, lo - span * 0.08), max: hi + span * 0.06 };
}

function bandPath(
  samples: { month: number; pct: WhoPercentiles }[],
  lo: keyof WhoPercentiles,
  hi: keyof WhoPercentiles,
  xAtMonth: (m: number) => number,
  min: number,
  max: number,
): string {
  if (samples.length < 2) return '';
  const top = samples.map((s) => `${xAtMonth(s.month)},${yAt(s.pct[hi], min, max, H_WHO)}`).join(' L ');
  const bottom = [...samples]
    .reverse()
    .map((s) => `${xAtMonth(s.month)},${yAt(s.pct[lo], min, max, H_WHO)}`)
    .join(' L ');
  return `M ${top} L ${bottom} Z`;
}

function whoYTicks(min: number, max: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const count = 5;
  const rough = span / (count - 1);
  const pow = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)));
  const step = Math.max(pow / 2, Math.ceil(rough / pow) * pow);
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) {
    if (v >= min - step * 0.001 && v <= max + step * 0.001) out.push(v);
  }
  return out.length >= 2 ? out : ticks(min, max);
}

type BabyPlotPoint = { cx: number; cy: number; label: string; months: number; unit: string };

function placeBabyLabels(items: BabyPlotPoint[]): (BabyPlotPoint & { labelY: number })[] {
  const sorted = [...items].sort((a, b) => a.cx - b.cx || a.cy - b.cy);
  const placed: (BabyPlotPoint & { labelY: number })[] = [];
  for (const item of sorted) {
    const candidates = [item.cy - 16, item.cy + 18, item.cy - 30, item.cy + 32];
    let labelY = candidates[0];
    for (const y of candidates) {
      const clash = placed.some(
        (prev) => Math.abs(prev.cx - item.cx) < 32 && Math.abs(prev.labelY - y) < 13,
      );
      if (!clash) {
        labelY = y;
        break;
      }
    }
    placed.push({ ...item, labelY });
  }
  return placed;
}

function WhoSeriesPlot({
  kind,
  points,
  maxMonth,
  width,
  tone,
  unit,
  zoomed,
}: {
  kind: 'weight' | 'length';
  points: { months: number; value: number }[];
  maxMonth: number;
  width: number;
  tone: 'weight' | 'height';
  unit: string;
  zoomed: boolean;
}) {
  const samples = sampleWhoCurve(kind, 0, maxMonth, 0.2);
  if (samples.length < 2) return null;

  const plotW = Math.max(120, width - PAD_R_WHO);
  const visiblePoints = points.filter((p) => p.months <= maxMonth);
  const range = whoRange(samples, maxMonth, visiblePoints, zoomed);
  const xAtMonth = (m: number) => (m / maxMonth) * plotW;

  const babyLine = visiblePoints
    .map((p) => `${xAtMonth(p.months)},${yAt(p.value, range.min, range.max, H_WHO)}`)
    .join(' ');

  const monthStep = maxMonth <= 1.01 ? 0.25 : maxMonth <= 4 ? 0.5 : maxMonth <= 12 ? 2 : 3;
  const monthMajor: number[] = [];
  for (let m = 0; m <= maxMonth + 1e-9; m += monthStep) monthMajor.push(Math.round(m * 100) / 100);
  if (monthMajor[monthMajor.length - 1] !== maxMonth) monthMajor.push(maxMonth);

  const yMajors = whoYTicks(range.min, range.max);
  const babyPlot = placeBabyLabels(
    visiblePoints.map((p) => {
      const label = fmtPoint(p.value);
      return {
        cx: xAtMonth(p.months),
        cy: yAt(p.value, range.min, range.max, H_WHO),
        label,
        months: p.months,
        unit,
      };
    }),
  );

  return (
    <div className="growth-series-block">
      <p className={`growth-series-label growth-leg-${tone}`}>
        {kind === 'weight' ? 'Poids (kg)' : 'Taille (cm)'} · schéma OMS
      </p>
      <div className="growth-series">
        <WhoYAxis min={range.min} max={range.max} height={H_WHO} />
        <svg
          className="growth-plot growth-who-plot"
          viewBox={`0 0 ${width} ${H_WHO}`}
          width={width}
          height={H_WHO}
          role="img"
          aria-label={`Schéma OMS ${unit}, percentiles 3 à 97`}>
          <rect className="growth-who-frame" x={0.5} y={PAD_T} width={plotW - 1} height={H_WHO - PAD_T - PAD_B} />
          {yMajors.map((tick) => {
            const y = yAt(tick, range.min, range.max, H_WHO);
            return <line key={`ym-${tick}`} className="growth-who-grid-minor" x1={0} y1={y} x2={plotW} y2={y} />;
          })}
          {monthMajor.map((m) => {
            const x = xAtMonth(m);
            return (
              <line
                key={`xm-${m}`}
                className="growth-who-grid-major"
                x1={x}
                y1={PAD_T}
                x2={x}
                y2={H_WHO - PAD_B}
              />
            );
          })}
          {WHO_ZONES.map(({ lo, hi, className }) => (
            <path
              key={`${lo}-${hi}`}
              className={`growth-who-zone ${className}`}
              d={bandPath(samples, lo, hi, xAtMonth, range.min, range.max)}
            />
          ))}
          {WHO_PCT_STYLE.map(({ key, label, className }) => {
            const pts = samples
              .map((s) => `${xAtMonth(s.month)},${yAt(s.pct[key], range.min, range.max, H_WHO)}`)
              .join(' ');
            const last = samples[samples.length - 1];
            const ly = yAt(last.pct[key], range.min, range.max, H_WHO);
            return (
              <g key={key}>
                <polyline className={`growth-who-curve ${className}`} points={pts} fill="none" />
                <text className={`growth-who-pct-label ${className}`} x={plotW + 4} y={ly + 3}>
                  {label}
                </text>
              </g>
            );
          })}
          {babyLine ? <polyline className="growth-who-baby-line" points={babyLine} fill="none" /> : null}
          {babyPlot.map((p, i) => {
            const isLast = i === babyPlot.length - 1;
            return (
              <g key={`${tone}-who-${i}`} className="growth-who-baby-mark">
                <circle className="growth-who-baby-halo" cx={p.cx} cy={p.cy} r={isLast ? 9 : 6} />
                <circle className="growth-who-baby-dot" cx={p.cx} cy={p.cy} r={isLast ? 6.5 : 4.5}>
                  <title>
                    {p.label} {p.unit} ·{' '}
                    {p.months < 1
                      ? `${Math.round(p.months * 30)} j`
                      : `${p.months.toFixed(1).replace('.', ',')} mois`}
                  </title>
                </circle>
                {isLast ? (
                  <text className="growth-who-baby-label" x={p.cx} y={p.labelY} textAnchor="middle">
                    {p.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="growth-x-row">
        <span className="growth-y-spacer" style={{ width: PAD_L }} />
        <div className="growth-who-x" style={{ width: plotW }}>
          {monthMajor.map((m) => (
            <span key={m} className="growth-x-label growth-who-x-label" style={{ left: `${(m / maxMonth) * 100}%` }}>
              {maxMonth <= 1.01 ? String(m).replace('.', ',') : m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function measurePoints(rows: Measurement[], bornOn: string): { months: number; value: number }[] {
  const byDay = new Map<string, Measurement>();
  for (const row of byTimeAsc(rows)) {
    byDay.set(localDateKey(row.measuredAt), row);
  }
  const out: { months: number; value: number }[] = [];
  for (const row of [...byDay.values()].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))) {
    const months = ageMonthsExact(bornOn, new Date(row.measuredAt));
    if (months == null || months > WHO_MAX_MONTHS + 0.5) continue;
    out.push({ months: Math.min(WHO_MAX_MONTHS, months), value: row.value });
  }
  return out;
}

export function GrowthChart({ weights, heights, bornOn, hideTitle }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const whoWrapRef = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState(SLOT_MIN);
  const [whoWidth, setWhoWidth] = useState(280);
  const [view, setView] = useState<ChartView>(() => readView());
  const [whoZoomed, setWhoZoomed] = useState(() => readWhoZoomed());

  const weightPts = byTimeAsc(weights);
  const heightPts = byTimeAsc(heights);
  const days = [...new Set([...weightPts, ...heightPts].map((row) => localDateKey(row.measuredAt)))].sort();
  const weightByDay = lastValueByDay(weightPts);
  const heightByDay = lastValueByDay(heightPts);
  const weightValues = days.map((day) => weightByDay.get(day) ?? null);
  const heightValues = days.map((day) => heightByDay.get(day) ?? null);
  const hasWeight = weightValues.some((value) => value != null);
  const hasHeight = heightValues.some((value) => value != null);
  const hasHistory =
    weightPts.length + heightPts.length >= 2 || (weightPts.length >= 1 && heightPts.length >= 1);
  const canWho = Boolean(bornOn);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || view !== 'history') return;
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
  }, [days.length, hasWeight, hasHeight, view]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || view !== 'history') return;
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  }, [days.length, slot, hasWeight, hasHeight, view]);

  useLayoutEffect(() => {
    const el = whoWrapRef.current;
    if (!el || view !== 'who') return;
    const measure = () => setWhoWidth(Math.max(200, el.clientWidth - PAD_L));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [view]);

  if (!hasHistory && !canWho) return null;

  const activeView: ChartView =
    view === 'who' && canWho ? 'who' : hasHistory ? 'history' : 'who';
  if (activeView === 'history' && !hasHistory) return null;

  const lastW = [...weights].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const lastH = [...heights].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const imc = lastW && lastH ? computeImc(lastW.value, lastH.value) : null;
  const imcAt =
    lastW && lastH ? new Date(lastW.measuredAt > lastH.measuredAt ? lastW.measuredAt : lastH.measuredAt) : new Date();
  const level = imc != null ? imcLevel(imc, bornOn, imcAt) : null;
  const sameDay = lastW && lastH && localDateKey(lastW.measuredAt) === localDateKey(lastH.measuredAt);
  const weightRange = niceRange(weightValues.filter((value): value is number => value != null));
  const heightRange = niceRange(heightValues.filter((value): value is number => value != null));

  const setChartView = (next: ChartView) => {
    if (next === 'who' && !canWho) return;
    setView(next);
    writeView(next);
  };

  const babyAgeMonths = bornOn ? ageMonthsExact(bornOn, new Date()) : null;
  const weightWhoPts = bornOn ? measurePoints(weights, bornOn) : [];
  const heightWhoPts = bornOn ? measurePoints(heights, bornOn) : [];
  const whoMaxMonth = whoDisplayMonthMax(weightWhoPts, heightWhoPts, babyAgeMonths, whoZoomed);

  const setZoomed = (next: boolean) => {
    setWhoZoomed(next);
    writeWhoZoomed(next);
  };

  return (
    <Card>
      <div className="growth-head">
        {hideTitle ? <span className="growth-head-spacer" /> : <h2>Poids et taille</h2>}
        <div className="growth-view-toggle" role="group" aria-label="Type de courbe">
          {activeView === 'who' ? (
            <button
              type="button"
              className="growth-view-btn"
              title={whoZoomed ? 'Dézoomer (0–24 mois)' : 'Zoomer sur 1 mois'}
              aria-label={whoZoomed ? 'Dézoomer' : 'Zoomer sur 1 mois'}
              onClick={() => setZoomed(!whoZoomed)}>
              {whoZoomed ? <ZoomOut size={18} strokeWidth={2.2} aria-hidden /> : <ZoomIn size={18} strokeWidth={2.2} aria-hidden />}
            </button>
          ) : null}
          <button
            type="button"
            className={`growth-view-btn${activeView === 'history' ? ' is-on' : ''}`}
            aria-pressed={activeView === 'history'}
            title="Mesures"
            onClick={() => setChartView('history')}>
            <ChartColumn size={18} strokeWidth={2.2} aria-hidden />
          </button>
          <button
            type="button"
            className={`growth-view-btn${activeView === 'who' ? ' is-on' : ''}`}
            aria-pressed={activeView === 'who'}
            title={canWho ? 'Courbes OMS' : 'Ajoute la date de naissance sur Bébé'}
            disabled={!canWho}
            onClick={() => setChartView('who')}>
            <ChartSpline size={18} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </div>

      {activeView === 'history' ? (
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
      ) : bornOn ? (
        <div className="growth-who" ref={whoWrapRef}>
          <WhoSeriesPlot
            kind="weight"
            points={weightWhoPts}
            maxMonth={whoMaxMonth}
            width={whoWidth}
            tone="weight"
            unit="kg"
            zoomed={whoZoomed}
          />
          <WhoSeriesPlot
            kind="length"
            points={heightWhoPts}
            maxMonth={whoMaxMonth}
            width={whoWidth}
            tone="height"
            unit="cm"
            zoomed={whoZoomed}
          />
          {weightWhoPts.length === 0 && heightWhoPts.length === 0 ? (
            <p className="muted">Ajoute un poids ou une taille pour le placer sur la courbe OMS.</p>
          ) : null}
          <div className="growth-who-legend">
            <span className="growth-who-leg-zone-green">P15–P85</span>
            <span className="growth-who-leg-zone-orange">P85–P97</span>
            <span className="growth-who-leg-zone-red">P3–P15</span>
            <span className="growth-who-leg-baby">tes mesures</span>
            <span className="muted">{whoZoomed ? 'zoom 1 mois' : '0–24 mois'}</span>
          </div>
          <p className="muted growth-imc-note">
            Schéma type OMS (lignes 3–97, filles/garçons mélangés) — pas un avis médical.
          </p>
        </div>
      ) : null}

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
