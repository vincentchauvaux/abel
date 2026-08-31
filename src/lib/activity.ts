import {
  listBottles,
  listDiapers,
  listMeasurements,
  listNotes,
  listPumps,
  listSegments,
  listSessions,
  listSleep,
  listSolidFoods,
  listSupplements,
  listTemperatures,
} from '@/db/api';
import type {
  BottleFeed,
  DiaperEvent,
  FeedingSession,
  Measurement,
  Note,
  PumpingSession,
  SleepSession,
  SolidFood,
  Supplement,
  Temperature,
} from '@/db/types';
import { activityAt, activityAtFromDuration, formatFeedLabel, formatMinutes, elapsedMs } from '@/lib/dates';
import { formatTemperature } from '@/lib/temperature';
import { diaperLabel, measurementLabel, milkLabel, sideLabel } from '@/lib/labels';

export type ActivityKind =
  | 'feeding'
  | 'bottle'
  | 'diaper'
  | 'pumping'
  | 'solid'
  | 'supplement'
  | 'sleep'
  | 'temperature'
  | 'note'
  | 'measurement';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  detail: string;
  tempCelsius?: number;
};

export async function listActivity(babyId: string, limit?: number): Promise<ActivityItem[]> {
  const [sessions, segments, bottles, diapers, pumps, solids, supplements, sleeps, temps, notes, measures] =
    await Promise.all([
      listSessions(babyId),
      listSegments(),
      listBottles(babyId),
      listDiapers(babyId),
      listPumps(babyId),
      listSolidFoods(babyId),
      listSupplements(babyId),
      listSleep(babyId),
      listTemperatures(babyId),
      listNotes(babyId),
      listMeasurements(babyId),
    ]);

  const items: ActivityItem[] = [];

  for (const row of sessions) {
    const sides = [
      ...new Set(
        segments.filter((s) => s.feedingSessionId === row.id).map((s) => sideLabel[s.side]),
      ),
    ].join(' · ');
    items.push({
      id: row.id,
      kind: 'feeding',
      at: activityAt(row.startedAt, row.endedAt),
      title: 'Tétée',
      detail: `${row.endedAt ? formatFeedLabel(row.startedAt, row.endedAt) : 'en cours'}${sides ? ` · ${sides}` : ''}`,
    });
  }

  for (const row of bottles) {
    items.push({
      id: row.id,
      kind: 'bottle',
      at: row.fedAt,
      title: 'Biberon',
      detail: `${row.amountMl} ml · ${milkLabel[row.milkType]}${row.pumpingSessionId ? ' · stock' : ''}`,
    });
  }

  for (const row of diapers) {
    items.push({
      id: row.id,
      kind: 'diaper',
      at: row.occurredAt,
      title: 'Couche',
      detail: diaperLabel[row.kind],
    });
  }

  for (const row of pumps) {
    items.push({
      id: row.id,
      kind: 'pumping',
      at: activityAtFromDuration(row.startedAt, row.durationMinutes),
      title: 'Tire-lait',
      detail:
        row.amountMl == null
          ? 'à compléter'
          : `${row.amountMl} ml · reste ${row.remainingMl ?? 0} ml`,
    });
  }

  for (const row of solids) {
    items.push({ id: row.id, kind: 'solid', at: row.eatenAt, title: 'Diversification', detail: row.food });
  }
  for (const row of supplements) {
    items.push({ id: row.id, kind: 'supplement', at: row.givenAt, title: 'Complément', detail: row.name });
  }
  for (const row of sleeps) {
    items.push({
      id: row.id,
      kind: 'sleep',
      at: activityAt(row.startedAt, row.endedAt),
      title: 'Sommeil',
      detail: row.endedAt
        ? formatMinutes(elapsedMs(row.startedAt, row.endedAt))
        : 'en cours',
    });
  }
  for (const row of temps) {
    items.push({
      id: row.id,
      kind: 'temperature',
      at: row.measuredAt,
      title: 'Température',
      detail: `${formatTemperature(row.celsius)} °C`,
      tempCelsius: row.celsius,
    });
  }
  for (const row of notes) {
    const done = row.isTodo && row.doneAt;
    const openTodo = row.isTodo && !row.doneAt;
    items.push({
      id: row.id,
      kind: 'note',
      at: done ? row.doneAt! : row.notedAt,
      title: done ? 'Note · fait' : 'Note',
      detail: `${row.body.slice(0, 80)}${openTodo ? ' · à faire' : ''}`,
    });
  }
  for (const row of measures) {
    items.push({
      id: row.id,
      kind: 'measurement',
      at: row.measuredAt,
      title: measurementLabel[row.type],
      detail: `${row.value} ${row.unit}`,
    });
  }

  const sorted = items.sort((a, b) => b.at.localeCompare(a.at));
  return limit ? sorted.slice(0, limit) : sorted;
}

export type ActivityRecord =
  | { kind: 'feeding'; row: FeedingSession }
  | { kind: 'bottle'; row: BottleFeed }
  | { kind: 'diaper'; row: DiaperEvent }
  | { kind: 'pumping'; row: PumpingSession }
  | { kind: 'solid'; row: SolidFood }
  | { kind: 'supplement'; row: Supplement }
  | { kind: 'sleep'; row: SleepSession }
  | { kind: 'temperature'; row: Temperature }
  | { kind: 'note'; row: Note }
  | { kind: 'measurement'; row: Measurement };
