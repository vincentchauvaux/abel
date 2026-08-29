import { useEffect, useMemo, useState } from 'react';

import { Button, Card, Chip, Field } from '@/components/ui';
import {
  getReminder,
  lastFeeding,
  listBottles,
  listDiapers,
  listSleep,
  updateBaby,
  upsertCareGoals,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BottleFeed, DiaperEvent, FeedingSession, ReminderRule, SleepSession } from '@/db/types';
import { useNow } from '@/hooks/use-now';
import { formatAge, formatFromNow, formatLongDate, formatTime, parseDecimal, startOfLocalDay } from '@/lib/dates';
import { formatGoalMl, INTERVAL_PRESETS, ML_PRESETS } from '@/lib/goals';
import { fetchDailyHoroscope } from '@/lib/horoscope-api';
import { HOROSCOPE_DISCLAIMER, horoscopeFor } from '@/lib/horoscope';

export function BabyPage() {
  const { baby, tick } = useDb();
  const [name, setName] = useState(baby?.name ?? '');
  const [bornOn, setBornOn] = useState(baby?.bornOn ?? '');
  const [goals, setGoals] = useState<ReminderRule | undefined>();
  const [customFeed, setCustomFeed] = useState('');
  const [customBottle, setCustomBottle] = useState('');
  const [customMl, setCustomMl] = useState('');
  const [lastFeed, setLastFeed] = useState<FeedingSession | undefined>();
  const [bottles, setBottles] = useState<BottleFeed[]>([]);
  const [diapers, setDiapers] = useState<DiaperEvent[]>([]);
  const [sleeps, setSleeps] = useState<SleepSession[]>([]);
  const [daily, setDaily] = useState('');
  const now = useNow(true, 30_000);

  useEffect(() => {
    if (baby?.name) setName(baby.name);
    setBornOn(baby?.bornOn ?? '');
  }, [baby?.name, baby?.bornOn]);

  useEffect(() => {
    if (!baby) return;
    Promise.all([
      getReminder(baby.id),
      lastFeeding(baby.id),
      listBottles(baby.id),
      listDiapers(baby.id),
      listSleep(baby.id),
    ]).then(([r, ended, b, d, s]) => {
      setGoals(r);
      setLastFeed(ended);
      setBottles(b);
      setDiapers(d);
      setSleeps(s);
    });
  }, [baby, tick]);

  const horoscope = bornOn ? horoscopeFor(bornOn) : null;

  useEffect(() => {
    if (!bornOn) {
      setDaily('');
      return;
    }
    let cancelled = false;
    fetchDailyHoroscope(bornOn).then((reading) => {
      if (!cancelled) setDaily(reading.text);
    });
    return () => {
      cancelled = true;
    };
  }, [bornOn]);
  const lastBottle = bottles[0];
  const lastDiaper = diapers[0];
  const activeSleep = sleeps.find((row) => !row.endedAt);
  const delay = goals?.delayMinutes ?? 0;
  const bottleMl = goals?.bottleMl ?? null;
  const bottleEvery = goals?.bottleMinutes === null || goals?.bottleMinutes === undefined ? delay : goals.bottleMinutes;
  const diaperEvery = goals?.diaperMinutes ?? 0;
  const todayMl = bottles
    .filter((row) => row.fedAt >= startOfLocalDay().toISOString())
    .reduce((sum, row) => sum + (row.amountMl ?? 0), 0);

  const feedingAlert = useMemo(() => {
    if (!lastFeed) return 'Pas encore de tétée.';
    if (!lastFeed.endedAt) return `Tétée en cours depuis ${formatTime(lastFeed.startedAt)}.`;
    if (delay <= 0) return `Dernière tétée à ${formatTime(lastFeed.endedAt)}.`;
    const fire = new Date(lastFeed.endedAt);
    fire.setMinutes(fire.getMinutes() + delay);
    const iso = fire.toISOString();
    if (fire.getTime() > now) return `Prochaine tétée ${formatFromNow(iso, now)}.`;
    return `Rappel tétée dépassé ${formatFromNow(iso, now)}.`;
  }, [lastFeed, delay, now]);

  const bottleAlert = useMemo(() => {
    const parts: string[] = [];
    if (lastBottle) {
      const qty =
        lastBottle.amountMl == null
          ? 'quantité non notée'
          : bottleMl && lastBottle.amountMl !== bottleMl
            ? `${lastBottle.amountMl} ml (objectif ${formatGoalMl(bottleMl)})`
            : `${lastBottle.amountMl} ml`;
      parts.push(`Dernier à ${formatTime(lastBottle.fedAt)} · ${qty}.`);
      if (bottleEvery > 0) {
        const fire = new Date(lastBottle.fedAt);
        fire.setMinutes(fire.getMinutes() + bottleEvery);
        const iso = fire.toISOString();
        parts.push(
          fire.getTime() > now ? `Prochain biberon ${formatFromNow(iso, now)}.` : `Biberon en retard ${formatFromNow(iso, now)}.`,
        );
      }
    } else {
      parts.push('Pas encore de biberon.');
    }
    if (bottleMl) parts.push(`Aujourd’hui ${todayMl} ml · ${formatGoalMl(bottleMl)} par repas (si noté).`);
    else if (todayMl) parts.push(`Aujourd’hui ${todayMl} ml.`);
    return parts.join(' ');
  }, [lastBottle, bottleMl, bottleEvery, todayMl, now]);

  const diaperAlert = useMemo(() => {
    if (!lastDiaper) return 'Pas encore de couche.';
    if (diaperEvery <= 0) {
      return `Dernière à ${formatTime(lastDiaper.occurredAt)} · ${formatFromNow(lastDiaper.occurredAt, now)}.`;
    }
    const fire = new Date(lastDiaper.occurredAt);
    fire.setMinutes(fire.getMinutes() + diaperEvery);
    const iso = fire.toISOString();
    if (fire.getTime() > now) return `Prochaine couche ${formatFromNow(iso, now)}.`;
    return `Couche en retard ${formatFromNow(iso, now)}.`;
  }, [lastDiaper, diaperEvery, now]);

  const saveIdentity = () => {
    if (!baby) return;
    updateBaby(baby.id, { name, bornOn: bornOn || null });
  };

  const saveGoals = (patch: Parameters<typeof upsertCareGoals>[1]) => {
    if (!baby) return;
    upsertCareGoals(baby.id, patch);
  };

  return (
    <div className="screen">
      <h1>{baby?.name || 'Bébé'}</h1>
      <Card>
        <h2>Identité</h2>
        <label className="field">
          <span>Prénom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveIdentity} />
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
        <Button onClick={saveIdentity}>Enregistrer</Button>
      </Card>
      <Card>
        <h2>Objectifs</h2>
        <p className="muted">Tes règles à toi. Ce n’est pas un conseil médical.</p>
        <p className="goal-label">Tétées toutes les</p>
        <div className="row">
          {INTERVAL_PRESETS.map((item) => (
            <Chip
              key={`feed-${item.minutes}`}
              label={item.label}
              selected={delay === item.minutes}
              onClick={() => saveGoals({ delayMinutes: item.minutes })}
            />
          ))}
        </div>
        <label className="field">
          <span>Personnalisé (minutes)</span>
          <input
            value={customFeed}
            onChange={(e) => setCustomFeed(e.target.value)}
            inputMode="numeric"
            placeholder="90"
          />
        </label>
        <Button
          tone="muted"
          onClick={() => {
            const n = Number.parseInt(customFeed, 10);
            if (Number.isFinite(n) && n >= 0) saveGoals({ delayMinutes: n });
          }}>
          OK tétées
        </Button>
        <p className="goal-label">Biberon toutes les</p>
        <div className="row">
          <Chip
            label="Comme tétée"
            selected={goals?.bottleMinutes == null}
            onClick={() => saveGoals({ bottleMinutes: null })}
          />
          {INTERVAL_PRESETS.map((item) => (
            <Chip
              key={`bot-${item.minutes}`}
              label={item.label}
              selected={goals?.bottleMinutes === item.minutes}
              onClick={() => saveGoals({ bottleMinutes: item.minutes })}
            />
          ))}
        </div>
        <label className="field">
          <span>Personnalisé (minutes)</span>
          <input
            value={customBottle}
            onChange={(e) => setCustomBottle(e.target.value)}
            inputMode="numeric"
            placeholder="150"
          />
        </label>
        <Button
          tone="muted"
          onClick={() => {
            const n = Number.parseInt(customBottle, 10);
            if (Number.isFinite(n) && n >= 0) saveGoals({ bottleMinutes: n });
          }}>
          OK biberon
        </Button>
        <p className="goal-label">Lait par repas</p>
        <div className="row">
          <Chip label="Aucun" selected={bottleMl == null} onClick={() => saveGoals({ bottleMl: null })} />
          {ML_PRESETS.map((item) => (
            <Chip
              key={item.ml}
              label={item.label}
              selected={bottleMl === item.ml}
              onClick={() => saveGoals({ bottleMl: item.ml })}
            />
          ))}
        </div>
        <Field label="Personnalisé (ml)" value={customMl} onChange={setCustomMl} placeholder="300" />
        <Button
          tone="muted"
          onClick={() => {
            const n = parseDecimal(customMl);
            if (n !== null && n > 0) saveGoals({ bottleMl: Math.round(n) });
          }}>
          OK quantité
        </Button>
        <p className="goal-label">Couches toutes les</p>
        <div className="row">
          {INTERVAL_PRESETS.map((item) => (
            <Chip
              key={`diap-${item.minutes}`}
              label={item.label}
              selected={diaperEvery === item.minutes}
              onClick={() => saveGoals({ diaperMinutes: item.minutes })}
            />
          ))}
        </div>
      </Card>
      {horoscope ? (
        <Card>
          <h2>Petit horoscope</h2>
          <p className="zodiac">
            <span className="zodiac-symbol">{horoscope.symbol}</span>
            <strong>
              {horoscope.sign} · {horoscope.animal} · {horoscope.element}
            </strong>
          </p>
          <p className="goal-label">Horoscope du jour</p>
          <p>{daily || horoscope.line}</p>
          <p className="goal-label">Médecine occidentale</p>
          <p>{horoscope.western}</p>
          <p className="goal-label">Médecine chinoise</p>
          <p>{horoscope.chinese}</p>
          <p className="muted">{HOROSCOPE_DISCLAIMER}</p>
        </Card>
      ) : (
        <Card>
          <h2>Petit horoscope</h2>
          <p className="muted">Ajoute la date de naissance pour afficher le signe, les lectures et l’horoscope du jour.</p>
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
          <span>{bottleAlert}</span>
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
          <span>{diaperAlert}</span>
        </div>
      </Card>
    </div>
  );
}
