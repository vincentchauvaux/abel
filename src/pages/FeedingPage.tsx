import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip } from '@/components/ui';
import {
  getReminder,
  lastEndedFeeding,
  listSegments,
  listSessions,
  startFeeding,
  stopFeeding,
  switchFeedingSide,
  upsertReminderRule,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { FeedingSegment, FeedingSession, Side } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { elapsedMs, formatDuration, formatMinutes, formatTime, startOfLocalDay } from '@/lib/dates';
import { sideLabel } from '@/lib/labels';

const SIDES: Side[] = ['LEFT', 'RIGHT', 'BOTH'];
const PRESETS = [
  { label: 'Aucun', minutes: 0 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
];

export function FeedingPage() {
  const { baby, tick } = useDb();
  const [sessions, setSessions] = useState<FeedingSession[]>([]);
  const [segments, setSegments] = useState<FeedingSegment[]>([]);
  const [delay, setDelay] = useState(0);
  const [custom, setCustom] = useState('');
  const babyId = baby?.id ?? '';

  useEffect(() => {
    if (!babyId) return;
    Promise.all([listSessions(babyId), listSegments(), getReminder(babyId)]).then(([s, g, r]) => {
      setSessions(s);
      setSegments(g);
      setDelay(r?.delayMinutes ?? 0);
    });
  }, [babyId, tick]);

  const active = sessions.find((row) => !row.endedAt);
  const now = useNow(Boolean(active));
  const activeSegments = segments.filter((row) => row.feedingSessionId === active?.id);
  const open = activeSegments.find((row) => !row.endedAt);
  const todayStart = startOfLocalDay().toISOString();
  const today = sessions.filter((row) => row.startedAt >= todayStart);
  const todayMs = today.reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt, now), 0);

  const sideMs = (side: Side) =>
    activeSegments
      .filter((row) => row.side === side)
      .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt, now), 0);

  const setDelayRule = async (minutes: number) => {
    if (!babyId) return;
    await upsertReminderRule(babyId, minutes);
    const ended = await lastEndedFeeding(babyId);
    if (ended?.endedAt && minutes > 0 && 'Notification' in window) {
      const ok = await Notification.requestPermission();
      if (ok === 'granted') {
        const fire = new Date(ended.endedAt).getTime() + minutes * 60_000 - Date.now();
        if (fire > 0) {
          window.setTimeout(() => new Notification('Abel', { body: 'Rappel tétée' }), fire);
        }
      }
    }
  };

  return (
    <div className="screen">
      <ModuleHeader title="Allaitement" />
      <Card>
        {active ? (
          <>
            <div className="timer">{formatDuration(elapsedMs(active.startedAt, active.endedAt, now))}</div>
            <p className="muted" style={{ textAlign: 'center' }}>
              Début {formatTime(active.startedAt)}
            </p>
            <p style={{ textAlign: 'center', fontWeight: 700 }}>
              Gauche {formatDuration(sideMs('LEFT'))} · Droit {formatDuration(sideMs('RIGHT'))}
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              {SIDES.map((side) => (
                <Chip
                  key={side}
                  label={sideLabel[side]}
                  selected={open?.side === side}
                  onClick={() => switchFeedingSide(active.id, side)}
                />
              ))}
            </div>
            <Button
              onClick={async () => {
                const endedAt = await stopFeeding(active.id);
                if (delay > 0 && 'Notification' in window) {
                  const ok = await Notification.requestPermission();
                  if (ok === 'granted') {
                    window.setTimeout(
                      () => new Notification('Abel', { body: 'Rappel tétée' }),
                      delay * 60_000,
                    );
                  }
                }
                void endedAt;
              }}>
              Terminer
            </Button>
          </>
        ) : (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>
              Choisis un côté, puis appuie pour démarrer.
            </p>
            <div className="row">
              {SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => babyId && startFeeding(babyId, side)}>
                  {sideLabel[side]}
                </button>
              ))}
            </div>
          </>
        )}
      </Card>
      <Card>
        <h2>Aujourd’hui</h2>
        <p>
          <strong>
            {today.length} tétées · {formatMinutes(todayMs)}
          </strong>
        </p>
        {today.map((session) => (
          <div className="line" key={session.id}>
            <span>{formatTime(session.startedAt)}</span>
            <span className="muted">
              {formatDuration(elapsedMs(session.startedAt, session.endedAt, now))}
              {session.endedAt ? '' : ' · en cours'}
            </span>
          </div>
        ))}
      </Card>
      <Card>
        <h2>Rappel après la dernière tétée</h2>
        <p className="muted">S’affiche si Abel reste ouvert dans le navigateur.</p>
        <div className="row">
          {PRESETS.map((item) => (
            <Chip
              key={item.minutes}
              label={item.label}
              selected={delay === item.minutes}
              onClick={() => setDelayRule(item.minutes)}
            />
          ))}
        </div>
        <label className="field">
          <span>Personnalisé (minutes)</span>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="numeric" placeholder="150" />
        </label>
        <Button
          tone="muted"
          onClick={() => {
            const n = Number.parseInt(custom, 10);
            if (Number.isFinite(n) && n >= 0) setDelayRule(n);
          }}>
          OK
        </Button>
      </Card>
    </div>
  );
}
