import { useEffect, useMemo, useState } from 'react';

import { Card, Chip } from '@/components/ui';
import {
  getReminder,
  listBottles,
  listDiapers,
  listMeasurements,
  listPumps,
  listSessions,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BottleFeed, DiaperEvent, FeedingSession, Measurement, PumpingSession } from '@/db/types';
import {
  eachLocalDay,
  elapsedMs,
  formatDateTime,
  formatFeedLabel,
  formatMinutes,
  formatTime,
  localDateKey,
  periodRange,
  weekdayShort,
  type Period,
} from '@/lib/dates';

export function DashboardPage() {
  const { baby, tick } = useDb();
  const [period, setPeriod] = useState<Period>('today');
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [bottles, setBottles] = useState<BottleFeed[]>([]);
  const [diapers, setDiapers] = useState<DiaperEvent[]>([]);
  const [pumps, setPumps] = useState<PumpingSession[]>([]);
  const [weights, setWeights] = useState<Measurement[]>([]);
  const [delay, setDelay] = useState(0);

  useEffect(() => {
    if (!baby) return;
    Promise.all([
      listSessions(baby.id),
      listBottles(baby.id),
      listDiapers(baby.id),
      listPumps(baby.id),
      listMeasurements(baby.id),
      getReminder(baby.id),
    ]).then(([s, b, d, p, m, r]) => {
      setSessions(s);
      setBottles(b);
      setDiapers(d);
      setPumps(p);
      setWeights(m.filter((row) => row.type === 'WEIGHT'));
      setDelay(r?.delayMinutes ?? 0);
    });
  }, [baby, tick]);

  const from = periodRange(period).from;
  const inRange = (iso: string) => !from || iso >= from;
  const sessionsRange = sessions.filter((row) => inRange(row.startedAt));
  const last = sessions[0];
  const feedingMs = sessionsRange.reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0);
  const pumpedMl = pumps.filter((row) => inRange(row.startedAt)).reduce((sum, row) => sum + (row.amountMl ?? 0), 0);

  const nextReminder = useMemo(() => {
    if (!last?.endedAt || delay <= 0) return null;
    const fire = new Date(last.endedAt);
    fire.setMinutes(fire.getMinutes() + delay);
    if (fire.getTime() <= Date.now()) return null;
    return fire.toISOString();
  }, [last, delay]);

  const days = eachLocalDay(
    period === '30d' || period === 'all' ? periodRange('30d').from! : periodRange('7d').from!,
  );
  const compact = days.length > 10;

  const feedingBars = days.map((day) => ({
    key: day,
    label: compact ? day.slice(8) : weekdayShort(day),
    value: Math.round(
      sessions
        .filter((row) => localDateKey(row.startedAt) === day)
        .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0) / 60_000,
    ),
  }));
  const bottleBars = days.map((day) => ({
    key: day,
    label: compact ? day.slice(8) : weekdayShort(day),
    value: bottles.filter((row) => localDateKey(row.fedAt) === day).reduce((sum, row) => sum + row.amountMl, 0),
  }));
  const diaperBars = days.map((day) => ({
    key: day,
    label: compact ? day.slice(8) : weekdayShort(day),
    value: diapers.filter((row) => localDateKey(row.occurredAt) === day).length,
  }));

  return (
    <div className="screen">
      <h1>Où en est {baby?.name ?? 'bébé'} ?</h1>
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
        <div className="stat">
          <span className="muted">Tétées</span>
          <b>{sessionsRange.length}</b>
        </div>
        <div className="stat">
          <span className="muted">Couches</span>
          <b>{diapers.filter((row) => inRange(row.occurredAt)).length}</b>
        </div>
        <div className="stat">
          <span className="muted">Allaitement</span>
          <b>{feedingMs > 0 ? formatMinutes(feedingMs) : '—'}</b>
        </div>
        <div className="stat">
          <span className="muted">Tirage</span>
          <b>{pumpedMl} ml</b>
        </div>
      </div>
      <Card>
        <h2>Dernière tétée</h2>
        {last ? (
          <>
            <strong>{formatDateTime(last.startedAt)}</strong>
            <p className="muted">
              {last.endedAt ? formatFeedLabel(last.startedAt, last.endedAt) : 'en cours'}
            </p>
          </>
        ) : (
          <p className="muted">Pas encore de tétée.</p>
        )}
        <h2>Prochain rappel</h2>
        <p className="muted">
          {last && !last.endedAt
            ? 'Tétée en cours'
            : nextReminder
              ? formatTime(nextReminder)
              : 'Aucun rappel programmé'}
        </p>
      </Card>
      <Bars title="Durée d’allaitement (min)" data={feedingBars} />
      <Bars title="Biberons (ml)" data={bottleBars} tone="accent" />
      <Bars title="Couches" data={diaperBars} tone="pee" />
      <Card>
        <h2>Poids (kg)</h2>
        {weights.length < 2 ? (
          <p className="muted">Ajoute au moins deux pesées.</p>
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

function Bars({
  title,
  data,
  tone,
}: {
  title: string;
  data: { key: string; label: string; value: number }[];
  tone?: 'accent' | 'pee';
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
              <div
                className={`bar ${tone ?? ''}`}
                style={{ height: `${Math.max(6, (d.value / max) * 100)}%` }}
              />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
