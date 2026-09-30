/** Lecture traditionnelle des « bonds » (semaines d’âge). Pas un avis médical. */

export type LeapWeekKind = 'calm' | 'storm' | 'fussy' | 'distance';

export const LEAP_WEEK_MAX = 84;

const FUSSY = new Set([5, 8, 12, 19, 26, 37, 46, 55, 64, 75]);
const STORM = new Set([4, 7, 11, 18, 25, 36, 45, 54, 63, 74]);
const DISTANCE = new Set([29, 30]);

export function leapWeekKind(week: number): LeapWeekKind {
  if (DISTANCE.has(week)) return 'distance';
  if (FUSSY.has(week)) return 'fussy';
  if (STORM.has(week)) return 'storm';
  return 'calm';
}

export function isLeapCloudWeek(week: number): boolean {
  return FUSSY.has(week);
}

export const LEAP_DISCLAIMER = 'Lecture traditionnelle — Mimom n’est pas un avis médical.';
