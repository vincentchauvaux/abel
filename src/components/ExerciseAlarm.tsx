import { useEffect, useRef, useState } from 'react';

import { listExerciseItems } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { ExerciseItem } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { announceExerciseDone, exerciseAlertKey } from '@/lib/exercise-alarm';
import { exerciseIsDone, exerciseIsRunning } from '@/lib/exercises';

export function ExerciseAlarm() {
  const { baby, tick } = useDb();
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const running = items.some((row) => exerciseIsRunning(row));
  const now = useNow(running, 1000);
  const prevRunning = useRef(new Set<string>());

  useEffect(() => {
    if (!baby) {
      setItems([]);
      return;
    }
    listExerciseItems(baby.id).then(setItems);
  }, [baby, tick]);

  useEffect(() => {
    const current = new Set(items.filter((row) => exerciseIsRunning(row, now)).map((row) => row.id));
    for (const id of prevRunning.current) {
      if (current.has(id)) continue;
      const item = items.find((row) => row.id === id);
      if (!item?.startedAt || !exerciseIsDone(item, now)) continue;
      void announceExerciseDone(item.title, exerciseAlertKey(item.id, item.startedAt));
    }
    prevRunning.current = current;
  }, [items, now]);

  return null;
}
