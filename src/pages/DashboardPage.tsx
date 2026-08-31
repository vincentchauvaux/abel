import { useEffect, useMemo, useState } from 'react';

import { ActiveNowPanel } from '@/components/ActiveNowPanel';
import { MealPie } from '@/components/MealPie';
import { PeriodSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui';
import {
  getReminder,
  listBottles,
  listDiapers,
  listMeasurements,
  listNotes,
  completeNoteTodo,
  listPumps,
  listSessions,
  listSleep,
  listSolidFoods,
  listSupplements,
  listTemperatures,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type {
  BottleFeed,
  DiaperEvent,
  FeedingSession,
  Measurement,
  MeasurementType,
  Note,
  PumpingSession,
  ReminderRule,
  SleepSession,
  SolidFood,
  Supplement,
  Temperature,
} from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { listActivity, type ActivityItem } from '@/lib/activity';
import {
  eachLocalDay,
  elapsedMs,
  formatDateTime,
  formatMinutes,
  formatTime,
  localDateKey,
  periodRange,
  startOfLocalDay,
  weekdayShort,
  type Period,
} from '@/lib/dates';
import type { DiaperWhen } from '@/lib/goals';
import {
  bottleMlAlertLine,
  diaperAlertLine,
  lastMealAt,
  mealAlertLine,
  sleepAlertLine,
} from '@/lib/reminders';

function latestMeasure(measures: Measurement[], type: MeasurementType) {
  return measures.find((row) => row.type === type);
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="stat">
      <span className="muted">{label}</span>
      <b>{value}</b>
      {sub ? <span className="stat-sub muted">{sub}</span> : null}
    </div>
  );
}

export function DashboardPage() {
  const { baby, tick } = useDb();
  const [period, setPeriod] = useState<Period>('today');
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [bottles, setBottles] = useState<BottleFeed[]>([]);
  const [diapers, setDiapers] = useState<DiaperEvent[]>([]);
  const [pumps, setPumps] = useState<PumpingSession[]>([]);
  const [sleeps, setSleeps] = useState<SleepSession[]>([]);
  const [solids, setSolids] = useState<SolidFood[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [temperatures, setTemperatures] = useState<Temperature[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [measures, setMeasures] = useState<Measurement[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [goals, setGoals] = useState<ReminderRule | undefined>();
  const now = useNow(true, 30_000);

  useEffect(() => {
    if (!baby) return;
    Promise.all([
      listSessions(baby.id),
      listBottles(baby.id),
      listDiapers(baby.id),
      listPumps(baby.id),
      listSleep(baby.id),
      listSolidFoods(baby.id),
      listSupplements(baby.id),
      listTemperatures(baby.id),
      listNotes(baby.id),
      listMeasurements(baby.id),
      listActivity(baby.id, 120),
      getReminder(baby.id),
    ]).then(([s, b, d, p, sl, sf, sup, temp, n, m, log, r]) => {
      setSessions(s);
      setBottles(b);
      setDiapers(d);
      setPumps(p);
      setSleeps(sl);
      setSolids(sf);
      setSupplements(sup);
      setTemperatures(temp);
      setNotes(n);
      setMeasures(m);
      setActivity(log);
      setGoals(r);
    });
  }, [baby, tick]);

  const from = periodRange(period).from;
  const todayKey = localDateKey(new Date().toISOString());
  const inRange = (iso: string) => {
    if (period === 'today') return localDateKey(iso) === todayKey;
    if (!from) return true;
    return iso >= from;
  };

  const sessionsRange = sessions.filter((row) => inRange(row.startedAt));
  const bottlesRange = bottles.filter((row) => inRange(row.fedAt));
  const breastCount = sessionsRange.length;
  const bottleCount = bottlesRange.length;
  const feedingMinutes = Math.round(
    sessionsRange.reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0) / 60_000,
  );
  const bottleMl = bottlesRange.reduce((sum, row) => sum + (Number(row.amountMl) || 0), 0);
  const stockMl = pumps.reduce((sum, row) => sum + (Number(row.remainingMl) || 0), 0);
  const pumpedMl = pumps
    .filter((row) => inRange(row.startedAt))
    .reduce((sum, row) => sum + (Number(row.amountMl) || 0), 0);
  const sleepMs = sleeps
    .filter((row) => inRange(row.startedAt))
    .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0);
  const diaperCount = diapers.filter((row) => inRange(row.occurredAt)).length;
  const solidsCount = solids.filter((row) => inRange(row.eatenAt)).length;
  const supplementsCount = supplements.filter((row) => inRange(row.givenAt)).length;
  const notesCount = notes.filter((row) => inRange(row.notedAt)).length;
  const openNoteTodos = useMemo(
    () => notes.filter((row) => row.isTodo && !row.doneAt),
    [notes],
  );
  const tempsCount = temperatures.filter((row) => inRange(row.measuredAt)).length;

  const lastFeed = sessions[0];
  const lastBottle = bottles[0];
  const lastDiaper = diapers[0];
  const lastSolid = solids.find((row) => inRange(row.eatenAt)) ?? solids[0];
  const lastSupplement = supplements.find((row) => inRange(row.givenAt)) ?? supplements[0];
  const lastTemp = temperatures.find((row) => inRange(row.measuredAt)) ?? temperatures[0];
  const lastWeight = latestMeasure(measures, 'WEIGHT');
  const lastHeight = latestMeasure(measures, 'HEIGHT');
  const lastHead = latestMeasure(measures, 'HEAD_CIRCUMFERENCE');
  const activeSleep = sleeps.find((row) => !row.endedAt);
  const delay = goals?.delayMinutes ?? 0;
  const bottleGoalMl = goals?.bottleMl ?? null;
  const diaperOffset = goals?.diaperMinutes ?? 0;
  const diaperWhen: DiaperWhen = goals?.diaperWhen === 'before' ? 'before' : 'after';
  const todayMl = bottles
    .filter((row) => row.fedAt >= startOfLocalDay().toISOString())
    .reduce((sum, row) => sum + row.amountMl, 0);

  const periodActivity = useMemo(
    () => activity.filter((row) => inRange(row.at)).slice(0, 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inRange dépend de period
    [activity, period, from, todayKey],
  );

  const mealAt = useMemo(() => lastMealAt(lastFeed, lastBottle), [lastFeed, lastBottle]);

  const mealAlert = useMemo(
    () =>
      mealAlertLine({
        feed: lastFeed,
        bottle: lastBottle,
        mealIntervalMinutes: delay,
        now,
      }),
    [lastFeed, lastBottle, delay, now],
  );

  const bottleMlAlert = useMemo(() => bottleMlAlertLine(bottleGoalMl, todayMl), [bottleGoalMl, todayMl]);

  const diaperAlert = useMemo(
    () =>
      diaperAlertLine({
        lastDiaper,
        mealAt,
        mealIntervalMinutes: delay,
        diaperWhen,
        diaperOffset,
        now,
      }),
    [lastDiaper, mealAt, delay, diaperWhen, diaperOffset, now],
  );

  const sleepAlert = useMemo(() => sleepAlertLine(activeSleep, now), [activeSleep, now]);

  const formatMeasure = (row?: Measurement) => {
    if (!row) return { value: '—', sub: '' };
    return {
      value: `${row.value}`.replace('.', ','),
      sub: formatTime(row.measuredAt),
    };
  };

  const weightFmt = formatMeasure(lastWeight);
  const heightFmt = formatMeasure(lastHeight);
  const headFmt = formatMeasure(lastHead);

  const days = eachLocalDay(
    period === '30d' || period === 'all' ? periodRange('30d').from! : periodRange('7d').from!,
  );
  const compact = days.length > 10;

  const mealBars = days.map((day) => {
    const breast = sessions.filter((row) => localDateKey(row.startedAt) === day).length;
    const bottle = bottles.filter((row) => localDateKey(row.fedAt) === day).length;
    return {
      key: day,
      label: compact ? day.slice(8) : weekdayShort(day),
      value: breast + bottle,
    };
  });
  const sleepBars = days.map((day) => ({
    key: day,
    label: compact ? day.slice(8) : weekdayShort(day),
    value: Math.round(
      sleeps
        .filter((row) => localDateKey(row.startedAt) === day)
        .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0) / 3_600_000,
    ),
  }));
  const diaperBars = days.map((day) => ({
    key: day,
    label: compact ? day.slice(8) : weekdayShort(day),
    value: diapers.filter((row) => localDateKey(row.occurredAt) === day).length,
  }));

  const weights = measures.filter((row) => row.type === 'WEIGHT');

  return (
    <div className="screen">
      <h1>Où en est {baby?.name ?? 'bébé'} ?</h1>
      <ActiveNowPanel />
      <PeriodSelector value={period} onChange={setPeriod} />

      <p className="dash-section">Apports</p>
      <div className="dashboard-stats">
        <div className="stat stat-meal">
          <span className="muted">Repas</span>
          <MealPie
            breastCount={breastCount}
            bottleCount={bottleCount}
            otherCount={0}
            feedingMinutes={feedingMinutes}
            bottleMl={bottleMl}
          />
        </div>
        <div className="stat-row-2">
          <StatTile
            label="Diversification"
            value={solidsCount}
            sub={lastSolid ? lastSolid.food : '—'}
          />
          <StatTile
            label="Compléments"
            value={supplementsCount}
            sub={lastSupplement ? lastSupplement.name : '—'}
          />
        </div>
      </div>

      <p className="dash-section">Graphiques</p>
      <Bars title="Repas (nombre)" data={mealBars} tone="meal" />
      <Bars title="Sommeil (h)" data={sleepBars} tone="sleep" />
      <Bars title="Couches" data={diaperBars} tone="pee" />
      {weights.length > 1 ? (
        <Card>
          <h2>Évolution poids (kg)</h2>
          <p>
            {[...weights]
              .reverse()
              .map((row) => `${row.value}`.replace('.', ','))
              .join(' → ')}
          </p>
          <p className="muted">Dernière pesée · {formatDateTime(weights[0].measuredAt)}</p>
        </Card>
      ) : null}

      <p className="dash-section">Suivi</p>
      <div className="dashboard-stats">
        <div className="stat-row-4">
          <StatTile
            label="Couches"
            value={diaperCount}
            sub={lastDiaper ? formatTime(lastDiaper.occurredAt) : '—'}
          />
          <StatTile
            label="Sommeil"
            value={sleepMs > 0 ? formatMinutes(sleepMs) : '—'}
            sub={activeSleep ? 'en cours' : '—'}
          />
          <StatTile label="Stock lait" value={`${stockMl} ml`} sub={pumps.length ? `${pumps.length} lot(s)` : '—'} />
          <StatTile
            label="Tiré"
            value={pumpedMl > 0 ? `${pumpedMl} ml` : '—'}
            sub="sur la période"
          />
        </div>
        <div className="stat-row-4">
          <StatTile label="Poids" value={weightFmt.value} sub={lastWeight ? `kg · ${weightFmt.sub}` : 'kg'} />
          <StatTile label="Taille" value={heightFmt.value} sub={lastHeight ? `cm · ${heightFmt.sub}` : 'cm'} />
          <StatTile label="PC" value={headFmt.value} sub={lastHead ? `cm · ${headFmt.sub}` : 'cm'} />
          <StatTile
            label="Temp."
            value={lastTemp ? `${lastTemp.celsius}°` : '—'}
            sub={lastTemp ? formatTime(lastTemp.measuredAt) : `${tempsCount} mesure(s)`}
          />
        </div>
        <StatTile
          label="Notes"
          value={notesCount}
          sub={openNoteTodos.length > 0 ? `${openNoteTodos.length} à faire` : '—'}
        />
      </div>
      {openNoteTodos.length > 0 ? (
        <div className="dash-note-todos">
          {openNoteTodos.map((row) => (
            <label key={row.id} className="dash-note-todo">
              <input type="checkbox" onChange={() => void completeNoteTodo(row.id)} />
              <span>{row.body}</span>
            </label>
          ))}
        </div>
      ) : null}

      <Card>
        <h2>Alertes</h2>
        <div className="alert-line">
          <span className="muted">Repas</span>
          <span>
            {mealAlert}
            {bottleMlAlert ? (
              <>
                <br />
                <span className="muted">{bottleMlAlert}</span>
              </>
            ) : null}
          </span>
        </div>
        <div className="alert-line">
          <span className="muted">Sommeil</span>
          <span>{sleepAlert}</span>
        </div>
        <div className="alert-line">
          <span className="muted">Couche</span>
          <span>{diaperAlert}</span>
        </div>
      </Card>

      <Card>
        <h2>Entrées de la période</h2>
        {periodActivity.length === 0 ? (
          <p className="muted">Rien de noté sur cette période.</p>
        ) : (
          periodActivity.map((row) => (
            <div className="line log-line-static" key={`${row.kind}-${row.id}`}>
              <span>
                <strong>{formatTime(row.at)}</strong>
                <span className="muted"> · {row.title}</span>
              </span>
              <span className="muted">{row.detail}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function Bars({
  title,
  data,
  tone,
}: {
  title: string;
  data: { key: string; label: string; value: number }[];
  tone?: 'sleep' | 'pee' | 'meal';
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const compact = data.length > 10;
  return (
    <Card>
      <h2>{title}</h2>
      <div className="bars-wrap">
        <div className={`bars ${compact ? 'compact' : ''}`}>
          {data.map((d) => (
            <div className="bar-col" key={d.key}>
              <div className="bar-stack">
                <div
                  className={`bar ${tone ?? ''}${d.value <= 0 ? ' empty' : ''}`}
                  style={{ height: `${d.value > 0 ? Math.max(14, (d.value / max) * 100) : 4}%` }}>
                  {d.value > 0 ? <span className="bar-value">{d.value}</span> : null}
                </div>
              </div>
              <span className="bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
