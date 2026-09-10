import { useState } from 'react';

import { SegmentedControl } from '@/components/SegmentedControl';
import { Card } from '@/components/ui';
import type { BottleFeed, FeedingSession, SleepSession } from '@/db/types';
import {
  addLocalCoverage,
  addLocalInstant,
  formatCompactMinutes,
  formatMinuteCount,
  isNotedSession,
  localDateKey,
  spansOnLocalDay,
  totalMinutesOnLocalDay,
  weekdayShort,
} from '@/lib/dates';

const SLOTS = 96;
const CX = 130;
const CY = 132;
const R_HOLE = 36;
const R_SLEEP_IN = 38;
const R_SLEEP_OUT = 62;
const R_MEAL_IN = 64;
const R_MEAL_OUT = 88;
const SLOT_MIN = (24 * 60) / SLOTS;
const DAY_MIN = 24 * 60;
const CLOCK_VIEW_KEY = 'abel.dash-clock-view';

type ViewMode = 'clock' | 'agenda';

type Props = {
  sleeps: SleepSession[];
  feeds?: FeedingSession[];
  bottles?: BottleFeed[];
  now: number;
  days?: string[];
  agenda?: boolean;
};

function readClockView(): ViewMode {
  try {
    return localStorage.getItem(CLOCK_VIEW_KEY) === 'agenda' ? 'agenda' : 'clock';
  } catch {
    return 'clock';
  }
}

function writeClockView(mode: ViewMode) {
  try {
    localStorage.setItem(CLOCK_VIEW_KEY, mode);
  } catch {
    /* hors ligne / mode privé */
  }
}

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function slotDeg(i: number) {
  return -90 + (i + 0.5) * (360 / SLOTS);
}

function polarRingPath(values: number[], max: number, rIn: number, rOut: number): string {
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const t = max > 0 ? values[i] / max : 0;
    const r = t <= 0 ? rIn : rIn + (rOut - rIn) * Math.pow(t, 0.72);
    const o = polar(r, slotDeg(i));
    const inn = polar(rIn, slotDeg(i));
    outer.push(`${o.x.toFixed(2)} ${o.y.toFixed(2)}`);
    inner.push(`${inn.x.toFixed(2)} ${inn.y.toFixed(2)}`);
  }
  inner.reverse();
  return `M${outer.join(' L')} Z M${inner.join(' L')} Z`;
}

function peakHint(values: number[], kind: string): string | null {
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
  if (bestLen <= 4) return `${kind} vers ${startH} h`;
  return `${kind} entre ${startH} h et ${endH === 0 ? 24 : endH} h`;
}

function mealRows(feeds: FeedingSession[], bottles: BottleFeed[]) {
  return [
    ...feeds.map((row) => ({ id: `f-${row.id}`, startedAt: row.startedAt, endedAt: row.endedAt })),
    ...bottles.map((row) => ({ id: `b-${row.id}`, startedAt: row.fedAt, endedAt: row.fedAt })),
  ];
}

function fillSleep(values: number[], sleeps: SleepSession[], now: number) {
  for (const row of sleeps) addLocalCoverage(values, row.startedAt, row.endedAt, now);
}

function fillMeals(values: number[], feeds: FeedingSession[], bottles: BottleFeed[], now: number) {
  for (const row of feeds) {
    if (isNotedSession(row.startedAt, row.endedAt)) {
      addLocalInstant(values, row.startedAt, now);
    } else {
      addLocalCoverage(values, row.startedAt, row.endedAt, now);
    }
  }
  for (const row of bottles) addLocalInstant(values, row.fedAt, now);
}

