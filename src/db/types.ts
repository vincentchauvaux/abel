export type SyncStatus = 'pending' | 'synced';
export type Side = 'LEFT' | 'RIGHT' | 'BOTH';
export type DiaperKind = 'PEE' | 'POO' | 'BOTH';
export type MilkType = 'BREAST_MILK' | 'FORMULA';
export type MeasurementType = 'WEIGHT' | 'HEIGHT' | 'HEAD_CIRCUMFERENCE';

export type Stamp = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
};

export type Baby = Stamp & {
  id: string;
  name: string;
  userId: string | null;
  bornOn: string | null;
  photoUrl: string | null;
};
export type FeedingSession = Stamp & {
  id: string;
  babyId: string;
  startedAt: string;
  endedAt: string | null;
  createdBy?: string | null;
};
export type FeedingSegment = Stamp & {
  id: string;
  feedingSessionId: string;
  side: Side;
  startedAt: string;
  endedAt: string | null;
};
export type BottleFeed = Stamp & {
  id: string;
  babyId: string;
  milkType: MilkType;
  amountMl: number;
  fedAt: string;
  /** Tirage consommé (lait maternel en stock). */
  pumpingSessionId: string | null;
  createdBy?: string | null;
};
export type DiaperEvent = Stamp & {
  id: string;
  babyId: string;
  kind: DiaperKind;
  occurredAt: string;
  createdBy?: string | null;
};
export type PumpingSession = Stamp & {
  id: string;
  babyId: string;
  startedAt: string;
  amountMl: number | null;
  /** Quantité encore disponible en stock (après prélèvements biberon). */
  remainingMl: number | null;
  durationMinutes: number | null;
  side: Side | null;
  createdBy?: string | null;
};
export type Measurement = Stamp & {
  id: string;
  babyId: string;
  type: MeasurementType;
  value: number;
  unit: string;
  measuredAt: string;
  createdBy?: string | null;
};
export type DiaperWhen = 'before' | 'after';

export type ReminderRule = Stamp & {
  id: string;
  babyId: string;
  enabled: boolean;
  delayMinutes: number;
  bottleMl: number | null;
  bottleMinutes: number | null;
  diaperMinutes: number | null;
  diaperWhen: DiaperWhen | null;
};
export type SolidFood = Stamp & {
  id: string;
  babyId: string;
  food: string;
  eatenAt: string;
  createdBy?: string | null;
};
export type Supplement = Stamp & {
  id: string;
  babyId: string;
  name: string;
  givenAt: string;
  createdBy?: string | null;
};
export type SleepSession = Stamp & {
  id: string;
  babyId: string;
  startedAt: string;
  endedAt: string | null;
  createdBy?: string | null;
};
export type Temperature = Stamp & {
  id: string;
  babyId: string;
  celsius: number;
  measuredAt: string;
  createdBy?: string | null;
};
export type Note = Stamp & {
  id: string;
  babyId: string;
  body: string;
  notedAt: string;
  /** Afficher sur le dashboard jusqu’à marquage fait. */
  isTodo: boolean;
  doneAt: string | null;
  createdBy?: string | null;
};
