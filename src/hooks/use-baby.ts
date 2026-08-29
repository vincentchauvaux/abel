import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { babies } from '@/db/schema';

export function useBaby() {
  const { data } = useLiveQuery(db.select().from(babies).where(isNull(babies.deletedAt)).limit(1));
  return (data ?? [])[0] ?? null;
}
