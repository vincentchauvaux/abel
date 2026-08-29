import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card } from '@/components/ui';
import { listSleep, startSleep, stopSleep } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { SleepSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { elapsedMs, formatDuration, formatMinutes, formatTime, startOfLocalDay } from '@/lib/dates';

export function SleepPage() {
  const { baby, tick } = useDb();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const babyId = baby?.id ?? '';

  useEffect(() => {
    if (!babyId) return;
    listSleep(babyId).then(setSessions);
  }, [babyId, tick]);

  const active = sessions.find((row) => !row.endedAt);
  const now = useNow(Boolean(active));
  const todayStart = startOfLocalDay().toISOString();
  const today = sessions.filter((row) => row.startedAt >= todayStart || (row.endedAt && row.endedAt >= todayStart));
  const todayMs = today.reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt, now), 0);

  return (
    <div className="screen">
      <ModuleHeader title="Sommeil" />
      <Card>
        {active ? (
          <>
            <div className="timer">{formatDuration(elapsedMs(active.startedAt, active.endedAt, now))}</div>
            <p className="muted" style={{ textAlign: 'center' }}>
              Endormi depuis {formatTime(active.startedAt)}
            </p>
            <Button onClick={() => stopSleep(active.id)}>Réveil</Button>
          </>
        ) : (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>
              Un appui démarre le timer. La durée vient de l’heure de début, pas d’un compteur interne.
            </p>
            <Button onClick={() => babyId && startSleep(babyId)}>Endormi</Button>
          </>
        )}
      </Card>
      <Card>
        <h2>Aujourd’hui · {formatMinutes(todayMs)}</h2>
        {today.length === 0 ? (
          <p className="muted">Pas encore de sieste aujourd’hui.</p>
        ) : (
          today.map((row) => (
            <div className="line" key={row.id}>
              <span>{formatTime(row.startedAt)}</span>
              <span className="muted">
                {formatDuration(elapsedMs(row.startedAt, row.endedAt, now))}
                {row.endedAt ? '' : ' · en cours'}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
