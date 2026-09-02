import { startOfLocalDay } from '@/lib/dates';

/** Affichage uniquement — pas un avis médical. */
export type ImcLevel = 'ok' | 'warn' | 'alert';

/** IMC = kg / m². */
export function computeImc(weightKg: number, heightCm: number): number | null {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  const meters = heightCm / 100;
  const value = weightKg / (meters * meters);
  return Number.isFinite(value) ? value : null;
}

export function formatImc(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/** Âge en mois révolus à une date (jour calendaire local). */
export function ageMonthsAt(bornOn: string, at: Date = new Date()): number | null {
  const birth = startOfLocalDay(new Date(`${bornOn}T12:00:00`));
  const day = startOfLocalDay(at);
  if (birth > day) return null;
  let months = (day.getFullYear() - birth.getFullYear()) * 12 + (day.getMonth() - birth.getMonth());
  if (day.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Médiane IMC indicative 0–5 ans (ordre de grandeur OMS, filles/garçons mélangés). */
const WHO_BMI_MEDIAN: [number, number][] = [
  [0, 13.4],
  [1, 14.9],
  [2, 16.2],
  [3, 16.9],
  [6, 17.5],
  [9, 17.3],
  [12, 17.0],
  [18, 16.3],
  [24, 16.0],
  [36, 15.6],
  [48, 15.3],
  [60, 15.2],
];

function interpolateMedian(months: number): number {
  const capped = Math.min(60, Math.max(0, months));
  for (let i = 1; i < WHO_BMI_MEDIAN.length; i += 1) {
    const [m1, v1] = WHO_BMI_MEDIAN[i - 1];
    const [m2, v2] = WHO_BMI_MEDIAN[i];
    if (capped <= m2) {
      const t = (capped - m1) / (m2 - m1);
      return v1 + t * (v2 - v1);
    }
  }
  return WHO_BMI_MEDIAN[WHO_BMI_MEDIAN.length - 1][1];
}

export function imcMedianForAge(bornOn: string | null | undefined, at: Date = new Date()): number | null {
  if (!bornOn) return null;
  const months = ageMonthsAt(bornOn, at);
  if (months == null) return null;
  return interpolateMedian(months);
}

export function imcLevel(value: number, bornOn?: string | null, at: Date = new Date()): ImcLevel {
  const median = imcMedianForAge(bornOn, at) ?? 16.5;
  const ratio = value / median;
  const delta = Math.abs(ratio - 1);
  if (delta < 0.12) return 'ok';
  if (delta < 0.2) return 'warn';
  return 'alert';
}

export function imcLevelClass(level: ImcLevel): string {
  return `imc-value imc-${level}`;
}

export function imcToneLabel(value: number, level: ImcLevel, bornOn?: string | null, at: Date = new Date()): string {
  const median = imcMedianForAge(bornOn, at) ?? 16.5;
  if (level === 'ok') return 'dans la zone habituelle';
  if (value < median) return level === 'alert' ? 'plutôt bas' : 'un peu bas';
  return level === 'alert' ? 'plutôt haut' : 'un peu haut';
}
