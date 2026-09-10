import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { SegmentedControl } from '@/components/SegmentedControl';
import { Card } from '@/components/ui';
import type { BottleFeed, FeedingSession, SleepSession } from '@/db/types';
import {
  addCoverageOnLocalDay,
  addInstantOnLocalDay,
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
const R_HOLE = 42;
const R_SLEEP_IN = 44;
const R_SLEEP_OUT = 88;
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
  seriesToggle?: boolean;
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

function peakRange(values: number[]): string | null {
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
  if (bestLen <= 4) return `vers ${startH} h`;
  return `entre ${startH} h et ${endH === 0 ? 24 : endH} h`;
}

type DetailSection = { title: string; lines: string[] };

function ClockDetails({ empty, sections }: { empty?: string; sections: DetailSection[] }) {
  const [open, setOpen] = useState(false);
  const shown = sections.filter((section) => section.lines.length > 0);
  if (!empty && shown.length === 0) return null;
  return (
    <div className="clock-details">
      {open ? (
        <div className="clock-details-panel">
          {empty ? (
            <p>{empty}</p>
          ) : (
            shown.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                {section.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </section>
            ))
          )}
        </div>
      ) : null}
      <button
        type="button"
        className="clock-details-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        Infos
        <ChevronDown size={14} className={`accordion-chevron${open ? ' open' : ''}`} aria-hidden />
      </button>
    </div>
  );
}

function mealRows(feeds: FeedingSession[], bottles: BottleFeed[]) {
  return [
    ...feeds.map((row) => ({ id: `f-${row.id}`, startedAt: row.startedAt, endedAt: row.endedAt })),
    ...bottles.map((row) => ({ id: `b-${row.id}`, startedAt: row.fedAt, endedAt: row.fedAt })),
  ];
}

function fillSleep(values: number[], sleeps: SleepSession[], now: number, dayKey?: string) {
  if (dayKey) {
    for (const row of sleeps) addCoverageOnLocalDay(values, row.startedAt, row.endedAt ?? null, dayKey, now);
    return;
  }
  for (const row of sleeps) addLocalCoverage(values, row.startedAt, row.endedAt, now);
}

function fillMeals(values: number[], feeds: FeedingSession[], bottles: BottleFeed[], now: number, dayKey?: string) {
  if (dayKey) {
    for (const row of feeds) {
      if (isNotedSession(row.startedAt, row.endedAt)) {
        addInstantOnLocalDay(values, row.startedAt, dayKey, now);
      } else {
        addCoverageOnLocalDay(values, row.startedAt, row.endedAt, dayKey, now);
      }
    }
    for (const row of bottles) addInstantOnLocalDay(values, row.fedAt, dayKey, now);
    return;
  }
  for (const row of feeds) {
    if (isNotedSession(row.startedAt, row.endedAt)) {
      addLocalInstant(values, row.startedAt, now);
    } else {
      addLocalCoverage(values, row.startedAt, row.endedAt, now);
    }
  }
  for (const row of bottles) addLocalInstant(values, row.fedAt, now);
}

function clearSlotsAfterNow(values: number[], now: number) {
  const d = new Date(now);
  const nowMin = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const slotMinutes = DAY_MIN / values.length;
  const firstFuture = Math.ceil(nowMin / slotMinutes);
  for (let i = firstFuture; i < values.length; i++) values[i] = 0;
}

