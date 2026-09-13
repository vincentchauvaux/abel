import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card } from '@/components/ui';
import { listExerciseItems, stopExerciseItem } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { ExerciseItem } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { startExerciseWithAlarm } from '@/lib/exercise-alarm';
import {
  exerciseIsDone,
  exerciseIsRunning,
  formatExerciseCountdown,
  formatExerciseDuration,
} from '@/lib/exercises';
import { exerciseFavoriteId } from '@/lib/tools';

export function ExercisePage() {
  const { id } = useParams();
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [item, setItem] = useState<ExerciseItem | null | undefined>(undefined);
  const running = Boolean(item && exerciseIsRunning(item));
  const now = useNow(running);

  useEffect(() => {
    if (!baby || !id) return;
    listExerciseItems(baby.id).then((rows) => {
      const next = rows.find((row) => row.id === id) ?? null;
      setItem(next);
      if (!next) navigate('/tools', { replace: true });
    });
  }, [baby, id, tick, navigate]);

  if (!item) return null;

  const done = exerciseIsDone(item, now);

  return (
    <div className="screen">
      <ModuleHeader title={item.title} toolId={exerciseFavoriteId(item.id)} />
      <Card>
        <div className="timer">{formatExerciseCountdown(item, now)}</div>
        <p className="muted" style={{ textAlign: 'center' }}>
          {done ? 'Terminé' : running ? 'En cours' : formatExerciseDuration(item.durationMinutes)}
        </p>
        {running ? (
          <Button tone="muted" onClick={() => void stopExerciseItem(item.id)}>
            Terminer
          </Button>
        ) : (
          <button type="button" className="big" onClick={() => void startExerciseWithAlarm(item.id)}>
            {done ? 'Relancer' : 'Démarrer'}
          </button>
        )}
      </Card>
    </div>
  );
}
