import { useState } from 'react';

import { SegmentedControl } from '@/components/SegmentedControl';
import { Card } from '@/components/ui';
import type { SleepSession } from '@/db/types';
import {
  addLocalCoverage,
  formatCompactMinutes,
  formatMinuteCount,
  localDateKey,
  spansOnLocalDay,
  totalMinutesOnLocalDay,
  weekdayShort,
} from '@/lib/dates';

const SLOTS = 96;
const CX = 100;
const CY = 108;
const R_OUT = 78;
const R_IN = 44;
const SLOT_MIN = (24 * 60) / SLOTS;
const DAY_MIN = 24 * 60;

type ViewMode = 'clock' | 'agenda';

type Props = {
  sleeps: SleepSession[];
  now: number;
  days?: string[];
  agenda?: boolean;
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

function SleepAgenda({
  sleeps,
  days,
  now,
}: {
  sleeps: SleepSession[];
  days: string[];
  now: number;
}) {
  const VB_W = 320;
  const PAD_L = 30;
  const PAD_R = 14;
  const PAD_T = 4;
  const PAD_B = 20;
  const ROW_H = 28;
  const PLOT_W = VB_W - PAD_L - PAD_R;
  const todayKey = localDateKey(new Date(now).toISOString());
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const ticks = [0, 6, 12, 18, 24];
  const height = PAD_T + days.length * ROW_H + PAD_B;

  const xAt = (min: number) => PAD_L + (Math.max(0, Math.min(DAY_MIN, min)) / DAY_MIN) * PLOT_W;

  return (
    <svg
      className="sleep-agenda"
      viewBox={`0 0 ${VB_W} ${height}`}
      role="img"
      aria-label="Agenda des siestes sur 7 jours">
      {days.map((day, i) => {
        const y = PAD_T + i * ROW_H;
        const naps = spansOnLocalDay(sleeps, day, now).map((span) => {
          const x = xAt(span.startMin);
          const w = Math.max(3, xAt(span.endMin) - x);
          return { key: `${span.id}-${day}`, x, w, minutes: span.minutes, y };
        });
        return (
          <g key={day}>
            <rect
              x={PAD_L}
              y={y + 4}
              width={PLOT_W}
              height={ROW_H - 8}
              rx="5"
              className={day === todayKey ? 'sleep-agenda-track sleep-agenda-today' : 'sleep-agenda-track'}
            />
            <text
              x={PAD_L - 4}
              y={y + ROW_H / 2 + 1}
              textAnchor="end"
              dominantBaseline="middle"
              className="sleep-agenda-day">
              {weekdayShort(day)}
            </text>
            {naps.map((nap) => (
              <g key={nap.key}>
                <rect
                  x={nap.x}
                  y={y + 5}
                  width={nap.w}
                  height={ROW_H - 10}
                  rx="4"
                  className="sleep-agenda-nap">
                  <title>{formatCompactMinutes(nap.minutes)}</title>
                </rect>
                {nap.w >= 22 ? (
                  <text
                    x={nap.x + nap.w / 2}
                    y={y + ROW_H / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="sleep-agenda-value">
                    {formatCompactMinutes(nap.minutes)}
                  </text>
                ) : null}
              </g>
            ))}
            {day === todayKey ? (
              <line
                x1={xAt(nowMin)}
                y1={y + 3}
                x2={xAt(nowMin)}
                y2={y + ROW_H - 3}
                className="sleep-agenda-now"
              />
            ) : null}
          </g>
        );
      })}
      {ticks.map((hour) => {
        const x = xAt(hour * 60);
        return (
          <g key={hour}>
            <line
              x1={x}
              y1={PAD_T + days.length * ROW_H}
              x2={x}
              y2={PAD_T + days.length * ROW_H + 4}
              stroke="var(--text-muted)"
              strokeWidth="1"
            />
            <text
              x={x}
              y={height - 3}
              textAnchor={hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle'}
              fontSize="9"
              className="sleep-agenda-tick">
              {hour} h
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SleepClock({ sleeps, now, days = [], agenda = false }: Props) {
  const [view, setView] = useState<ViewMode>('clock');
  const allowAgenda = agenda && days.length > 0;
  const mode: ViewMode = allowAgenda && view === 'agenda' ? 'agenda' : 'clock';
  const values = Array.from({ length: SLOTS }, () => 0);
  for (const row of sleeps) {
    addLocalCoverage(values, row.startedAt, row.endedAt, now);
  }
  const max = Math.max(0, ...values);
  const sleepMinutes =
    days.length > 0
      ? days.reduce((sum, day) => sum + totalMinutesOnLocalDay(sleeps, day, now), 0)
      : 0;
  const napCount =
    days.length > 0
      ? new Set(days.flatMap((day) => spansOnLocalDay(sleeps, day, now).map((span) => span.id))).size
      : sleeps.length;
  const hint = peakHint(values);
  const hours = [0, 6, 12, 18];

  return (
    <Card>
      <div className="card-head">
        <h2>Heures de sieste</h2>
        {allowAgenda ? (
          <SegmentedControl
            className="chart-metric-switch"
            size="sm"
            value={mode}
            onChange={setView}
            ariaLabel="Type de graphique des siestes"
            options={[
              { key: 'clock', label: 'Cadran', ariaLabel: 'Cadran' },
              { key: 'agenda', label: 'Agenda', ariaLabel: 'Agenda' },
            ]}
          />
        ) : null}
      </div>
      {mode === 'agenda' ? (
        <>
          <SleepAgenda sleeps={sleeps} days={days} now={now} />
          <p className="muted pie-detail">
            {napCount === 0
              ? 'Aucune sieste sur 7 jours.'
              : [sleepMinutes > 0 ? formatMinuteCount(sleepMinutes) : null, `${napCount} sieste${napCount > 1 ? 's' : ''}`]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </>
      ) : napCount === 0 ? (
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
            {[sleepMinutes > 0 ? formatMinuteCount(sleepMinutes) : null, hint]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
    </Card>
  );
}
