import {
  listBaths,
  listBottles,
  listDiapers,
  listExerciseSessions,
  listMeasurements,
  listNotes,
  listPumps,
  listSegments,
  listSessions,
  listSleep,
  listSolidFoods,
  listSupplements,
  listTemperatures,
  sealDueExerciseSessions,
} from '@/db/api';
import type {
  BathEvent,
  BottleFeed,
  DiaperEvent,
  ExerciseSession,
  FeedingSegment,
  FeedingSession,
  Measurement,
  Side,
  Note,
  PumpingSession,
  SleepSession,
  SolidFood,
  Supplement,
  Temperature,
} from '@/db/types';
import { activityAt, activityAtFromDuration, formatFeedLabel, formatMinuteCount, formatMinutes, elapsedMs } from '@/lib/dates';
import { stockIdLabel } from '@/lib/milk-stock';
import { formatTemperature } from '@/lib/temperature';
import { diaperLabel, feedingSidesLabel, measurementLabel, milkLabel } from '@/lib/labels';

export type ActivityKind =
  | 'feeding'
  | 'bottle'
  | 'diaper'
  | 'bath'
  | 'pumping'
  | 'solid'
  | 'supplement'
  | 'sleep'
  | 'exercise'
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
  createdBy?: string | null;
  startAt?: string;
  stockNo?: number | null;
};

export function feedingSessionToActivity(row: FeedingSession, sides: readonly Side[] = []): ActivityItem {
  const label = feedingSidesLabel(sides);
  return {
    id: row.id,
    kind: 'feeding',
    at: activityAt(row.startedAt, row.endedAt),
    title: 'Tétée',
    detail: `${row.endedAt ? formatFeedLabel(row.startedAt, row.endedAt) : 'en cours'}${label ? ` · ${label}` : ''}`,
    createdBy: row.createdBy ?? null,
    startAt: row.startedAt,
  };
}

export function sidesForFeeding(segments: FeedingSegment[], sessionId: string): Side[] {
  return segments.filter((row) => row.feedingSessionId === sessionId).map((row) => row.side);
}

export function bottleFeedToActivity(row: BottleFeed): ActivityItem {
  return {
    id: row.id,
    kind: 'bottle',
    at: row.fedAt,
    title: 'Biberon',
    detail: `${row.amountMl} ml · ${milkLabel[row.milkType]}${row.pumpingSessionId ? ' · stock' : ''}`,
    createdBy: row.createdBy ?? null,
  };
}

export function diaperEventToActivity(row: DiaperEvent): ActivityItem {
  return {
    id: row.id,
    kind: 'diaper',
    at: row.occurredAt,
    title: 'Couche',
    detail: diaperLabel[row.kind],
    createdBy: row.createdBy ?? null,
  };
}

export function bathEventToActivity(row: BathEvent): ActivityItem {
  return {
    id: row.id,
    kind: 'bath',
    at: row.occurredAt,
    title: 'Bain',
    detail: '',
    createdBy: row.createdBy ?? null,
  };
}

export function pumpingSessionToActivity(row: PumpingSession): ActivityItem {
  const idLabel = stockIdLabel(row.stockNo);
  return {
    id: row.id,
    kind: 'pumping',
    at: activityAtFromDuration(row.startedAt, row.durationMinutes),
    title: 'Tire-lait',
    detail:
      row.amountMl == null
        ? `${idLabel} · à compléter`
        : `${idLabel} · ${row.durationMinutes != null && row.durationMinutes > 0 ? `${formatMinuteCount(row.durationMinutes)} · ` : ''}${row.amountMl} ml · reste ${row.remainingMl ?? 0} ml`,
    createdBy: row.createdBy ?? null,
    startAt: row.startedAt,
    stockNo: row.stockNo,
  };
}

export function solidFoodToActivity(row: SolidFood): ActivityItem {
  return {
    id: row.id,
    kind: 'solid',
    at: row.eatenAt,
    title: 'Diversification',
    detail: row.food,
    createdBy: row.createdBy ?? null,
  };
}

export function supplementToActivity(row: Supplement): ActivityItem {
  return {
    id: row.id,
    kind: 'supplement',
    at: row.givenAt,
    title: 'Complément',
    detail: row.name,
    createdBy: row.createdBy ?? null,
  };
}

