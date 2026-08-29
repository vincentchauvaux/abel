import { useEffect, useMemo, useState } from 'react';

import { ActivityEditor } from '@/components/ActivityEditor';
import { SmartEntryForm } from '@/components/SmartEntryForm';
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
import { listActivity, type ActivityItem } from '@/lib/activity';
import { formatAge, formatDateTime, formatFromNow, formatLongDate, formatTime, parseDecimal, startOfLocalDay } from '@/lib/dates';
import { formatGoalMl, DIAPER_AFTER_MEAL_PRESETS, INTERVAL_PRESETS, ML_PRESETS } from '@/lib/goals';
import { fetchDailyHoroscope } from '@/lib/horoscope-api';
import { HOROSCOPE_DISCLAIMER, horoscopeFor } from '@/lib/horoscope';
import { lastMealAt, notifyAfterMs } from '@/lib/reminders';

function formatEvery(minutes: number): string {
  if (minutes <= 0) return 'aucun rappel';
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? 'toutes les 1 h' : `toutes les ${h} h`;
  }
  return `toutes les ${minutes} min`;
}

function formatDiaperAfter(minutes: number): string {
  if (minutes <= 0) return 'aucun rappel';
  if (minutes === 60) return '1 h après le repas';
  return `${minutes} min après le repas`;
}

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
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [editing, setEditing] = useState<ActivityItem | null>(null);
  const [editIdentity, setEditIdentity] = useState(true);
  const [editGoals, setEditGoals] = useState(true);
  const [goalsReady, setGoalsReady] = useState(false);
  const now = useNow(true, 30_000);

  useEffect(() => {
    if (baby?.name) setName(baby.name);
    setBornOn(baby?.bornOn ?? '');
  }, [baby?.name, baby?.bornOn]);

  useEffect(() => {
    if (!baby) return;
    setEditIdentity(!(baby.bornOn && baby.name));
  }, [baby?.id]);

  useEffect(() => {
    if (!baby) return;
    Promise.all([
      getReminder(baby.id),
      lastFeeding(baby.id),
      listBottles(baby.id),
      listDiapers(baby.id),
      listSleep(baby.id),
      listActivity(baby.id),
    ]).then(([r, ended, b, d, s, log]) => {
      setGoals(r);
      setLastFeed(ended);
      setBottles(b);
      setDiapers(d);
      setSleeps(s);
      setActivity(log);
      const configured =
        Boolean(r) &&
        ((r?.delayMinutes ?? 0) > 0 ||
          r?.bottleMinutes != null ||
          r?.bottleMl != null ||
          (r?.diaperMinutes ?? 0) > 0);
      setGoalsReady(configured);
    });
  }, [baby, tick]);

  useEffect(() => {
    if (!baby) return;
    getReminder(baby.id).then((r) => {
      const configured =
        Boolean(r) &&
        ((r?.delayMinutes ?? 0) > 0 ||
          r?.bottleMinutes != null ||
          r?.bottleMl != null ||
          (r?.diaperMinutes ?? 0) > 0);
      setGoalsReady(configured);
      setEditGoals(!configured);
    });
  }, [baby?.id]);

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
  const diaperAfter = goals?.diaperMinutes ?? 0;
  const todayMl = bottles
    .filter((row) => row.fedAt >= startOfLocalDay().toISOString())
    .reduce((sum, row) => sum + row.amountMl, 0);

  const mealAt = useMemo(() => lastMealAt(lastFeed, lastBottle), [lastFeed, lastBottle]);

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
        bottleMl && lastBottle.amountMl !== bottleMl
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
    if (bottleMl) parts.push(`Aujourd’hui ${todayMl} ml · ${formatGoalMl(bottleMl)} par repas.`);
    else if (todayMl) parts.push(`Aujourd’hui ${todayMl} ml.`);
    return parts.join(' ');
  }, [lastBottle, bottleMl, bottleEvery, todayMl, now]);

  const diaperAlert = useMemo(() => {
    const lastLine = lastDiaper
      ? `Dernière couche à ${formatTime(lastDiaper.occurredAt)}.`
      : 'Pas encore de couche.';
    if (diaperAfter <= 0) return lastLine;
    if (!mealAt) return `${lastLine} Pas encore de repas pour démarrer le rappel.`;
    if (lastDiaper && lastDiaper.occurredAt >= mealAt) {
      return `Couche déjà notée après le dernier repas · ${formatTime(lastDiaper.occurredAt)}.`;
    }
    const fire = new Date(mealAt);
    fire.setMinutes(fire.getMinutes() + diaperAfter);
    const iso = fire.toISOString();
    if (fire.getTime() > now) {
      return `Rappel couche ${formatFromNow(iso, now)} (après le repas de ${formatTime(mealAt)}).`;
    }
    return `Rappel couche dépassé ${formatFromNow(iso, now)} (repas ${formatTime(mealAt)}).`;
  }, [lastDiaper, diaperAfter, mealAt, now]);

  const saveIdentity = () => {
    if (!baby) return;
    updateBaby(baby.id, { name, bornOn: bornOn || null });
    if (name.trim() && bornOn) setEditIdentity(false);
  };

  const saveGoals = async (patch: Parameters<typeof upsertCareGoals>[1]) => {
    if (!baby) return;
    await upsertCareGoals(baby.id, patch);
    const after = patch.diaperMinutes;
    if (after != null && after > 0 && mealAt) {
      const remaining = after * 60_000 - (Date.now() - new Date(mealAt).getTime());
      if (remaining > 0 && (!lastDiaper || lastDiaper.occurredAt < mealAt)) {
        await notifyAfterMs(remaining, 'Rappel couche après le repas');
      }
    }
  };

  const bottleEveryLabel =
    goals?.bottleMinutes == null ? `comme tétée (${formatEvery(delay)})` : formatEvery(goals.bottleMinutes);

  return (
    <div className="screen">
      <h1>{baby?.name || 'Bébé'}</h1>
      <Card>
        <h2>Noter une entrée</h2>
        <SmartEntryForm />
      </Card>
      <Card>
        <div className="card-head">
          <h2>Identité</h2>
          {!editIdentity ? (
            <button type="button" className="linkish" onClick={() => setEditIdentity(true)}>
              Modifier
            </button>
          ) : null}
        </div>
        {editIdentity ? (
          <>
            <label className="field">
              <span>Prénom</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Date de naissance</span>
              <input type="date" value={bornOn} onChange={(e) => setBornOn(e.target.value)} />
            </label>
            <Button onClick={saveIdentity}>Enregistrer</Button>
            {name.trim() && bornOn ? (
              <Button tone="muted" onClick={() => setEditIdentity(false)}>
                Annuler
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <div className="info-line">
              <span className="muted">Prénom</span>
              <strong>{name || '—'}</strong>
            </div>
            <div className="info-line">
              <span className="muted">Naissance</span>
              <strong>{bornOn ? `${formatLongDate(bornOn)} · ${formatAge(bornOn)}` : '—'}</strong>
            </div>
          </>
        )}
      </Card>
      <Card>
        <div className="card-head">
          <h2>Objectifs</h2>
          {!editGoals && goalsReady ? (
            <button type="button" className="linkish" onClick={() => setEditGoals(true)}>
              Modifier
            </button>
          ) : null}
        </div>
        <p className="muted">Tes règles à toi. Ce n’est pas un conseil médical.</p>
        {editGoals ? (
          <>
            <p className="goal-label">Tétées toutes les</p>
            <div className="row">
              {INTERVAL_PRESETS.map((item) => (
                <Chip
                  key={`feed-${item.minutes}`}
                  label={item.label}
                  selected={delay === item.minutes}
                  onClick={() => void saveGoals({ delayMinutes: item.minutes })}
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
                if (Number.isFinite(n) && n >= 0) void saveGoals({ delayMinutes: n });
              }}>
              OK tétées
            </Button>
            <p className="goal-label">Biberon toutes les</p>
            <div className="row">
              <Chip
                label="Comme tétée"
                selected={goals?.bottleMinutes == null}
                onClick={() => void saveGoals({ bottleMinutes: null })}
              />
              {INTERVAL_PRESETS.map((item) => (
                <Chip
                  key={`bot-${item.minutes}`}
                  label={item.label}
                  selected={goals?.bottleMinutes === item.minutes}
                  onClick={() => void saveGoals({ bottleMinutes: item.minutes })}
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
                if (Number.isFinite(n) && n >= 0) void saveGoals({ bottleMinutes: n });
              }}>
              OK biberon
            </Button>
            <p className="goal-label">Lait par repas</p>
            <div className="row">
              <Chip label="Aucun" selected={bottleMl == null} onClick={() => void saveGoals({ bottleMl: null })} />
              {ML_PRESETS.map((item) => (
                <Chip
                  key={item.ml}
                  label={item.label}
                  selected={bottleMl === item.ml}
                  onClick={() => void saveGoals({ bottleMl: item.ml })}
                />
              ))}
            </div>
            <Field label="Personnalisé (ml)" value={customMl} onChange={setCustomMl} placeholder="300" />
            <Button
              tone="muted"
              onClick={() => {
                const n = parseDecimal(customMl);
                if (n !== null && n > 0) void saveGoals({ bottleMl: Math.round(n) });
              }}>
              OK quantité
            </Button>
            <p className="goal-label">Couche après le repas</p>
            <p className="muted">Rappel X minutes après la dernière tétée ou le dernier biberon (si Abel reste ouvert).</p>
            <div className="row">
              {DIAPER_AFTER_MEAL_PRESETS.map((item) => (
                <Chip
                  key={`diap-${item.minutes}`}
                  label={item.label}
                  selected={diaperAfter === item.minutes}
                  onClick={() => void saveGoals({ diaperMinutes: item.minutes })}
                />
              ))}
            </div>
            <Button
              onClick={() => {
                setGoalsReady(true);
                setEditGoals(false);
              }}>
              Terminer
            </Button>
          </>
        ) : (
          <>
            <div className="info-line">
              <span className="muted">Tétées</span>
              <strong>{formatEvery(delay)}</strong>
            </div>
            <div className="info-line">
              <span className="muted">Biberon</span>
              <strong>{bottleEveryLabel}</strong>
            </div>
            <div className="info-line">
              <span className="muted">Lait par repas</span>
              <strong>{bottleMl ? formatGoalMl(bottleMl) : 'non défini'}</strong>
            </div>
            <div className="info-line">
              <span className="muted">Couche</span>
              <strong>{formatDiaperAfter(diaperAfter)}</strong>
            </div>
          </>
        )}
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
      <Card>
        <h2>Journal</h2>
        <p className="muted">Appuie sur une ligne pour modifier ou supprimer.</p>
        {activity.length === 0 ? (
          <p className="muted">Pas encore d’entrée.</p>
        ) : (
          activity.map((row) => (
            <button
              key={`${row.kind}-${row.id}`}
              type="button"
              className="line log-line"
              onClick={() => setEditing(row)}>
              <span>
                <strong>{formatDateTime(row.at)}</strong>
                <span className="muted"> · {row.title}</span>
              </span>
              <span className="muted">{row.detail}</span>
            </button>
          ))
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
