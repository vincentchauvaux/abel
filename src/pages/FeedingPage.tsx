import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip } from '@/components/ui';
import {
  getReminder,
  lastEndedFeeding,
  listSegments,
  listSessions,
  logFeedingNow,
  startFeeding,
  stopFeeding,
  switchFeedingSide,
  upsertReminderRule,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { FeedingSegment, FeedingSession, Side } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { elapsedMs, formatDuration, formatFeedLabel, formatMinutes, formatTime, startOfLocalDay } from '@/lib/dates';
import { INTERVAL_PRESETS } from '@/lib/goals';
import { sideLabel } from '@/lib/labels';

const SIDES: Side[] = ['LEFT', 'RIGHT', 'BOTH'];

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

  const afterStop = async () => {
    if (delay > 0 && 'Notification' in window) {
      const ok = await Notification.requestPermission();
      if (ok === 'granted') {
        window.setTimeout(() => new Notification('Abel', { body: 'Rappel tétée' }), delay * 60_000);
      }
    }
  };

  return (
    <div className="screen">
      <ModuleHeader title="Allaitement" />
      {active ? (
        <Card>
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
              await stopFeeding(active.id);
              await afterStop();
            }}>
            Terminer
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <h2>Noter une tétée</h2>
            <p className="muted">
              Au sein, on ne connaît pas les ml. Un appui enregistre l’heure, sans quantité.
            </p>
            <div className="row">
              {SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={async () => {
                    if (!babyId) return;
                    await logFeedingNow(babyId, side);
                    await afterStop();
                  }}>
                  {sideLabel[side]}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <h2>Minuteur</h2>
            <p className="muted">Si tu veux la durée. Toujours sans ml.</p>
            <div className="row">
              {SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  className="btn btn-muted"
                  style={{ flex: 1 }}
                  onClick={() => babyId && startFeeding(babyId, side)}>
                  {sideLabel[side]}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
      <Card>
        <h2>Aujourd’hui</h2>
        <p>
          <strong>
            {today.length} tétée{today.length > 1 ? 's' : ''}
            {todayMs > 0 ? ` · ${formatMinutes(todayMs)}` : ''}
          </strong>
        </p>
        {today.map((session) => {
          const sides = [
            ...new Set(
              segments.filter((row) => row.feedingSessionId === session.id).map((row) => sideLabel[row.side]),
            ),
          ].join(' · ');
          return (
            <div className="line" key={session.id}>
              <span>{formatTime(session.startedAt)}</span>
              <span className="muted">
                {session.endedAt ? formatFeedLabel(session.startedAt, session.endedAt, now) : 'en cours'}
                {sides ? ` · ${sides}` : ''}
              </span>
            </div>
          );
        })}
      </Card>
      <Card>
        <h2>Rappel après la dernière tétée</h2>
        <p className="muted">Même réglage que sur Bébé. S’affiche si Abel reste ouvert dans le navigateur.</p>
        <div className="row">
          {INTERVAL_PRESETS.map((item) => (
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
