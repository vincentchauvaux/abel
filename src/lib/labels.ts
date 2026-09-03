import type { DiaperKind, MeasurementType, MilkType, Side } from '@/db/types';

export const sideLabel: Record<Side, string> = {
  LEFT: 'Gauche',
  RIGHT: 'Droit',
  BOTH: 'Les deux',
};

/** Libellé d’une tétée : « Les deux » si gauche et droit ont servi, sinon le sein unique. */
export function feedingSidesLabel(sides: readonly Side[]): string {
  const set = new Set(sides);
  const left = set.has('LEFT') || set.has('BOTH');
  const right = set.has('RIGHT') || set.has('BOTH');
  if (left && right) return sideLabel.BOTH;
  if (left) return sideLabel.LEFT;
  if (right) return sideLabel.RIGHT;
  return '';
}

export const diaperLabel: Record<DiaperKind, string> = {
  PEE: 'Pipi',
  POO: 'Caca',
  BOTH: 'Les deux',
};

export const milkLabel: Record<MilkType, string> = {
  BREAST_MILK: 'Lait maternel',
  FORMULA: 'Lait infantile',
};

export const measurementLabel: Record<MeasurementType, string> = {
  WEIGHT: 'Poids',
  HEIGHT: 'Taille',
  HEAD_CIRCUMFERENCE: 'Périmètre crânien',
};

export const measurementUnit: Record<MeasurementType, string> = {
  WEIGHT: 'kg',
  HEIGHT: 'cm',
  HEAD_CIRCUMFERENCE: 'cm',
};
