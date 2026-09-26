import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Button, Card } from '@/components/ui';
import { listExerciseItems, listExerciseSessions, stopExerciseItem } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { ExerciseItem, ExerciseSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { exerciseSessionToActivity, type ActivityItem } from '@/lib/activity';
import { startOfLocalDay } from '@/lib/dates';
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
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [editing, setEditing] = useState<ActivityItem | null>(null);
  const running = Boolean(item && exerciseIsRunning(item));
  const now = useNow(running);

  useEffect(() => {
    if (!baby || !id) return;
    Promise.all([listExerciseItems(baby.id), listExerciseSessions(baby.id)]).then(([rows, all]) => {
      const next = rows.find((row) => row.id === id) ?? null;
      setItem(next);
      setSessions(all.filter((row) => row.exerciseItemId === id));
      if (!next) navigate('/tools', { replace: true });
    });
  }, [baby, id, tick, navigate]);

  const today = useMemo(() => {
    const from = startOfLocalDay().toISOString();
    return sessions.filter((row) => (row.endedAt ?? row.startedAt) >= from);
  }, [sessions]);

  if (!item) return null;

  const done = exerciseIsDone(item, now);
  const liveSession = sessions.find((row) => !row.endedAt);

  return (
    <div className="screen">
      <ModuleHeader title={item.title} toolId={exerciseFavoriteId(item.id)} />
      <Card>
        {running && liveSession ? (
          <button
            type="button"
            className="timer-edit"
            onClick={() => setEditing(exerciseSessionToActivity(liveSession))}
            aria-label="Modifier l’exercice en cours">
            <div className="timer">{formatExerciseCountdown(item, now)}</div>
            <p className="muted" style={{ textAlign: 'center' }}>
              En cours · modifier
            </p>
          </button>
        ) : (
          <>
            <div className="timer">{formatExerciseCountdown(item, now)}</div>
            <p className="muted" style={{ textAlign: 'center' }}>
              {done ? 'Terminé' : formatExerciseDuration(item.durationMinutes)}
            </p>
          </>
        )}
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
      <Card>
        <h2>Aujourd’hui · {today.length}</h2>
        {today.length === 0 ? (
          <p className="muted">Chaque séance terminée (ou en cours) apparaît ici et dans le journal.</p>
        ) : (
          today.map((row) => {
            const activity = exerciseSessionToActivity(row);
            return (
              <JournalLine
                key={row.id}
                item={activity}
                onClick={() => setEditing(activity)}
              />
            );
          })
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
