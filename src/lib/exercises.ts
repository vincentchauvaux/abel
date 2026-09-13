import { formatDuration, formatMinuteCount } from '@/lib/dates';
import type { ExerciseItem } from '@/db/types';

export const EXERCISE_DURATION_PRESETS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 h', minutes: 60 },
];

export const EXERCISE_MAX = 20;
export const EXERCISE_TITLE_MAX = 40;
export const EXERCISE_DURATION_MAX = 24 * 60;

export function clampExerciseDuration(minutes: number): number | null {
  if (!Number.isFinite(minutes) || minutes < 1) return null;
  return Math.min(EXERCISE_DURATION_MAX, Math.round(minutes));
}

export function exerciseEndsAt(item: ExerciseItem): number | null {
  if (!item.startedAt) return null;
  return new Date(item.startedAt).getTime() + item.durationMinutes * 60_000;
}

export function exerciseRemainingMs(item: ExerciseItem, now = Date.now()): number {
  const ends = exerciseEndsAt(item);
  if (ends == null) return item.durationMinutes * 60_000;
  return Math.max(0, ends - now);
}

export function exerciseIsRunning(item: ExerciseItem, now = Date.now()): boolean {
  const ends = exerciseEndsAt(item);
  return ends != null && now < ends;
}

export function exerciseIsDone(item: ExerciseItem, now = Date.now()): boolean {
  const ends = exerciseEndsAt(item);
  return ends != null && now >= ends;
}

export function formatExerciseCountdown(item: ExerciseItem, now = Date.now()): string {
  return formatDuration(exerciseRemainingMs(item, now));
}

export function formatExerciseDuration(minutes: number): string {
  return formatMinuteCount(minutes);
}
