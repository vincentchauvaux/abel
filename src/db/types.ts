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

export type Baby = Stamp & { id: string; name: string; userId: string | null };
export type FeedingSession = Stamp & {
  id: string;
  babyId: string;
  startedAt: string;
  endedAt: string | null;
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
};
export type DiaperEvent = Stamp & {
  id: string;
  babyId: string;
  kind: DiaperKind;
  occurredAt: string;
};
export type PumpingSession = Stamp & {
  id: string;
  babyId: string;
  startedAt: string;
  amountMl: number | null;
  durationMinutes: number | null;
  side: Side | null;
};
export type Measurement = Stamp & {
  id: string;
  babyId: string;
  type: MeasurementType;
  value: number;
  unit: string;
  measuredAt: string;
};
export type ReminderRule = Stamp & {
  id: string;
  babyId: string;
  enabled: boolean;
  delayMinutes: number;
};
export type SolidFood = Stamp & {
  id: string;
  babyId: string;
  food: string;
  eatenAt: string;
};
export type Supplement = Stamp & {
  id: string;
  babyId: string;
  name: string;
  givenAt: string;
};
export type SleepSession = Stamp & {
  id: string;
  babyId: string;
  startedAt: string;
  endedAt: string | null;
};
export type Temperature = Stamp & {
  id: string;
  babyId: string;
  celsius: number;
  measuredAt: string;
};
export type Note = Stamp & {
  id: string;
  babyId: string;
  body: string;
  notedAt: string;
};
