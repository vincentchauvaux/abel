import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AccordionSection } from '@/components/Accordion';
import { ActiveNowPanel } from '@/components/ActiveNowPanel';
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
import { formatTemperature, temperatureLevelClass } from '@/lib/temperature';
import { FAVORITES_CHANGED, readToolFavorites, TOOLS, type ToolId } from '@/lib/tools';
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

type FollowRow = {
  label: string;
  value: string | number;
  sub?: string;
  to: string;
  valueClassName?: string;
};

function FollowRowItem({ label, value, sub, to, valueClassName }: FollowRow) {
  return (
    <div className="dash-follow-row">
      <div className="dash-follow-main">
        <span className="muted">{label}</span>
        <div className="dash-follow-values">
          <strong className={valueClassName}>{value}</strong>
          {sub ? <span className="muted dash-follow-sub">{sub}</span> : null}
        </div>
      </div>
      <Link to={to} className="dash-follow-add" aria-label={`Ajouter · ${label}`}>
        +
      </Link>
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
  const [notesOpen, setNotesOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => readToolFavorites());
  const now = useNow(true, 30_000);

  useEffect(() => {
    const sync = () => setFavorites(readToolFavorites());
    window.addEventListener(FAVORITES_CHANGED, sync);
    return () => window.removeEventListener(FAVORITES_CHANGED, sync);
  }, []);

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
  const openNoteTodos = useMemo(
    () => notes.filter((row) => row.isTodo && !row.doneAt),
    [notes],
  );

  const toggleNotesSection = (id: string) => {
    if (id === 'notes') setNotesOpen((open) => !open);
  };
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

  const followRows: FollowRow[] = [
    {
      label: 'Couches',
      value: diaperCount,
      sub: lastDiaper ? formatTime(lastDiaper.occurredAt) : '—',
      to: '/diapers',
    },
    {
      label: 'Sommeil',
      value: sleepMs > 0 ? formatMinutes(sleepMs) : '—',
      sub: activeSleep ? 'en cours' : '—',
      to: '/sleep',
    },
    {
      label: 'Tire-lait',
      value: `${stockMl} ml`,
      sub:
        pumpedMl > 0
          ? `${pumpedMl} ml tiré sur la période`
          : pumps.length
            ? `${pumps.length} lot(s)`
            : '—',
      to: '/pumping',
    },
    {
      label: 'Poids',
      value: lastWeight ? `${weightFmt.value} kg` : '—',
      sub: lastWeight ? weightFmt.sub : undefined,
      to: '/growth',
    },
    {
      label: 'Taille',
      value: lastHeight ? `${heightFmt.value} cm` : '—',
      sub: lastHeight ? heightFmt.sub : undefined,
      to: '/growth',
    },
    {
      label: 'PC',
      value: lastHead ? `${headFmt.value} cm` : '—',
      sub: lastHead ? headFmt.sub : undefined,
      to: '/growth',
    },
    {
      label: 'Temp.',
      value: lastTemp ? `${formatTemperature(lastTemp.celsius)}°` : '—',
      sub: lastTemp ? formatTime(lastTemp.measuredAt) : `${tempsCount} mesure(s)`,
      to: '/temperature',
      valueClassName: lastTemp ? temperatureLevelClass(lastTemp.celsius) : undefined,
    },
  ];

  const mealTotal = breastCount + bottleCount;
  const mealRecap: string[] = [];
  if (breastCount > 0) mealRecap.push(`${breastCount} sein`);
  if (bottleCount > 0) mealRecap.push(`${bottleCount} bib`);
  if (bottleMl > 0) mealRecap.push(`${bottleMl} ml`);
  const apportRows: FollowRow[] = [
    {
      label: 'Repas',
      value: mealTotal > 0 ? mealTotal : '—',
      sub: mealRecap.length > 0 ? mealRecap.join(' · ') : mealAt ? formatTime(mealAt) : '—',
      to: '/feeding',
    },
    {
      label: 'Diversification',
      value: solidsCount > 0 ? solidsCount : '—',
      sub: lastSolid ? lastSolid.food : '—',
      to: '/solids',
    },
    {
      label: 'Compléments',
      value: supplementsCount > 0 ? supplementsCount : '—',
      sub: lastSupplement ? lastSupplement.name : '—',
      to: '/supplements',
    },
  ];

  const toolRows = useMemo((): Record<ToolId, FollowRow> => {
    const growthSub = lastHeight
      ? `${heightFmt.value} cm`
      : lastHead
        ? `PC ${headFmt.value} cm`
        : undefined;
    return {
      feeding: {
        label: TOOLS.feeding.label,
        value: breastCount > 0 ? breastCount : '—',
        sub: lastFeed ? formatTime(lastFeed.startedAt) : '—',
        to: TOOLS.feeding.route,
      },
      bottle: {
        label: TOOLS.bottle.label,
        value: bottleMl > 0 ? `${bottleMl} ml` : bottleCount > 0 ? bottleCount : '—',
        sub: bottleCount > 0 ? `${bottleCount} bib` : '—',
        to: TOOLS.bottle.route,
      },
      solids: {
        label: TOOLS.solids.label,
        value: solidsCount > 0 ? solidsCount : '—',
        sub: lastSolid ? lastSolid.food : '—',
        to: TOOLS.solids.route,
      },
      supplements: {
        label: TOOLS.supplements.label,
        value: supplementsCount > 0 ? supplementsCount : '—',
        sub: lastSupplement ? lastSupplement.name : '—',
        to: TOOLS.supplements.route,
      },
      diapers: {
        label: TOOLS.diapers.label,
        value: diaperCount > 0 ? diaperCount : '—',
        sub: lastDiaper ? formatTime(lastDiaper.occurredAt) : '—',
        to: TOOLS.diapers.route,
      },
      pumping: {
        label: TOOLS.pumping.label,
        value: `${stockMl} ml`,
        sub:
          pumpedMl > 0
            ? `${pumpedMl} ml tiré sur la période`
            : pumps.length
              ? `${pumps.length} lot(s)`
              : '—',
        to: TOOLS.pumping.route,
      },
      growth: {
        label: TOOLS.growth.label,
        value: lastWeight ? `${weightFmt.value} kg` : '—',
        sub: growthSub ?? '—',
        to: TOOLS.growth.route,
      },
      sleep: {
        label: TOOLS.sleep.label,
        value: sleepMs > 0 ? formatMinutes(sleepMs) : '—',
        sub: activeSleep ? 'en cours' : '—',
        to: TOOLS.sleep.route,
      },
      temperature: {
        label: TOOLS.temperature.label,
        value: lastTemp ? `${formatTemperature(lastTemp.celsius)}°` : '—',
        sub: lastTemp ? formatTime(lastTemp.measuredAt) : `${tempsCount} mesure(s)`,
        to: TOOLS.temperature.route,
        valueClassName: lastTemp ? temperatureLevelClass(lastTemp.celsius) : undefined,
      },
      notes: {
        label: TOOLS.notes.label,
        value: openNoteTodos.length > 0 ? openNoteTodos.length : notes.length > 0 ? notes.length : '—',
        sub: openNoteTodos.length > 0 ? `${openNoteTodos.length} à faire` : notes.length > 0 ? 'notes' : '—',
        to: TOOLS.notes.route,
      },
    };
  }, [
    breastCount,
    bottleCount,
    bottleMl,
    solidsCount,
    supplementsCount,
    diaperCount,
    stockMl,
    pumpedMl,
    pumps.length,
    sleepMs,
    activeSleep,
    lastFeed,
    lastSolid,
    lastSupplement,
    lastDiaper,
    lastWeight,
    lastHeight,
    lastHead,
    lastTemp,
    tempsCount,
    weightFmt,
    heightFmt,
    headFmt,
    openNoteTodos.length,
    notes.length,
  ]);

  const favoriteRows = useMemo(
    () => favorites.map((id) => toolRows[id]).filter(Boolean),
    [favorites, toolRows],
  );

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

      {favoriteRows.length > 0 ? (
        <>
          <p className="dash-section">Favoris</p>
          <div className="dash-follow-list">
            {favoriteRows.map((row) => (
              <FollowRowItem key={row.label} {...row} />
            ))}
          </div>
        </>
      ) : null}

      <p className="dash-section">Apports</p>
      <div className="dash-follow-list">
        {apportRows.map((row) => (
          <FollowRowItem key={row.label} {...row} />
        ))}
      </div>

      <p className="dash-section">Suivi</p>
      <div className="dash-follow-list">
        {followRows.map((row) => (
          <FollowRowItem key={row.label} {...row} />
        ))}
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

      <AccordionSection
        id="notes"
        title="Notes"
        open={notesOpen}
        onToggle={toggleNotesSection}
        action={
          openNoteTodos.length > 0 ? (
            <span className="dash-notes-badge">{openNoteTodos.length} à faire</span>
          ) : notes.length > 0 ? (
            <span className="dash-notes-badge muted">{notes.length}</span>
          ) : null
        }>
        {notes.length === 0 ? (
          <p className="muted">Pas encore de note.</p>
        ) : (
          <div className="dash-notes-list">
            {notes.map((row) =>
              row.isTodo && !row.doneAt ? (
                <button
                  key={row.id}
                  type="button"
                  className="dash-note-item dash-note-todo-btn"
                  onClick={() => void completeNoteTodo(row.id)}>
                  <span className="muted">{formatDateTime(row.notedAt)}</span>
                  <p>{row.body}</p>
                </button>
              ) : (
                <div key={row.id} className="dash-note-item">
                  <span className="muted">
                    {formatDateTime(row.isTodo && row.doneAt ? row.doneAt : row.notedAt)}
                    {row.isTodo && row.doneAt ? ' · fait' : ''}
                  </span>
                  <p>{row.body}</p>
                </div>
              ),
            )}
          </div>
        )}
      </AccordionSection>

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
              <span className={row.tempCelsius != null ? temperatureLevelClass(row.tempCelsius) : 'muted'}>
                {row.detail}
              </span>
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