export function sleepSessionToActivity(row: SleepSession): ActivityItem {
  return {
    id: row.id,
    kind: 'sleep',
    at: activityAt(row.startedAt, row.endedAt),
    title: 'Sommeil',
    detail: row.endedAt ? formatMinutes(elapsedMs(row.startedAt, row.endedAt)) : 'en cours',
    createdBy: row.createdBy ?? null,
    startAt: row.startedAt,
  };
}

export function exerciseSessionToActivity(row: ExerciseSession): ActivityItem {
  return {
    id: row.id,
    kind: 'exercise',
    at: activityAt(row.startedAt, row.endedAt),
    title: row.title,
    detail: row.endedAt ? formatMinutes(elapsedMs(row.startedAt, row.endedAt)) : 'en cours',
    createdBy: row.createdBy ?? null,
    startAt: row.startedAt,
  };
}

export function temperatureToActivity(row: Temperature): ActivityItem {
  return {
    id: row.id,
    kind: 'temperature',
    at: row.measuredAt,
    title: 'Température',
    detail: `${formatTemperature(row.celsius)} °C`,
    tempCelsius: row.celsius,
    createdBy: row.createdBy ?? null,
  };
}

export function noteToActivity(row: Note): ActivityItem {
  const done = row.isTodo && row.doneAt;
  const openTodo = row.isTodo && !row.doneAt;
  return {
    id: row.id,
    kind: 'note',
    at: done ? row.doneAt! : row.notedAt,
    title: done ? 'Note · fait' : 'Note',
    detail: `${row.body.slice(0, 80)}${openTodo ? ' · à faire' : ''}`,
    createdBy: row.createdBy ?? null,
  };
}

export function measurementToActivity(row: Measurement): ActivityItem {
  return {
    id: row.id,
    kind: 'measurement',
    at: row.measuredAt,
    title: measurementLabel[row.type],
    detail: `${row.value} ${row.unit}`,
    createdBy: row.createdBy ?? null,
  };
}

export async function listActivity(babyId: string, limit?: number): Promise<ActivityItem[]> {
  await sealDueExerciseSessions(babyId);
  const [
    sessions,
    segments,
    bottles,
    diapers,
    baths,
    pumps,
    solids,
    supplements,
    sleeps,
    temps,
    notes,
    measures,
    exercises,
  ] = await Promise.all([
    listSessions(babyId),
    listSegments(),
    listBottles(babyId),
    listDiapers(babyId),
    listBaths(babyId),
    listPumps(babyId),
    listSolidFoods(babyId),
    listSupplements(babyId),
    listSleep(babyId),
    listTemperatures(babyId),
    listNotes(babyId),
    listMeasurements(babyId),
    listExerciseSessions(babyId),
  ]);

  const items: ActivityItem[] = [
    ...sessions.map((row) => feedingSessionToActivity(row, sidesForFeeding(segments, row.id))),
    ...bottles.map(bottleFeedToActivity),
    ...diapers.map(diaperEventToActivity),
    ...baths.map(bathEventToActivity),
    ...pumps.map(pumpingSessionToActivity),
    ...solids.map(solidFoodToActivity),
    ...supplements.map(supplementToActivity),
    ...sleeps.map(sleepSessionToActivity),
    ...exercises.map(exerciseSessionToActivity),
    ...temps.map(temperatureToActivity),
    ...notes.map(noteToActivity),
    ...measures.map(measurementToActivity),
  ];

  const sorted = items.sort((a, b) => b.at.localeCompare(a.at));
  return limit ? sorted.slice(0, limit) : sorted;
}

export type ActivityRecord =
  | { kind: 'feeding'; row: FeedingSession }
  | { kind: 'bottle'; row: BottleFeed }
  | { kind: 'diaper'; row: DiaperEvent }
  | { kind: 'bath'; row: BathEvent }
  | { kind: 'pumping'; row: PumpingSession }
  | { kind: 'solid'; row: SolidFood }
  | { kind: 'supplement'; row: Supplement }
  | { kind: 'sleep'; row: SleepSession }
  | { kind: 'exercise'; row: ExerciseSession }
  | { kind: 'temperature'; row: Temperature }
  | { kind: 'note'; row: Note }
  | { kind: 'measurement'; row: Measurement };
