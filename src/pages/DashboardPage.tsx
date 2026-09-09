import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AccordionSection } from '@/components/Accordion';
import { ActiveNowPanel } from '@/components/ActiveNowPanel';
import { ActivityEditor } from '@/components/ActivityEditor';
import { DayTimeline } from '@/components/DayTimeline';
import { GrowthChart } from '@/components/GrowthChart';
import { JournalLine } from '@/components/JournalLine';
import { PeriodSelector } from '@/components/PeriodSelector';
import { RatioPie } from '@/components/RatioPie';
import { SleepClock } from '@/components/SleepClock';
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
  clipToLocalDay,
  eachLocalDay,
  elapsedMs,
  formatDateTime,
  formatMinuteCount,
  formatMinutes,
  formatTime,
  isNotFuture,
  localDateKey,
  periodRange,
  startOfLocalDay,
  weekdayShort,
  type Period,
} from '@/lib/dates';
import { formatTemperature, temperatureLevelClass } from '@/lib/temperature';
import { FAVORITES_CHANGED, readToolFavorites, TOOL_IDS, TOOLS, toggleToolFavorite, type ToolId } from '@/lib/tools';
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

type BarTone = 'sleep' | 'pee' | 'poo' | 'both' | 'meal' | 'breast' | 'bottle';

type BarSegment = { key: string; value: number; tone: BarTone; display?: string };

type BarDatum = {
  key: string;
  label: string;
  value: number;
  display?: string;
  above?: string;
  segments?: BarSegment[];
};

function isNotedSession(startedAt: string, endedAt?: string | null) {
  if (!endedAt) return false;
  return endedAt === startedAt || elapsedMs(startedAt, endedAt) < 15_000;
}

function sessionMinutes(startedAt: string, endedAt?: string | null, now = Date.now()) {
  if (isNotedSession(startedAt, endedAt)) return 0;
  return Math.max(0, Math.round(elapsedMs(startedAt, endedAt, now) / 60_000));
}