function AgendaAxis({
  ticks,
  xAt,
  width,
}: {
  ticks: number[];
  xAt: (min: number) => number;
  width: number;
}) {
  return (
    <svg className="sleep-agenda sleep-agenda-axis" viewBox={`0 0 ${width} 18`} aria-hidden>
      {ticks.map((hour) => {
        const x = xAt(hour * 60);
        return (
          <text
            key={hour}
            x={x}
            y={12}
            textAnchor={hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle'}
            className="sleep-agenda-tick">
            {hour} h
          </text>
        );
      })}
    </svg>
  );
}

function DayAgenda({
  sleeps,
  feeds,
  bottles,
  days,
  now,
}: {
  sleeps: SleepSession[];
  feeds: FeedingSession[];
  bottles: BottleFeed[];
  days: string[];
  now: number;
}) {
  const VB_W = 320;
  const PAD_L = 30;
  const PAD_R = 14;
  const PAD_T = 2;
  const PAD_B = 4;
  const ROW_H = 40;
  const PLOT_W = VB_W - PAD_L - PAD_R;
  const todayKey = localDateKey(new Date(now).toISOString());
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const ticks = [0, 6, 12, 18, 24];
  const rows = [...days].reverse();
  const height = PAD_T + rows.length * ROW_H + PAD_B;
  const meals = mealRows(feeds, bottles);
  const xAt = (min: number) => PAD_L + (Math.max(0, Math.min(DAY_MIN, min)) / DAY_MIN) * PLOT_W;

  return (
    <div>
      <AgendaAxis ticks={ticks} xAt={xAt} width={VB_W} />
      <div className="sleep-agenda-wrap">
        <svg
          className="sleep-agenda"
          viewBox={`0 0 ${VB_W} ${height}`}
          role="img"
          aria-label="Agenda des siestes et repas">
          {rows.map((day, i) => {
            const y = PAD_T + i * ROW_H;
            const naps = spansOnLocalDay(sleeps, day, now);
            const eats = spansOnLocalDay(meals, day, now);
            return (
              <g key={day}>
                <rect
                  x={PAD_L}
                  y={y + 3}
                  width={PLOT_W}
                  height={12}
                  rx="4"
                  className={day === todayKey ? 'sleep-agenda-track sleep-agenda-today' : 'sleep-agenda-track'}
                />
                <rect
                  x={PAD_L}
                  y={y + 18}
                  width={PLOT_W}
                  height={16}
                  rx="4"
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
                {eats.map((span) => {
                  const x = xAt(span.startMin);
                  const w = Math.max(3, xAt(span.endMin) - x);
                  return (
                    <rect
                      key={`${span.id}-${day}`}
                      x={x}
                      y={y + 4}
                      width={w}
                      height={10}
                      rx="3"
                      className="sleep-agenda-meal">
                      <title>repas</title>
                    </rect>
                  );
                })}
                {naps.map((nap) => {
                  const x = xAt(nap.startMin);
                  const w = Math.max(3, xAt(nap.endMin) - x);
                  return (
                    <g key={`${nap.id}-${day}`}>
                      <rect x={x} y={y + 19} width={w} height={14} rx="4" className="sleep-agenda-nap">
                        <title>{formatCompactMinutes(nap.minutes)}</title>
                      </rect>
                      {w >= 22 && nap.minutes > 0 ? (
                        <text
                          x={x + w / 2}
                          y={y + 27}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="sleep-agenda-value">
                          {formatCompactMinutes(nap.minutes)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                {day === todayKey ? (
                  <line
                    x1={xAt(nowMin)}
                    y1={y + 2}
                    x2={xAt(nowMin)}
                    y2={y + ROW_H - 4}
                    className="sleep-agenda-now"
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function SleepClock({
  sleeps,
  feeds = [],
  bottles = [],
  now,
  days = [],
  agenda = false,
}: Props) {
  const [view, setView] = useState<ViewMode>(readClockView);
  const allowAgenda = agenda && days.length > 0;
  const mode: ViewMode = allowAgenda && view === 'agenda' ? 'agenda' : 'clock';
  const sleepValues = Array.from({ length: SLOTS }, () => 0);
  const mealValues = Array.from({ length: SLOTS }, () => 0);
  fillSleep(sleepValues, sleeps, now);
  fillMeals(mealValues, feeds, bottles, now);
  const sleepMax = Math.max(0, ...sleepValues);
  const mealMax = Math.max(0, ...mealValues);
  const sleepMinutes =
    days.length > 0 ? days.reduce((sum, day) => sum + totalMinutesOnLocalDay(sleeps, day, now), 0) : 0;
  const napCount =
    days.length > 0
      ? new Set(days.flatMap((day) => spansOnLocalDay(sleeps, day, now).map((span) => span.id))).size
      : sleeps.length;
  const mealCount =
    days.length > 0
      ? new Set(days.flatMap((day) => spansOnLocalDay(mealRows(feeds, bottles), day, now).map((span) => span.id)))
          .size
      : feeds.length + bottles.length;
  const hasData = napCount > 0 || mealCount > 0;
  const dayCount = Math.max(1, days.length);
  const avgSleepMin = Math.round(sleepMinutes / dayCount);
  const avgMeals = mealCount / dayCount;
  const avgHint =
    days.length > 1
      ? [
          avgSleepMin > 0 ? `moyenne ${formatMinuteCount(avgSleepMin)} / j` : null,
          mealCount > 0
            ? `${avgMeals.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} repas / j`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;
  const hint = [
    avgHint,
    peakHint(sleepValues, 'Siestes plus longues'),
    peakHint(mealValues, 'Repas plus fréquents'),
  ]
    .filter(Boolean)
    .join(' · ');
  const hours = [0, 6, 12, 18];

  const changeView = (next: ViewMode) => {
    setView(next);
    writeClockView(next);
  };

  return (
    <Card>
      <div className="card-head">
        <h2>Heures de sieste et repas</h2>
        {allowAgenda ? (
          <SegmentedControl
            className="chart-metric-switch"
            size="sm"
            value={mode}
            onChange={changeView}
            ariaLabel="Type de graphique siestes et repas"
            options={[
              { key: 'clock', label: 'Cadran', ariaLabel: 'Cadran' },
              { key: 'agenda', label: 'Agenda', ariaLabel: 'Agenda' },
            ]}
          />
        ) : null}
      </div>
      {mode === 'agenda' ? (
        <>
          <DayAgenda sleeps={sleeps} feeds={feeds} bottles={bottles} days={days} now={now} />
          <div className="bar-legend">
            <span className="leg-breast">Repas</span>
            <span className="leg-sleep">Siestes</span>
          </div>
          <p className="muted pie-detail">
            {!hasData
              ? 'Aucune sieste ni repas sur cette période.'
              : [avgHint, sleepMinutes > 0 ? formatMinuteCount(sleepMinutes) : null, napCount > 0 ? `${napCount} sieste${napCount > 1 ? 's' : ''}` : null, mealCount > 0 ? `${mealCount} repas` : null]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </>
      ) : !hasData ? (
        <p className="muted">Aucune sieste ni repas sur cette période.</p>
      ) : (
        <>
          <div className="sleep-clock">
            <svg
              className="sleep-clock-svg"
              viewBox="0 0 260 280"
              role="img"
              aria-label="Cadran 24 heures des siestes et repas">
              <defs>
                <radialGradient id="sleep-clock-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="42%" stopColor="#a8b6d4" />
                  <stop offset="100%" stopColor="#3d4f73" />
                </radialGradient>
                <radialGradient id="meal-clock-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="42%" stopColor="#e3a89a" />
                  <stop offset="100%" stopColor="#c45c4a" />
                </radialGradient>
              </defs>
              <circle cx={CX} cy={CY} r={R_MEAL_OUT} fill="none" stroke="var(--border)" strokeWidth="1" />
              {mealMax > 0 ? (
                <path
                  d={polarRingPath(mealValues, mealMax, R_MEAL_IN, R_MEAL_OUT)}
                  fill="url(#meal-clock-grad)"
                  fillRule="evenodd"
                />
              ) : null}
              {sleepMax > 0 ? (
                <path
                  d={polarRingPath(sleepValues, sleepMax, R_SLEEP_IN, R_SLEEP_OUT)}
                  fill="url(#sleep-clock-grad)"
                  fillRule="evenodd"
                />
              ) : null}
              <circle cx={CX} cy={CY} r={R_HOLE} fill="var(--surface)" />
              {hours.map((hour) => {
                const deg = -90 + hour * 15;
                const tick0 = polar(R_MEAL_OUT + 2, deg);
                const tick1 = polar(R_MEAL_OUT + 8, deg);
                const label = polar(R_MEAL_OUT + 18, deg);
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
                {days.length > 1 && avgSleepMin > 0
                  ? avgSleepMin < 60
                    ? `${avgSleepMin} min`
                    : formatCompactMinutes(avgSleepMin)
                  : String(napCount + mealCount)}
              </text>
              <text x={CX} y={CY + 10} textAnchor="middle" className="sleep-clock-center-label">
                {days.length > 1 && avgSleepMin > 0 ? '/ jour' : 'sur 24 h'}
              </text>
            </svg>
          </div>
          <div className="bar-legend">
            <span className="leg-breast">Repas</span>
            <span className="leg-sleep">Siestes</span>
          </div>
          <p className="muted pie-detail">
            {[
              sleepMinutes > 0 ? formatMinuteCount(sleepMinutes) : null,
              napCount > 0 ? `${napCount} sieste${napCount > 1 ? 's' : ''}` : null,
              mealCount > 0 ? `${mealCount} repas` : null,
              hint || null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </>
      )}
    </Card>
  );
}
