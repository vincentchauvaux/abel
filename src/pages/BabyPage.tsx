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
import {
  DIAPER_MEAL_PRESETS,
  diaperReminderAt,
  formatBottleMlGoal,
  formatDiaperGoal,
  formatMealGoal,
  INTERVAL_PRESETS,
  ML_PRESETS,
  type DiaperWhen,
} from '@/lib/goals';
import { fetchDailyHoroscope } from '@/lib/horoscope-api';
import { HOROSCOPE_DISCLAIMER, horoscopeFor } from '@/lib/horoscope';
import { bottleMlAlertLine, lastMealAt, mealAlertLine, notifyDiaperFromGoals } from '@/lib/reminders';

export function BabyPage() {
  const { baby, tick } = useDb();
  const [name, setName] = useState(baby?.name ?? '');
  const [bornOn, setBornOn] = useState(baby?.bornOn ?? '');
  const [goals, setGoals] = useState<ReminderRule | undefined>();
  const [customFeed, setCustomFeed] = useState('');
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
  const [showEntry, setShowEntry] = useState(false);
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
        ((r?.delayMinutes ?? 0) > 0 || r?.bottleMl != null || (r?.diaperMinutes ?? 0) > 0);
      setGoalsReady(configured);
    });
  }, [baby, tick]);

  useEffect(() => {
    if (!baby) return;
    getReminder(baby.id).then((r) => {
      const configured =
        Boolean(r) &&
        ((r?.delayMinutes ?? 0) > 0 || r?.bottleMl != null || (r?.diaperMinutes ?? 0) > 0);
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
  const diaperOffset = goals?.diaperMinutes ?? 0;
  const diaperWhen: DiaperWhen = goals?.diaperWhen === 'before' ? 'before' : 'after';
  const todayMl = bottles
    .filter((row) => row.fedAt >= startOfLocalDay().toISOString())
    .reduce((sum, row) => sum + row.amountMl, 0);

  const mealAt = useMemo(() => lastMealAt(lastFeed, lastBottle), [lastFeed, lastBottle]);

  const mealAlert = useMemo(
    () =>
      mealAlertLine({
        feed: lastFeed,
        bottle: lastBottle,
        mealIntervalMinutes: delay,
        now,
      }),
    [lastFeed, lastBottle, delay, now],
  );

  const bottleMlAlert = useMemo(
    () => bottleMlAlertLine(bottleMl, todayMl),
    [bottleMl, todayMl],
  );

  const diaperAlert = useMemo(() => {
    const lastLine = lastDiaper
      ? `Dernière couche à ${formatTime(lastDiaper.occurredAt)}.`
      : 'Pas encore de couche.';
    if (diaperOffset <= 0) return lastLine;
    if (!mealAt) return `${lastLine} Pas encore de repas pour démarrer le rappel.`;
    if (diaperWhen === 'before' && delay <= 0) {
      return `${lastLine} Définis un intervalle de repas pour le rappel avant le repas.`;
    }
    const fire = diaperReminderAt(mealAt, delay, diaperWhen, diaperOffset);
    const iso = fire.toISOString();
    if (lastDiaper && lastDiaper.occurredAt >= iso) {
      return `Couche déjà notée · ${formatTime(lastDiaper.occurredAt)}.`;
    }
    const whenLabel = diaperWhen === 'before' ? 'avant le prochain repas' : 'après le repas';
    if (fire.getTime() > now) {
      return `Rappel couche ${formatFromNow(iso, now)} (${whenLabel}, repas ${formatTime(mealAt)}).`;
    }
    return `Rappel couche dépassé ${formatFromNow(iso, now)} (${whenLabel}).`;
  }, [lastDiaper, diaperOffset, diaperWhen, mealAt, delay, now]);

  const saveIdentity = () => {
    if (!baby) return;
    updateBaby(baby.id, { name, bornOn: bornOn || null });
    if (name.trim() && bornOn) setEditIdentity(false);
  };

  const saveGoals = async (patch: Parameters<typeof upsertCareGoals>[1]) => {
    if (!baby) return;
    await upsertCareGoals(baby.id, { bottleMinutes: null, ...patch });
    const next = await getReminder(baby.id);
    setGoals(next);
    if (mealAt) await notifyDiaperFromGoals(next, mealAt);
  };

  return (
    <div className="screen">
      <h1>{baby?.name || 'Bébé'}</h1>
      {showEntry ? (
        <Card>
          <div className="card-head">
            <h2>Noter une entrée</h2>
            <button type="button" className="linkish" onClick={() => setShowEntry(false)}>
              Fermer
            </button>
          </div>
          <SmartEntryForm onSaved={() => setShowEntry(false)} />
        </Card>
      ) : (
        <Button onClick={() => setShowEntry(true)}>Noter une entrée</Button>
      )}
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
            <p className="goal-label">Repas toutes les</p>
            <div className="row">
              {INTERVAL_PRESETS.map((item) => (
                <Chip
                  key={`meal-${item.minutes}`}
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
              OK repas
            </Button>
            <p className="goal-label">Biberon (quantité par repas)</p>
            <p className="muted">Optionnel — pour les repas au biberon uniquement.</p>
            <div className="row">
              <Chip label="Aucune" selected={bottleMl == null} onClick={() => void saveGoals({ bottleMl: null })} />
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
            <p className="goal-label">Couche</p>
            <div className="row">
              <Chip
                label="Après le repas"
                selected={diaperWhen === 'after'}
                onClick={() => void saveGoals({ diaperWhen: 'after' })}
              />
              <Chip
                label="Avant le repas"
                selected={diaperWhen === 'before'}
                onClick={() => void saveGoals({ diaperWhen: 'before' })}
              />
            </div>
            <p className="muted">
              Rappel X minutes avant ou après le dernier repas (tétée ou biberon, si Abel reste ouvert).
            </p>
            <div className="row">
              {DIAPER_MEAL_PRESETS.map((item) => (
                <Chip
                  key={`diap-${item.minutes}`}
                  label={item.label}
                  selected={diaperOffset === item.minutes}
                  onClick={() => void saveGoals({ diaperMinutes: item.minutes, diaperWhen })}
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
              <span className="muted">Repas</span>
              <strong>{formatMealGoal(delay)}</strong>
            </div>
            <div className="info-line">
              <span className="muted">Biberon</span>
              <strong>{formatBottleMlGoal(bottleMl)}</strong>
            </div>
            <div className="info-line">
              <span className="muted">Couche</span>
              <strong>{formatDiaperGoal(diaperWhen, diaperOffset)}</strong>
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
          <span className="muted">Repas</span>
          <span>
            {mealAlert}
            {bottleMlAlert ? (
              <>
                <br />
                <span className="muted">{bottleMlAlert}</span>
              </>
            ) : null}
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
