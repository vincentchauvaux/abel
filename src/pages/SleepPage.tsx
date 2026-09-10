import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card } from '@/components/ui';
import { listSleep, startSleep, stopSleep } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { SleepSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { elapsedMs, formatDuration, formatMinuteCount, formatTime, isoAtLocalMinutes, localDateKey, spansOnLocalDay } from '@/lib/dates';

export function SleepPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const babyId = baby?.id ?? '';

  useEffect(() => {
    if (!babyId) return;
    listSleep(babyId).then(setSessions);
  }, [babyId, tick]);

  const active = sessions.find((row) => !row.endedAt);
  const now = useNow(Boolean(active));
  const todayKey = localDateKey(new Date(now).toISOString());
  const todaySpans = spansOnLocalDay(sessions, todayKey, now);
  const todayMinutes = todaySpans.reduce((sum, span) => sum + span.minutes, 0);

  return (
    <div className="screen">
      <ModuleHeader title="Sommeil" toolId="sleep" />
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
            <Button
              onClick={async () => {
                if (!babyId) return;
                await startSleep(babyId);
                navigate('/');
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
            return (
              <div className="line" key={span.id}>
                <span>{formatTime(isoAtLocalMinutes(todayKey, span.startMin))}</span>
                <span className="muted">
                  {span.minutes > 0 ? formatMinuteCount(span.minutes) : 'notée'}
                  {row && !row.endedAt ? ' · en cours' : ''}
                </span>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
