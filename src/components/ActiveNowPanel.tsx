import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui';
import {
  getReminder,
  listExerciseItems,
  listPumps,
  listSessions,
  listSleep,
  stopExerciseItem,
  stopFeeding,
  stopSleep,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { ExerciseItem, FeedingSession, PumpingSession, SleepSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { elapsedMs, formatDuration, formatTime } from '@/lib/dates';
import { exerciseIsRunning, formatExerciseCountdown } from '@/lib/exercises';
import { notifyDiaperFromGoals, notifyMealFromGoals } from '@/lib/reminders';
import { exerciseRoute, TOOLS } from '@/lib/tools';

type ActiveItem =
  | { kind: 'feeding'; row: FeedingSession }
  | { kind: 'sleep'; row: SleepSession }
  | { kind: 'pumping'; row: PumpingSession }
  | { kind: 'exercise'; row: ExerciseItem };

export function ActiveNowPanel() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof getReminder>>>();
  const now = useNow(items.length > 0);

  useEffect(() => {
    if (!baby) {
      setItems([]);
      return;
    }
    Promise.all([
      listSessions(baby.id),
      listSleep(baby.id),
      listPumps(baby.id),
      listExerciseItems(baby.id),
      getReminder(baby.id),
    ]).then(([feeds, sleeps, pumps, exercises, reminder]) => {
      const next: ActiveItem[] = [];
      const openFeed = feeds.find((row) => !row.endedAt);
      if (openFeed) next.push({ kind: 'feeding', row: openFeed });
      const openSleep = sleeps.find((row) => !row.endedAt);
      if (openSleep) next.push({ kind: 'sleep', row: openSleep });
      const openPump = pumps.find((row) => row.amountMl == null);
      if (openPump) next.push({ kind: 'pumping', row: openPump });
      for (const row of exercises) {
        if (exerciseIsRunning(row)) next.push({ kind: 'exercise', row });
      }
      setItems(next);
      setGoals(reminder);
    });
  }, [baby, tick]);

  if (items.length === 0) return null;

  const stopFeed = async (id: string) => {
    const endedAt = await stopFeeding(id);
    await notifyMealFromGoals(goals, endedAt);
    await notifyDiaperFromGoals(goals, endedAt);
  };

  const openModule = (kind: 'feeding' | 'sleep' | 'pumping') => {
    navigate(TOOLS[kind].route);
  };

  return (
    <div className="active-now" aria-live="polite">
      {items.map((item) => {
        if (item.kind === 'feeding') {
          return (
            <div className="active-now-row" key={`feeding-${item.row.id}`}>
              <button type="button" className="active-now-open" onClick={() => openModule('feeding')}>
                <strong>Tétée en cours</strong>
                <p className="muted active-now-meta">
                  Depuis {formatTime(item.row.startedAt)} ·{' '}
                  {formatDuration(elapsedMs(item.row.startedAt, item.row.endedAt, now))}
                </p>
              </button>
              <Button onClick={() => void stopFeed(item.row.id)}>Terminer</Button>
            </div>
          );
        }
        if (item.kind === 'sleep') {
          return (
            <div className="active-now-row" key={`sleep-${item.row.id}`}>
              <button type="button" className="active-now-open" onClick={() => openModule('sleep')}>
                <strong>Sommeil en cours</strong>
                <p className="muted active-now-meta">
                  Depuis {formatTime(item.row.startedAt)} ·{' '}
                  {formatDuration(elapsedMs(item.row.startedAt, item.row.endedAt, now))}
                </p>
              </button>
              <Button onClick={() => void stopSleep(item.row.id)}>Réveil</Button>
            </div>
          );
        }
        if (item.kind === 'exercise') {
          return (
            <div className="active-now-row exercise-running" key={`exercise-${item.row.id}`}>
              <button type="button" className="active-now-open" onClick={() => navigate(exerciseRoute(item.row.id))}>
                <strong>{item.row.title}</strong>
                <p className="muted active-now-meta">{formatExerciseCountdown(item.row, now)}</p>
              </button>
              <Button tone="muted" onClick={() => void stopExerciseItem(item.row.id)}>
                Terminer
              </Button>
            </div>
          );
        }
        return (
          <div className="active-now-row" key={`pumping-${item.row.id}`}>
            <button type="button" className="active-now-open" onClick={() => openModule('pumping')}>
              <strong>Tire-lait à compléter</strong>
              <p className="muted active-now-meta">
                Début {formatTime(item.row.startedAt)} · manque la quantité
              </p>
            </button>
            <Button tone="muted" onClick={() => openModule('pumping')}>
              Ouvrir
            </Button>
          </div>
        );
      })}
    </div>
  );
}
