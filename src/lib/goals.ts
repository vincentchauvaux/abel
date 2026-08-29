export const INTERVAL_PRESETS = [
  { label: 'Aucun', minutes: 0 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
  { label: '4 h', minutes: 240 },
];

/** Rappel couche : délai après le dernier repas (tétée ou biberon). */
export const DIAPER_AFTER_MEAL_PRESETS = [
  { label: 'Aucun', minutes: 0 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 h', minutes: 60 },
];

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