function ClockFace({
  sleepValues,
  mealValues,
  showSleep,
  showMeals,
  centerValue,
  centerLabel,
  ariaLabel,
  nowMin,
}: {
  sleepValues: number[];
  mealValues: number[];
  showSleep: boolean;
  showMeals: boolean;
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
  nowMin?: number;
}) {
  const sleepMax = Math.max(0, ...sleepValues);
  const mealMax = Math.max(0, ...mealValues);
  const both = showSleep && showMeals;
  const hours = [0, 6, 12, 18];
  const mealIn = both ? 56 : R_SLEEP_IN;
  const sleepOut = both ? 80 : R_SLEEP_OUT;
  const op = both ? 0.86 : 1;
  const nowDeg = nowMin != null ? -90 + (nowMin / DAY_MIN) * 360 : null;
  const nowInner = nowDeg != null ? polar(R_HOLE, nowDeg) : null;
  const nowOuter = nowDeg != null ? polar(R_SLEEP_OUT + 6, nowDeg) : null;
  return (
    <div className="sleep-clock">
      <svg className="sleep-clock-svg" viewBox="0 0 260 280" role="img" aria-label={ariaLabel}>
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
        <circle cx={CX} cy={CY} r={R_SLEEP_OUT} fill="none" stroke="var(--border)" strokeWidth="1" />
        {showMeals && mealMax > 0 ? (
          <path
            d={polarRingPath(mealValues, mealMax, mealIn, R_SLEEP_OUT)}
            fill="url(#meal-clock-grad)"
            fillRule="evenodd"
            opacity={op}
          />
        ) : null}
        {showSleep && sleepMax > 0 ? (
          <path
            d={polarRingPath(sleepValues, sleepMax, R_SLEEP_IN, sleepOut)}
            fill="url(#sleep-clock-grad)"
            fillRule="evenodd"
            opacity={op}
          />
        ) : null}
        <circle cx={CX} cy={CY} r={R_HOLE} fill="var(--surface)" />
        {nowInner && nowOuter ? (
          <line
            x1={nowInner.x}
            y1={nowInner.y}
            x2={nowOuter.x}
            y2={nowOuter.y}
            className="sleep-clock-now"
          />
        ) : null}
        {hours.map((hour) => {
          const deg = -90 + hour * 15;
          const tick0 = polar(R_SLEEP_OUT + 2, deg);
          const tick1 = polar(R_SLEEP_OUT + 8, deg);
          const label = polar(R_SLEEP_OUT + 18, deg);
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
          {centerValue}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" className="sleep-clock-center-label">
          {centerLabel}
        </text>
      </svg>
    </div>
  );
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
  seriesToggle = false,
}: Props) {
  const [view, setView] = useState<ViewMode>(readClockView);
  const [showSleep, setShowSleep] = useState(true);
  const [showMeals, setShowMeals] = useState(false);
  const allowAgenda = agenda && days.length > 0;
  const mode: ViewMode = allowAgenda && view === 'agenda' ? 'agenda' : 'clock';
  const todayKey = localDateKey(new Date(now).toISOString());
  const dayKey = days.length === 1 ? days[0] : undefined;
  const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes() + new Date(now).getSeconds() / 60;
  const sleepValues = Array.from({ length: SLOTS }, () => 0);
  const mealValues = Array.from({ length: SLOTS }, () => 0);
  fillSleep(sleepValues, sleeps, now, dayKey);
  fillMeals(mealValues, feeds, bottles, now, dayKey);
  if (dayKey === todayKey) {
    clearSlotsAfterNow(sleepValues, now);
    clearSlotsAfterNow(mealValues, now);
  }
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
  const hasSleep = napCount > 0;
  const hasMeals = mealCount > 0;
  const dayCount = Math.max(1, days.length);
  const avgSleepMin = Math.round(sleepMinutes / dayCount);
  const avgMeals = mealCount / dayCount;
  const sleepAvgHint =
    days.length > 1 && avgSleepMin > 0 ? `moyenne ${formatMinuteCount(avgSleepMin)} / j` : null;
  const mealAvgHint =
    days.length > 1 && mealCount > 0
      ? `${avgMeals.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} repas / j`
      : null;
  const sleepCenter =
    avgSleepMin < 60
      ? `${avgSleepMin} min`
      : formatCompactMinutes(avgSleepMin);
  const mealCenter =
    days.length > 1 && mealCount > 0
      ? avgMeals.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
      : String(mealCount);
  const sleepCenterLabel = days.length > 1 ? '/ jour' : 'sommeil';
  const mealCenterLabel = days.length > 1 && mealCount > 0 ? 'repas / j' : 'sur 24 h';
  const sleepPeak = showSleep ? peakRange(sleepValues) : null;
  const mealPeak = showMeals ? peakRange(mealValues) : null;
  const clockEmpty =
    (!showSleep || !hasSleep) && (!showMeals || !hasMeals);
  const clockEmptyMessage = !showSleep && !showMeals
    ? 'Active Siestes ou Repas sous le cadran.'
    : clockEmpty
      ? showSleep && showMeals
        ? 'Aucune sieste ni repas sur cette période.'
        : showMeals
          ? 'Aucun repas sur cette période.'
          : 'Aucune sieste sur cette période.'
      : undefined;
  const clockSections: DetailSection[] = [
    {
      title: 'Siestes',
      lines: [
        showSleep && sleepMinutes > 0 ? formatMinuteCount(sleepMinutes) : null,
        showSleep && napCount > 0 ? `${napCount} sieste${napCount > 1 ? 's' : ''}` : null,
        showSleep ? sleepAvgHint : null,
        showSleep && sleepPeak ? `plus longues ${sleepPeak}` : null,
      ].filter((line): line is string => Boolean(line)),
    },
    {
      title: 'Repas',
      lines: [
        showMeals && mealCount > 0 ? `${mealCount} repas` : null,
        showMeals ? mealAvgHint : null,
        showMeals && mealPeak ? `plus fréquents ${mealPeak}` : null,
      ].filter((line): line is string => Boolean(line)),
    },
  ];
  const agendaEmpty = !hasSleep && !hasMeals ? 'Aucune sieste ni repas sur cette période.' : undefined;
  const agendaSections: DetailSection[] = [
    {
      title: 'Siestes',
      lines: [
        sleepMinutes > 0 ? formatMinuteCount(sleepMinutes) : null,
        napCount > 0 ? `${napCount} sieste${napCount > 1 ? 's' : ''}` : null,
        sleepAvgHint,
      ].filter((line): line is string => Boolean(line)),
    },
    {
      title: 'Repas',
      lines: [
        mealCount > 0 ? `${mealCount} repas` : null,
        mealAvgHint,
      ].filter((line): line is string => Boolean(line)),
    },
  ];
  const clockCenter = showSleep
    ? sleepCenter
    : showMeals && hasMeals
      ? mealCenter
      : '—';
  const clockCenterLabel = showSleep
    ? sleepCenterLabel
    : showMeals && hasMeals
      ? mealCenterLabel
      : 'sur 24 h';
  const title = 'Résumé';

  const changeView = (next: ViewMode) => {
    setView(next);
    writeClockView(next);
  };

  const clockLegend = seriesToggle ? (
    <div className="bar-legend" role="group" aria-label="Données du cadran">
      <button
        type="button"
        className={`leg-sleep${showSleep ? ' is-on' : ''}`}
        aria-pressed={showSleep}
        onClick={() => setShowSleep((on) => !on)}>
        Siestes
      </button>
      <button
        type="button"
        className={`leg-breast${showMeals ? ' is-on' : ''}`}
        aria-pressed={showMeals}
        onClick={() => setShowMeals((on) => !on)}>
        Repas
      </button>
    </div>
  ) : null;

  return (
    <Card>
      <div className="card-head">
        <h2>{title}</h2>
        {allowAgenda ? (
          <SegmentedControl
            className="chart-metric-switch"
            size="sm"
            value={mode}
            onChange={changeView}
            ariaLabel="Type de graphique siestes"
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
          <ClockDetails empty={agendaEmpty} sections={agendaSections} />
        </>
      ) : !seriesToggle && !hasSleep ? (
        <p className="muted">Aucune sieste sur cette période.</p>
      ) : (
        <>
          <ClockFace
            sleepValues={sleepValues}
            mealValues={mealValues}
            showSleep={showSleep}
            showMeals={showMeals}
            centerValue={clockEmpty ? '—' : clockCenter}
            centerLabel={clockCenterLabel}
            ariaLabel={
              showSleep && showMeals
                ? 'Cadran 24 heures des siestes et repas'
                : showMeals
                  ? 'Cadran 24 heures des repas'
                  : 'Cadran 24 heures des siestes'
            }
            nowMin={nowMin}
          />
          {clockLegend}
          <ClockDetails empty={clockEmptyMessage} sections={clockSections} />
        </>
      )}
    </Card>
  );
}
