/**
 * Courbes OMS indicatives poids-pour-âge et taille-pour-âge (0–24 mois).
 * Moyenne filles/garçons (pas de sexe sur la fiche Bébé) — pas un avis médical.
 * Source : WHO Child Growth Standards 2006 (percentiles P3 / P15 / P50 / P85 / P97).
 */

export type WhoPercentiles = {
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

type MonthRow = { m: number; boy: WhoPercentiles; girl: WhoPercentiles };

/** Poids (kg) — 0 à 24 mois. */
const WEIGHT: MonthRow[] = [
  { m: 0, boy: { p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 }, girl: { p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 } },
  { m: 1, boy: { p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 }, girl: { p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 } },
  { m: 2, boy: { p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 }, girl: { p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6 } },
  { m: 3, boy: { p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 }, girl: { p3: 4.5, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 } },
  { m: 4, boy: { p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 }, girl: { p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2 } },
  { m: 5, boy: { p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 }, girl: { p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8 } },
  { m: 6, boy: { p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 }, girl: { p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 } },
  { m: 7, boy: { p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.3 }, girl: { p3: 6.0, p15: 6.8, p50: 7.6, p85: 8.6, p97: 9.8 } },
  { m: 8, boy: { p3: 6.9, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.7 }, girl: { p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.2 } },
  { m: 9, boy: { p3: 7.1, p15: 8.0, p50: 8.9, p85: 9.9, p97: 11.0 }, girl: { p3: 6.5, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.5 } },
  { m: 10, boy: { p3: 7.4, p15: 8.2, p50: 9.2, p85: 10.2, p97: 11.4 }, girl: { p3: 6.7, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.9 } },
  { m: 11, boy: { p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.7 }, girl: { p3: 6.9, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.2 } },
  { m: 12, boy: { p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 }, girl: { p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5 } },
  { m: 15, boy: { p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 }, girl: { p3: 7.6, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.4 } },
  { m: 18, boy: { p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.7 }, girl: { p3: 8.1, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.2 } },
  { m: 21, boy: { p3: 9.2, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.5 }, girl: { p3: 8.6, p15: 9.6, p50: 10.9, p85: 12.3, p97: 14.0 } },
  { m: 24, boy: { p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 }, girl: { p3: 9.0, p15: 10.1, p50: 11.5, p85: 13.0, p97: 14.8 } },
];

/** Taille / longueur (cm) — 0 à 24 mois. */
const LENGTH: MonthRow[] = [
  { m: 0, boy: { p3: 46.1, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.7 }, girl: { p3: 45.4, p15: 47.3, p50: 49.1, p85: 51.0, p97: 52.9 } },
  { m: 1, boy: { p3: 50.8, p15: 52.8, p50: 54.7, p85: 56.7, p97: 58.6 }, girl: { p3: 49.8, p15: 51.7, p50: 53.7, p85: 55.6, p97: 57.6 } },
  { m: 2, boy: { p3: 54.4, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.4 }, girl: { p3: 53.0, p15: 55.0, p50: 57.1, p85: 59.1, p97: 61.1 } },
  { m: 3, boy: { p3: 57.3, p15: 59.4, p50: 61.4, p85: 63.5, p97: 65.5 }, girl: { p3: 55.6, p15: 57.7, p50: 59.8, p85: 61.9, p97: 64.0 } },
  { m: 4, boy: { p3: 59.7, p15: 61.8, p50: 63.9, p85: 66.0, p97: 68.0 }, girl: { p3: 57.8, p15: 59.9, p50: 62.1, p85: 64.3, p97: 66.4 } },
  { m: 5, boy: { p3: 61.7, p15: 63.8, p50: 65.9, p85: 68.0, p97: 70.1 }, girl: { p3: 59.6, p15: 61.8, p50: 64.0, p85: 66.2, p97: 68.5 } },
  { m: 6, boy: { p3: 63.3, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.9 }, girl: { p3: 61.2, p15: 63.5, p50: 65.7, p85: 68.0, p97: 70.3 } },
  { m: 7, boy: { p3: 64.8, p15: 67.0, p50: 69.2, p85: 71.3, p97: 73.5 }, girl: { p3: 62.7, p15: 65.0, p50: 67.3, p85: 69.6, p97: 71.9 } },
  { m: 8, boy: { p3: 66.2, p15: 68.4, p50: 70.6, p85: 72.8, p97: 75.0 }, girl: { p3: 64.0, p15: 66.4, p50: 68.7, p85: 71.1, p97: 73.5 } },
  { m: 9, boy: { p3: 67.5, p15: 69.7, p50: 72.0, p85: 74.2, p97: 76.5 }, girl: { p3: 65.3, p15: 67.7, p50: 70.1, p85: 72.6, p97: 75.0 } },
  { m: 10, boy: { p3: 68.7, p15: 71.0, p50: 73.3, p85: 75.6, p97: 77.9 }, girl: { p3: 66.5, p15: 69.0, p50: 71.5, p85: 73.9, p97: 76.4 } },
  { m: 11, boy: { p3: 69.9, p15: 72.2, p50: 74.5, p85: 76.9, p97: 79.2 }, girl: { p3: 67.7, p15: 70.3, p50: 72.8, p85: 75.3, p97: 77.8 } },
  { m: 12, boy: { p3: 71.0, p15: 73.4, p50: 75.7, p85: 78.1, p97: 80.5 }, girl: { p3: 68.9, p15: 71.4, p50: 74.0, p85: 76.6, p97: 79.2 } },
  { m: 15, boy: { p3: 74.1, p15: 76.6, p50: 79.1, p85: 81.7, p97: 84.2 }, girl: { p3: 71.9, p15: 74.6, p50: 77.5, p85: 80.2, p97: 83.0 } },
  { m: 18, boy: { p3: 76.9, p15: 79.6, p50: 82.3, p85: 85.0, p97: 87.7 }, girl: { p3: 74.7, p15: 77.6, p50: 80.7, p85: 83.6, p97: 86.5 } },
  { m: 21, boy: { p3: 79.4, p15: 82.3, p50: 85.1, p85: 88.0, p97: 90.9 }, girl: { p3: 77.2, p15: 80.3, p50: 83.5, p85: 86.7, p97: 89.8 } },
  { m: 24, boy: { p3: 81.7, p15: 84.8, p50: 87.8, p85: 90.9, p97: 94.0 }, girl: { p3: 79.3, p15: 82.5, p50: 86.0, p85: 89.3, p97: 92.5 } },
];

export const WHO_MAX_MONTHS = 24;

function avg(a: WhoPercentiles, b: WhoPercentiles): WhoPercentiles {
  return {
    p3: (a.p3 + b.p3) / 2,
    p15: (a.p15 + b.p15) / 2,
    p50: (a.p50 + b.p50) / 2,
    p85: (a.p85 + b.p85) / 2,
    p97: (a.p97 + b.p97) / 2,
  };
}

function lerpPct(a: WhoPercentiles, b: WhoPercentiles, t: number): WhoPercentiles {
  return {
    p3: a.p3 + (b.p3 - a.p3) * t,
    p15: a.p15 + (b.p15 - a.p15) * t,
    p50: a.p50 + (b.p50 - a.p50) * t,
    p85: a.p85 + (b.p85 - a.p85) * t,
    p97: a.p97 + (b.p97 - a.p97) * t,
  };
}

function interpolateTable(table: MonthRow[], months: number): WhoPercentiles | null {
  if (months < 0 || months > WHO_MAX_MONTHS) return null;
  const capped = Math.min(WHO_MAX_MONTHS, Math.max(0, months));
  for (let i = 1; i < table.length; i += 1) {
    const prev = table[i - 1];
    const next = table[i];
    if (capped <= next.m) {
      const t = (capped - prev.m) / (next.m - prev.m);
      return lerpPct(avg(prev.boy, prev.girl), avg(next.boy, next.girl), t);
    }
  }
  const last = table[table.length - 1];
  return avg(last.boy, last.girl);
}

export function whoWeightAt(months: number): WhoPercentiles | null {
  return interpolateTable(WEIGHT, months);
}

export function whoLengthAt(months: number): WhoPercentiles | null {
  return interpolateTable(LENGTH, months);
}

/** Âge en mois (fractionnaire) depuis la date de naissance. */
export function ageMonthsExact(bornOn: string, at: Date): number | null {
  const birth = new Date(`${bornOn}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const days = (at.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return null;
  return days / 30.4375;
}

export function sampleWhoCurve(
  kind: 'weight' | 'length',
  fromMonth: number,
  toMonth: number,
  step = 0.5,
): { month: number; pct: WhoPercentiles }[] {
  const out: { month: number; pct: WhoPercentiles }[] = [];
  const start = Math.max(0, fromMonth);
  const end = Math.min(WHO_MAX_MONTHS, toMonth);
  if (end < start) return out;
  for (let m = start; m <= end + 1e-9; m += step) {
    const pct = kind === 'weight' ? whoWeightAt(m) : whoLengthAt(m);
    if (pct) out.push({ month: m, pct });
  }
  return out;
}
