import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

export const sqlite = openDatabaseSync('abel.db', { enableChangeListener: true });
export const db = drizzle(sqlite, { schema });
