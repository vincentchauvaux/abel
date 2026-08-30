import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui';
import {
  getReminder,
  listPumps,
  listSessions,
  listSleep,
  stopFeeding,
  stopSleep,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { FeedingSession, PumpingSession, SleepSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { elapsedMs, formatDuration, formatTime } from '@/lib/dates';
import { notifyDiaperFromGoals, notifyIn } from '@/lib/reminders';

type ActiveItem =
  | { kind: 'feeding'; row: FeedingSession }
  | { kind: 'sleep'; row: SleepSession }
  | { kind: 'pumping'; row: PumpingSession };

export function ActiveNowPanel() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [delay, setDelay] = useState(0);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof getReminder>>>();
  const now = useNow(items.length > 0);

  useEffect(() => {
    if (!baby) {
      setItems([]);
      return;
    }
    Promise.all([listSessions(baby.id), listSleep(baby.id), listPumps(baby.id), getReminder(baby.id)]).then(
      ([feeds, sleeps, pumps, reminder]) => {
        const next: ActiveItem[] = [];
        const openFeed = feeds.find((row) => !row.endedAt);
        if (openFeed) next.push({ kind: 'feeding', row: openFeed });
        const openSleep = sleeps.find((row) => !row.endedAt);
        if (openSleep) next.push({ kind: 'sleep', row: openSleep });
        const openPump = pumps.find((row) => row.amountMl == null);
        if (openPump) next.push({ kind: 'pumping', row: openPump });
        setItems(next);
        setDelay(reminder?.delayMinutes ?? 0);
        setGoals(reminder);
      },
    );
  }, [baby, tick]);

  if (items.length === 0) return null;

  const stopFeed = async (id: string) => {
    const endedAt = await stopFeeding(id);
    await notifyIn(delay, 'Rappel tétée');
    await notifyDiaperFromGoals(goals, endedAt);
  };

  return (
    <div className="active-now" aria-live="polite">
      {items.map((item) => {
        if (item.kind === 'feeding') {
          return (
            <div className="active-now-row" key={`feeding-${item.row.id}`}>
              <div>
                <strong>Tétée en cours</strong>
                <p className="muted">
                  Depuis {formatTime(item.row.startedAt)} ·{' '}
                  {formatDuration(elapsedMs(item.row.startedAt, item.row.endedAt, now))}
                </p>
              </div>
              <Button onClick={() => void stopFeed(item.row.id)}>Terminer</Button>
            </div>
          );
        }
        if (item.kind === 'sleep') {
          return (
            <div className="active-now-row" key={`sleep-${item.row.id}`}>
              <div>
                <strong>Sommeil en cours</strong>
                <p className="muted">
                  Depuis {formatTime(item.row.startedAt)} ·{' '}
                  {formatDuration(elapsedMs(item.row.startedAt, item.row.endedAt, now))}
                </p>
              </div>
              <Button onClick={() => void stopSleep(item.row.id)}>Réveil</Button>
            </div>
          );
        }
        return (
          <div className="active-now-row" key={`pumping-${item.row.id}`}>
            <div>
              <strong>Tire-lait à compléter</strong>
              <p className="muted">Début {formatTime(item.row.startedAt)} — manque la quantité</p>
            </div>
            <Button tone="muted" onClick={() => navigate('/pumping')}>
              Ouvrir
            </Button>
          </div>
        );
      })}
    </div>
  );
}
