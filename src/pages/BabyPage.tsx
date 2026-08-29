import { useEffect, useMemo, useState } from 'react';

import { Button, Card } from '@/components/ui';
import {
  getReminder,
  lastEndedFeeding,
  listBottles,
  listDiapers,
  listSleep,
  updateBaby,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BottleFeed, DiaperEvent, FeedingSession, SleepSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { formatAge, formatFromNow, formatLongDate, formatTime } from '@/lib/dates';
import { horoscopeFor } from '@/lib/horoscope';

export function BabyPage() {
  const { baby, tick } = useDb();
  const [name, setName] = useState(baby?.name ?? '');
  const [bornOn, setBornOn] = useState(baby?.bornOn ?? '');
  const [delay, setDelay] = useState(0);
  const [lastFeed, setLastFeed] = useState<FeedingSession | undefined>();
  const [bottles, setBottles] = useState<BottleFeed[]>([]);
  const [diapers, setDiapers] = useState<DiaperEvent[]>([]);
  const [sleeps, setSleeps] = useState<SleepSession[]>([]);
  const now = useNow(true, 30_000);

  useEffect(() => {
    if (baby?.name) setName(baby.name);
    setBornOn(baby?.bornOn ?? '');
  }, [baby?.name, baby?.bornOn]);

  useEffect(() => {
    if (!baby) return;
    Promise.all([
      getReminder(baby.id),
      lastEndedFeeding(baby.id),
      listBottles(baby.id),
      listDiapers(baby.id),
      listSleep(baby.id),
    ]).then(([r, ended, b, d, s]) => {
      setDelay(r?.delayMinutes ?? 0);
      setLastFeed(ended);
      setBottles(b);
      setDiapers(d);
      setSleeps(s);
    });
  }, [baby, tick]);

  const horoscope = bornOn ? horoscopeFor(bornOn) : null;
  const lastBottle = bottles[0];
  const lastDiaper = diapers[0];
  const activeSleep = sleeps.find((row) => !row.endedAt);

  const feedingAlert = useMemo(() => {
    if (!lastFeed?.endedAt) return 'Pas encore de tétée.';
    if (delay <= 0) return `Dernière tétée à ${formatTime(lastFeed.endedAt)}.`;
    const fire = new Date(lastFeed.endedAt);
    fire.setMinutes(fire.getMinutes() + delay);
    const iso = fire.toISOString();
    if (fire.getTime() > now) return `Prochaine tétée ${formatFromNow(iso, now)}.`;
    return `Rappel tétée dépassé ${formatFromNow(iso, now)}.`;
  }, [lastFeed, delay, now]);

  const save = () => {
    if (!baby) return;
    updateBaby(baby.id, { name, bornOn: bornOn || null });
  };

  return (
    <div className="screen">
      <h1>{baby?.name || 'Bébé'}</h1>
      <Card>
        <h2>Identité</h2>
        <label className="field">
          <span>Prénom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} />
        </label>
        <label className="field">
          <span>Date de naissance</span>
          <input
            type="date"
            value={bornOn}
            onChange={(e) => {
              const next = e.target.value;
              setBornOn(next);
              if (baby) updateBaby(baby.id, { name, bornOn: next || null });
            }}
          />
        </label>
        {bornOn ? (
          <p className="muted">
            {formatLongDate(bornOn)} · {formatAge(bornOn)}
          </p>
        ) : null}
        <Button onClick={save}>Enregistrer</Button>
      </Card>
      {horoscope ? (
        <Card>
          <h2>Petit horoscope</h2>
          <p className="zodiac">
            <span className="zodiac-symbol">{horoscope.symbol}</span>
            <strong>
              {horoscope.sign} · {horoscope.chinese}
            </strong>
          </p>
          <p>{horoscope.line}</p>
          <p className="muted">Pour le plaisir, ce n’est pas un conseil.</p>
        </Card>
      ) : (
        <Card>
          <h2>Petit horoscope</h2>
          <p className="muted">Ajoute la date de naissance pour afficher le signe.</p>
        </Card>
      )}
      <Card>
        <h2>Alertes</h2>
        <div className="alert-line">
          <span className="muted">Tétée</span>
          <span>{feedingAlert}</span>
        </div>
        <div className="alert-line">
          <span className="muted">Biberon</span>
          <span>
            {lastBottle
              ? `Dernier à ${formatTime(lastBottle.fedAt)} · ${formatFromNow(lastBottle.fedAt, now)}.`
              : 'Pas encore de biberon.'}
          </span>
        </div>
        <div className="alert-line">
          <span className="muted">Sommeil</span>
          <span>
            {activeSleep
              ? `Endormi depuis ${formatTime(activeSleep.startedAt)} · ${formatFromNow(activeSleep.startedAt, now)}.`
              : 'Pas de sieste en cours.'}
          </span>
        </div>
        <div className="alert-line">
          <span className="muted">Couche</span>
          <span>
            {lastDiaper
              ? `Dernière à ${formatTime(lastDiaper.occurredAt)} · ${formatFromNow(lastDiaper.occurredAt, now)}.`
              : 'Pas encore de couche.'}
          </span>
        </div>
      </Card>
    </div>
  );
}
