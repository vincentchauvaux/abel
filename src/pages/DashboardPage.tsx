import { useEffect, useMemo, useState } from 'react';

import { ActiveNowPanel } from '@/components/ActiveNowPanel';
import { MealCircles } from '@/components/MealCircles';
import { Card, Chip } from '@/components/ui';
import {
  getReminder,
  listBottles,
  listDiapers,
  listMeasurements,
  listPumps,
  listSessions,
  listSleep,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BottleFeed, DiaperEvent, FeedingSession, Measurement, PumpingSession, SleepSession } from '@/db/types';
import {
  eachLocalDay,
  elapsedMs,
  formatDateTime,
  formatMinutes,
  formatTime,
  localDateKey,
  periodRange,
  weekdayShort,
  type Period,
} from '@/lib/dates';
import { lastMealAt } from '@/lib/reminders';

export function DashboardPage() {
  const { baby, tick } = useDb();
  const [period, setPeriod] = useState<Period>('today');
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [bottles, setBottles] = useState<BottleFeed[]>([]);
  const [diapers, setDiapers] = useState<DiaperEvent[]>([]);
  const [pumps, setPumps] = useState<PumpingSession[]>([]);
  const [sleeps, setSleeps] = useState<SleepSession[]>([]);
  const [weights, setWeights] = useState<Measurement[]>([]);
  const [delay, setDelay] = useState(0);

  useEffect(() => {
    if (!baby) return;
    Promise.all([
      listSessions(baby.id),
      listBottles(baby.id),
      listDiapers(baby.id),
      listPumps(baby.id),
      listSleep(baby.id),
      listMeasurements(baby.id),
      getReminder(baby.id),
    ]).then(([s, b, d, p, sl, m, r]) => {
      setSessions(s);
      setBottles(b);
      setDiapers(d);
      setPumps(p);
      setSleeps(sl);
      setWeights(m.filter((row) => row.type === 'WEIGHT'));
      setDelay(r?.delayMinutes ?? 0);
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
  const sleepMs = sleeps
    .filter((row) => inRange(row.startedAt))
    .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0);

  const lastFeed = sessions[0];
  const lastBottle = bottles[0];
  const mealAt = useMemo(() => lastMealAt(lastFeed, lastBottle), [lastFeed, lastBottle]);

  const lastMealLabel = useMemo(() => {
    if (!mealAt) return null;
    const feedAt = lastFeed?.endedAt ?? null;
    const bottleAt = lastBottle?.fedAt ?? null;
    const wasBottle = Boolean(bottleAt && (!feedAt || bottleAt >= feedAt));
    if (wasBottle && lastBottle) {
      return `${formatDateTime(mealAt)} · biberon ${lastBottle.amountMl} ml`;
    }
    return `${formatDateTime(mealAt)} · tétée`;
  }, [mealAt, lastFeed, lastBottle]);

  const nextReminder = useMemo(() => {
    if (!mealAt || delay <= 0) return null;
    if (lastFeed && !lastFeed.endedAt) return null;
    const fire = new Date(mealAt);
    fire.setMinutes(fire.getMinutes() + delay);
    if (fire.getTime() <= Date.now()) return null;
    return fire.toISOString();
  }, [mealAt, delay, lastFeed]);

  const days = eachLocalDay(
    period === '30d' || period === 'all' ? periodRange('30d').from! : periodRange('7d').from!,
  );
  const compact = days.length > 10;

  const mealBars = days.map((day) => ({
    key: day,
    label: compact ? day.slice(8) : weekdayShort(day),
    breast: sessions.filter((row) => localDateKey(row.startedAt) === day).length,
    bottle: bottles.filter((row) => localDateKey(row.fedAt) === day).length,
  }));
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

  return (
    <div className="screen">
      <h1>Où en est {baby?.name ?? 'bébé'} ?</h1>
      <ActiveNowPanel />
      <div className="row">
        {([
          ['today', 'Aujourd’hui'],
          ['7d', '7 jours'],
          ['30d', '30 jours'],
          ['all', 'Tout'],
        ] as const).map(([key, label]) => (
          <Chip key={key} label={label} selected={period === key} onClick={() => setPeriod(key)} />
        ))}
      </div>
      <div className="grid-2">
        <div className="stat stat-meal">
          <span className="muted">Repas</span>
          <MealCircles
            breastCount={breastCount}
            bottleCount={bottleCount}
            feedingMinutes={feedingMinutes}
            bottleMl={bottleMl}
          />
        </div>
        <div className="stat">
          <span className="muted">Couches</span>
          <b>{diapers.filter((row) => inRange(row.occurredAt)).length}</b>
        </div>
        <div className="stat">
          <span className="muted">Sommeil</span>
          <b>{sleepMs > 0 ? formatMinutes(sleepMs) : '—'}</b>
        </div>
        <div className="stat">
          <span className="muted">Stock lait</span>
          <b>{stockMl} ml</b>
        </div>
      </div>
      <Card>
        <h2>Dernier repas</h2>
        {lastMealLabel ? (
          <strong>{lastMealLabel}</strong>
        ) : (
          <p className="muted">Pas encore de repas.</p>
        )}
        <h2>Prochain rappel</h2>
        <p className="muted">
          {lastFeed && !lastFeed.endedAt
            ? 'Repas en cours (tétée)'
            : nextReminder
              ? formatTime(nextReminder)
              : 'Aucun rappel programmé'}
        </p>
      </Card>
      <StackedMealBars title="Repas (nombre)" data={mealBars} />
      <Bars title="Sommeil (h)" data={sleepBars} tone="sleep" />
      <Bars title="Couches" data={diaperBars} tone="pee" />
      <Card>
        <h2>Poids (kg)</h2>
        {weights.length === 0 ? (
          <p className="muted">Pas encore de pesée.</p>
        ) : weights.length === 1 ? (
          <p>
            <strong>{`${weights[0].value}`.replace('.', ',')} kg</strong>
            <span className="muted"> · {formatDateTime(weights[0].measuredAt)}</span>
          </p>
        ) : (
          <p>
            {[...weights]
              .reverse()
              .map((row) => `${row.value}`.replace('.', ','))
              .join(' → ')}
          </p>
        )}
      </Card>
    </div>
  );
}

function StackedMealBars({
  title,
  data,
}: {
  title: string;
  data: { key: string; label: string; breast: number; bottle: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.breast + d.bottle));
  const compact = data.length > 10;
  return (
    <Card>
      <h2>{title}</h2>
      <div className="bar-legend">
        <span className="leg-breast">Sein</span>
        <span className="leg-bottle">Biberon</span>
      </div>
      <div className="bars-wrap">
        <div className={`bars ${compact ? 'compact' : ''}`}>
          {data.map((d) => {
            const total = d.breast + d.bottle;
            const breastH = total > 0 ? (d.breast / max) * 100 : 0;
            const bottleH = total > 0 ? (d.bottle / max) * 100 : 0;
            return (
              <div className="bar-col" key={d.key}>
                <div className="bar-stack">
                  {d.bottle > 0 ? (
                    <div
                      className="bar bottle"
                      style={{ height: `${Math.max(8, bottleH)}%` }}>
                      <span className="bar-value">{d.bottle}</span>
                    </div>
                  ) : null}
                  {d.breast > 0 ? (
                    <div
                      className="bar breast"
                      style={{ height: `${Math.max(8, breastH)}%` }}>
                      <span className="bar-value">{d.breast}</span>
                    </div>
                  ) : null}
                  {total <= 0 ? <div className="bar empty" style={{ height: '4%' }} /> : null}
                </div>
                <span className="bar-label">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function Bars({
  title,
  data,
  tone,
}: {
  title: string;
  data: { key: string; label: string; value: number }[];
  tone?: 'sleep' | 'pee';
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
