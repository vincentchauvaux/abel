import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Button, Card } from '@/components/ui';
import { listSleep, startSleep, stopSleep } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { SleepSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { useOnceLock } from '@/hooks/use-once-lock';
import { sleepSessionToActivity, type ActivityItem } from '@/lib/activity';
import {
  elapsedMs,
  formatDuration,
  formatMinuteCount,
  formatTime,
  localDateKey,
  spansNewestFirst,
  spansOnLocalDay,
  totalMinutesOnLocalDay,
} from '@/lib/dates';
import { returnHome } from '@/lib/return-home';

export function SleepPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const { busy, run } = useOnceLock();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [editing, setEditing] = useState<ActivityItem | null>(null);
  const babyId = baby?.id ?? '';

  useEffect(() => {
    if (!babyId) return;
    listSleep(babyId).then(setSessions);
  }, [babyId, tick]);

  const active = sessions.find((row) => !row.endedAt);
  const now = useNow(Boolean(active));
  const todayKey = localDateKey(new Date(now).toISOString());
  const todaySpans = spansNewestFirst(spansOnLocalDay(sessions, todayKey, now));
  const todayMinutes = totalMinutesOnLocalDay(sessions, todayKey, now);

  return (
    <div className="screen">
      <ModuleHeader title="Sommeil" toolId="sleep" />
      <Card>
        {active ? (
          <>
            <button
              type="button"
              className="timer-edit"
              onClick={() => setEditing(sleepSessionToActivity(active))}
              aria-label="Modifier la sieste en cours">
              <div className="timer">{formatDuration(elapsedMs(active.startedAt, active.endedAt, now))}</div>
              <p className="muted" style={{ textAlign: 'center' }}>
                Endormi depuis {formatTime(active.startedAt)} · modifier
              </p>
            </button>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await stopSleep(active.id);
                  returnHome(navigate);
                })
              }>
              Réveil
            </Button>
          </>
        ) : (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>
              Un appui démarre le timer. La durée vient de l’heure de début, pas d’un compteur interne.
            </p>
            <Button
              disabled={busy}
              onClick={() => {
                if (!babyId) return;
                void run(async () => {
                  await startSleep(babyId);
                  returnHome(navigate);
                });
              }}>
              Endormi
            </Button>
          </>
        )}
      </Card>
      <Card>
        <h2>Aujourd’hui · {todayMinutes > 0 ? formatMinuteCount(todayMinutes) : '0 min'}</h2>
        {todaySpans.length === 0 ? (
          <p className="muted">Pas encore de sieste aujourd’hui.</p>
        ) : (
          todaySpans.map((span) => {
            const row = sessions.find((item) => item.id === span.id);
            if (!row) return null;
            return (
              <JournalLine
                key={span.id}
                item={sleepSessionToActivity(row)}
                onClick={() => setEditing(sleepSessionToActivity(row))}
              />
            );
          })
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
