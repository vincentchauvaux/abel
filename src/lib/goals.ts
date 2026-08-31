export type DiaperWhen = 'before' | 'after';

export const INTERVAL_PRESETS = [
  { label: 'Aucun', minutes: 0 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
  { label: '4 h', minutes: 240 },
];

/** Rappel couche : délai avant ou après le repas. */
export const DIAPER_MEAL_PRESETS = [
  { label: 'Aucun', minutes: 0 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 h', minutes: 60 },
];

/** @deprecated utiliser DIAPER_MEAL_PRESETS */
export const DIAPER_AFTER_MEAL_PRESETS = DIAPER_MEAL_PRESETS;

export const ML_PRESETS = [
  { label: '90 ml', ml: 90 },
  { label: '120 ml', ml: 120 },
  { label: '150 ml', ml: 150 },
  { label: '180 ml', ml: 180 },
  { label: '210 ml', ml: 210 },
  { label: '240 ml', ml: 240 },
  { label: '30 cl', ml: 300 },
];

export function formatGoalMl(ml: number): string {
  if (ml % 10 === 0 && ml >= 100) {
    const cl = ml / 10;
    if (cl % 1 === 0) return `${ml} ml (${cl} cl)`;
  }
  return `${ml} ml`;
}

export function formatEvery(minutes: number): string {
  if (minutes <= 0) return 'aucun rappel';
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? 'toutes les 1 h' : `toutes les ${h} h`;
  }
  return `toutes les ${minutes} min`;
}

/** Intervalle repas (sein ou biberon). */
export function formatMealGoal(minutes: number): string {
  return formatEvery(minutes);
}

/** Libellé biberon : quantité ml optionnelle par repas. */
export function formatBottleMlGoal(bottleMl: number | null | undefined): string {
  if (bottleMl && bottleMl > 0) return formatGoalMl(bottleMl);
  return 'non définie';
}

/** @deprecated utiliser formatMealGoal + formatBottleMlGoal */
export function formatBottleGoal(
  bottleMinutes: number | null | undefined,
  feedingMinutes: number,
  bottleMl: number | null | undefined,
): string {
  const every =
    bottleMinutes == null ? formatEvery(feedingMinutes) : formatEvery(bottleMinutes);
  if (bottleMl && bottleMl > 0) return `${every} · ${formatGoalMl(bottleMl)}`;
  return every;
}

export function formatDiaperGoal(when: DiaperWhen | null | undefined, minutes: number): string {
  if (minutes <= 0) return 'aucun rappel';
  const offset = minutes === 60 ? '1 h' : `${minutes} min`;
  if (when === 'before') return `${offset} avant le repas`;
  return `${offset} après le repas`;
}

/** Heure du rappel couche à partir du dernier repas et de l’intervalle repas (tétées). */
export function diaperReminderAt(
  mealAt: string,
  mealIntervalMinutes: number,
  when: DiaperWhen,
  offsetMinutes: number,
): Date {
  const base = new Date(mealAt);
  if (when === 'after') {
    base.setMinutes(base.getMinutes() + offsetMinutes);
    return base;
  }
  base.setMinutes(base.getMinutes() + Math.max(0, mealIntervalMinutes - offsetMinutes));
  return base;
}