function compactBarMinutes(minutes: number, noted = false) {
  if (noted || minutes <= 0) return '';
  if (minutes < 60) return String(minutes);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${mins}`;
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
  const [editing, setEditing] = useState<ActivityItem | null>(null);
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
  const startedInRange = (iso: string) => inRange(iso) && isNotFuture(iso, now);

  const sessionsRange = sessions.filter((row) => startedInRange(row.startedAt));
  const bottlesRange = bottles.filter((row) => inRange(row.fedAt));
  const breastCount = sessionsRange.length;
  const bottleCount = bottlesRange.length;
  const bottleMl = bottlesRange.reduce((sum, row) => sum + (Number(row.amountMl) || 0), 0);
  const stockMl = pumps.reduce((sum, row) => sum + (Number(row.remainingMl) || 0), 0);
  const pumpedMl = pumps
    .filter((row) => inRange(row.startedAt))
    .reduce((sum, row) => sum + (Number(row.amountMl) || 0), 0);
  const sleepMs = sleeps
    .filter((row) => startedInRange(row.startedAt))
    .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0);
  const diaperCount = diapers.filter((row) => inRange(row.occurredAt)).length;
  const solidsCount = solids.filter((row) => inRange(row.eatenAt)).length;
  const supplementsCount = supplements.filter((row) => inRange(row.givenAt)).length;
  const openNoteTodos = useMemo(
    () => notes.filter((row) => row.isTodo && !row.doneAt),
    [notes],
  );

  const dashboardNotes = useMemo(() => {
    const filtered = notes.filter((row) => {
      if (row.isTodo && !row.doneAt) return true;
      const at = row.isTodo && row.doneAt ? row.doneAt : row.notedAt;
      return inRange(at);
    });
    return filtered.sort((a, b) => {
      const aOpen = a.isTodo && !a.doneAt;
      const bOpen = b.isTodo && !b.doneAt;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      const aAt = a.isTodo && a.doneAt ? a.doneAt! : a.notedAt;
      const bAt = b.isTodo && b.doneAt ? b.doneAt! : b.notedAt;
      return bAt.localeCompare(aAt);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inRange dépend de period
  }, [notes, period, from, todayKey]);

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

  const apportRows: FollowRow[] = [
    {
      label: TOOLS.bottle.label,
      value: bottleMl > 0 ? `${bottleMl} ml` : bottleCount > 0 ? bottleCount : '—',
      sub: bottleCount > 0 ? `${bottleCount} bib` : lastBottle ? formatTime(lastBottle.fedAt) : '—',
      to: TOOLS.bottle.route,
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

  const isAll = period === 'all';
  const firstStamp = [
    ...sessions.map((row) => row.startedAt),
    ...bottles.map((row) => row.fedAt),
    ...sleeps.map((row) => row.startedAt),
    ...diapers.map((row) => row.occurredAt),
  ]
    .filter((iso) => isNotFuture(iso, now))
    .sort()[0];
  const days = eachLocalDay(
    isAll
      ? firstStamp
        ? startOfLocalDay(new Date(firstStamp)).toISOString()
        : periodRange('30d').from!
      : period === '30d'
        ? periodRange('30d').from!
        : periodRange('7d').from!,
  );
  const compact = days.length > 10 && !isAll;
  const isToday = period === 'today';
  const dayLabel = (day: string) => {
    if (isAll) return `${Number(day.slice(8))}/${Number(day.slice(5, 7))}`;
    return compact ? day.slice(8) : weekdayShort(day);
  };

  const mealByDay = days.map((day) => {
    const breastRows = sessions.filter(
      (row) => localDateKey(row.startedAt) === day && isNotFuture(row.startedAt, now),
    );
    const bottleRows = bottles.filter((row) => localDateKey(row.fedAt) === day && isNotFuture(row.fedAt, now));
    return {
      day,
      breastCount: breastRows.length,
      bottleCount: bottleRows.length,
      breastMin: breastRows.reduce((sum, row) => sum + sessionMinutes(row.startedAt, row.endedAt, now), 0),
      bottleMl: bottleRows.reduce((sum, row) => sum + (Number(row.amountMl) || 0), 0),
    };
  });
  const mealBars: BarDatum[] = mealByDay.map((row) => {
    const total = row.breastCount + row.bottleCount;
    const minLabel = compactBarMinutes(row.breastMin);
    const mlLabel = row.bottleMl > 0 ? String(row.bottleMl) : '';
    return {
      key: row.day,
      label: dayLabel(row.day),
      value: total,
      above: total > 0 ? String(total) : '',
      segments: [
        {
          key: 'breast',
          value: row.breastCount,
          tone: 'breast',
          display: minLabel,
        },
        {
          key: 'bottle',
          value: row.bottleCount,
          tone: 'bottle',
          display: mlLabel,
        },
      ],
    };
  });
  const sleepBars: BarDatum[] = days.map((day) => ({
    key: day,
    label: dayLabel(day),
    value: Math.round(
      sleeps
        .filter((row) => localDateKey(row.startedAt) === day && isNotFuture(row.startedAt, now))
        .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0) / 3_600_000,
    ),
  }));
  const diaperBars: BarDatum[] = days.map((day) => {
    const rows = diapers.filter((row) => localDateKey(row.occurredAt) === day);
    const pee = rows.filter((row) => row.kind === 'PEE').length;
    const poo = rows.filter((row) => row.kind === 'POO').length;
    const both = rows.filter((row) => row.kind === 'BOTH').length;
    const total = pee + poo + both;
    return {
      key: day,
      label: dayLabel(day),
      value: total,
      display: total > 0 ? String(total) : '',
      segments: [
        { key: 'pee', value: pee, tone: 'pee' },
        { key: 'poo', value: poo, tone: 'poo' },
        { key: 'both', value: both, tone: 'both' },
      ],
    };
  });
  const mealPeriodBreast = mealByDay.reduce((sum, row) => sum + row.breastCount, 0);
  const mealPeriodBottle = mealByDay.reduce((sum, row) => sum + row.bottleCount, 0);
  const mealPeriodMin = mealByDay.reduce((sum, row) => sum + row.breastMin, 0);
  const mealPeriodMl = mealByDay.reduce((sum, row) => sum + row.bottleMl, 0);
  const diapersToday = diapers.filter((row) => inRange(row.occurredAt));
  const diaperPee = diapersToday.filter((row) => row.kind === 'PEE').length;
  const diaperPoo = diapersToday.filter((row) => row.kind === 'POO').length;
  const diaperBoth = diapersToday.filter((row) => row.kind === 'BOTH').length;
  const feedingMinutesToday = sessionsRange.reduce(
    (sum, row) => sum + sessionMinutes(row.startedAt, row.endedAt, now),
    0,
  );
  const sleepMinutesToday = sleeps.reduce((sum, row) => {
    const clip = clipToLocalDay(row.startedAt, row.endedAt, todayKey, now);
    return sum + (clip ? clip.endMin - clip.startMin : 0);
  }, 0);
  const sleepsInPeriod = sleeps.filter((row) => {
    if (!isNotFuture(row.startedAt, now)) return false;
    const start = new Date(row.startedAt).getTime();
    const end = row.endedAt ? new Date(row.endedAt).getTime() : now;
    const fromMs = from ? new Date(from).getTime() : 0;
    return end > fromMs && start <= now;
  });
  const dayTimelineHint = [
    feedingMinutesToday > 0 ? `${formatMinuteCount(feedingMinutesToday)} tétées` : null,
    sleepMinutesToday > 0 ? `${formatMinuteCount(Math.round(sleepMinutesToday))} siestes` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="screen dashboard-screen">
      <h1>Où en est {baby?.name ?? 'bébé'} ?</h1>
      <ActiveNowPanel />
      <PeriodSelector value={period} onChange={setPeriod} />

      <p className="dash-section">Favoris</p>
      {favoriteRows.length > 0 ? (
        <div className="dash-follow-list">
          {favoriteRows.map((row) => (
            <FollowRowItem key={row.label} {...row} />
          ))}
        </div>
      ) : (
        <div className="dash-fav-add">
          <label className="dash-fav-select-wrap">
            <span className="sr-only">Ajouter un favori</span>
            <select
              className="dash-fav-select"
              value=""
              onChange={(event) => {
                const id = event.target.value as ToolId;
                if (id) toggleToolFavorite(id);
              }}>
              <option value="">Ajouter un favori…</option>
              {TOOL_IDS.map((id) => (
                <option key={id} value={id}>
                  {TOOLS[id].label}
                </option>
              ))}
            </select>
          </label>
          <span className="dash-follow-add" aria-hidden>
            +
          </span>
        </div>
      )}

      <p className="dash-section">Graphiques</p>
      {isToday ? (
        <DayTimeline feeds={sessions} sleeps={sleeps} now={now} hint={dayTimelineHint || undefined} />
      ) : (
        <>
          <Bars
            title="Repas"
            data={mealBars}
            tone="meal"
            alignEnd
            wide={isAll}
            legend={
              <div className="bar-legend">
                <span className="leg-breast">Tétées</span>
                <span className="leg-bottle">Biberons</span>
              </div>
            }
            empty="Aucun repas sur cette période."
            hint={
              mealPeriodBreast + mealPeriodBottle > 0
                ? [
                    `${mealPeriodBreast + mealPeriodBottle} repas`,
                    mealPeriodBreast > 0 ? `${mealPeriodBreast} tétée${mealPeriodBreast > 1 ? 's' : ''}` : null,
                    mealPeriodBottle > 0 ? `${mealPeriodBottle} bib` : null,
                    mealPeriodMin > 0 ? formatMinuteCount(mealPeriodMin) : null,
                    mealPeriodMl > 0 ? `${mealPeriodMl} ml` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : undefined
            }
          />
          <Bars
            title="Sommeil (h)"
            data={sleepBars}
            tone="sleep"
            alignEnd
            wide={isAll}
            empty="Aucune sieste sur cette période."
          />
          <SleepClock sleeps={sleepsInPeriod} now={now} />
        </>
      )}
      {isToday ? (
        <Card>
          <h2>Couches</h2>
          {diapersToday.length === 0 ? (
            <p className="muted">Aucune couche aujourd’hui.</p>
          ) : (
            <RatioPie
              slices={[
                { key: 'pee', label: 'Pipi', value: diaperPee, color: 'var(--pee)', legendClass: 'leg-pee' },
                { key: 'poo', label: 'Caca', value: diaperPoo, color: 'var(--poo)', legendClass: 'leg-poo' },
                { key: 'both', label: 'Les deux', value: diaperBoth, color: 'var(--primary)', legendClass: 'leg-both' },
              ]}
              centerValue={diapersToday.length}
              centerLabel="couches"
              detail={[
                diaperPee + diaperBoth > 0 ? `${diaperPee + diaperBoth} pipi` : null,
                diaperPoo + diaperBoth > 0 ? `${diaperPoo + diaperBoth} caca` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
        </Card>
      ) : (
        <Bars
          title="Couches"
          data={diaperBars}
          tone="pee"
          alignEnd
          wide={isAll}
          legend={
            <div className="bar-legend">
              <span className="leg-pee">Pipi</span>
              <span className="leg-poo">Caca</span>
              <span className="leg-both">Les deux</span>
            </div>
          }
        />
      )}
      <GrowthChart
        weights={measures.filter((row) => row.type === 'WEIGHT')}
        heights={measures.filter((row) => row.type === 'HEIGHT')}
        bornOn={baby?.bornOn}
      />

      <AccordionSection
        id="notes"
        title="Notes"
        open={notesOpen}
        onToggle={toggleNotesSection}
        action={
          openNoteTodos.length > 0 ? (
            <span className="dash-notes-badge">{openNoteTodos.length} à faire</span>
          ) : dashboardNotes.length > 0 ? (
            <span className="dash-notes-badge muted">{dashboardNotes.length}</span>
          ) : null
        }>
        {dashboardNotes.length === 0 ? (
          <p className="muted">
            {notes.length === 0 ? 'Pas encore de note.' : 'Aucune note sur cette période.'}
          </p>
        ) : (
          <div className="dash-notes-list">
            {dashboardNotes.map((row) =>
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
                  <span className="muted dash-note-meta">
                    {formatDateTime(row.isTodo && row.doneAt ? row.doneAt : row.notedAt)}
                    {row.isTodo && row.doneAt ? (
                      <Check size={15} className="dash-note-done-check" aria-label="Fait" />
                    ) : null}
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

      <Card>
        <h2>Entrées de la période</h2>
        {periodActivity.length === 0 ? (
          <p className="muted">Rien de noté sur cette période.</p>
        ) : (
          periodActivity.map((row) => (
            <JournalLine key={`${row.kind}-${row.id}`} item={row} onClick={() => setEditing(row)} />
          ))
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function barHeight(value: number, max: number) {
  if (value <= 0) return 4;
  return Math.max(14, (value / max) * 100);
}

function Bars({
  title,
  data,
  tone,
  session = false,
  alignEnd = false,
  wide = false,
  empty,
  hint,
  header,
  legend,
}: {
  title: string;
  data: BarDatum[];
  tone?: BarTone;
  session?: boolean;
  alignEnd?: boolean;
  wide?: boolean;
  empty?: string;
  hint?: string;
  header?: ReactNode;
  legend?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const compact = !wide && data.length > 10;
  const dataKey = data.map((d) => d.key).join('|');
  const hasAbove = data.some((d) => d.above != null);

  useLayoutEffect(() => {
    if (!alignEnd) return;
    const el = wrapRef.current;
    if (!el) return;
    const align = () => {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    };
    align();
    const id = requestAnimationFrame(align);
    return () => cancelAnimationFrame(id);
  }, [alignEnd, dataKey, compact, wide, session, hasAbove]);

  return (
    <Card>
      <div className="card-head">
        <h2>{title}</h2>
        {header}
      </div>
      {data.length === 0 ? (
        <p className="muted">{empty ?? 'Rien à afficher.'}</p>
      ) : (
        <div className="bars-wrap" ref={wrapRef}>
          <div className={`bars ${compact ? 'compact' : ''} ${wide ? 'wide' : ''} ${session ? 'sessions' : ''}`.trim()}>
            {data.map((d) => {
              const segs = d.segments?.filter((seg) => seg.value > 0) ?? [];
              const shown = d.display || (segs.length > 0 ? '' : d.value > 0 ? String(d.value) : '');
              return (
                <div className="bar-col" key={d.key}>
                  {hasAbove ? <span className="bar-above">{d.above || '\u00a0'}</span> : null}
                  <div className="bar-stack">
                    <div
                      className={`bar ${tone ?? ''}${segs.length > 0 ? ' stacked' : ''}${d.value <= 0 ? ' empty' : ''}`}
                      style={{ height: `${barHeight(d.value, max)}%` }}>
                      {shown ? <span className="bar-value">{shown}</span> : null}
                      {segs.map((seg) => (
                        <div
                          key={seg.key}
                          className={`bar-seg ${seg.tone}`}
                          style={{ height: `${(seg.value / d.value) * 100}%` }}>
                          {seg.display ? <span className="bar-seg-value">{seg.display}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="bar-label">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {legend}
      {hint ? <p className="muted bars-hint">{hint}</p> : null}
    </Card>
  );
}
