/** Lecture traditionnelle des « bonds » (semaines d’âge). Pas un avis médical. */

export type LeapWeekKind = 'calm' | 'fussy' | 'distance';
export type LeapWeekMark = 'none' | 'cloud' | 'sun';

export const LEAP_WEEK_MAX = 84;

/** Cases foncées : bébé plus agité (d’après le calendrier des bonds). */
const FUSSY = new Set([5, 8, 12, 15, 16, 19, 23, 26, 36, 37, 42, 43, 44, 45, 46, 62, 63, 64, 65, 71, 72]);
const DISTANCE = new Set([29, 30]);
/** Nuage : période orageuse probable. */
const CLOUDS = new Set([5, 8, 12, 19, 26, 29, 37, 46, 55, 62, 66]);
/** Soleil : souvent sous son meilleur jour. */
const SUNS = new Set([6, 10, 13, 14, 17, 24, 32, 39, 42, 58, 59, 79]);

export function leapWeekKind(week: number): LeapWeekKind {
  if (DISTANCE.has(week)) return 'distance';
  if (FUSSY.has(week)) return 'fussy';
  return 'calm';
}

export function leapWeekMark(week: number): LeapWeekMark {
  if (SUNS.has(week)) return 'sun';
  if (CLOUDS.has(week)) return 'cloud';
  return 'none';
}

export const LEAP_DISCLAIMER = 'Lecture traditionnelle — Mimom n’est pas un avis médical.';
