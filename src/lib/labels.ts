import type { DiaperKind, MeasurementType, MilkType, Side } from '@/db/schema';

export const sideLabel: Record<Side, string> = {
  LEFT: 'Gauche',
  RIGHT: 'Droit',
  BOTH: 'Les deux',
};

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
