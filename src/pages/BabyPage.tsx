import { useEffect, useMemo, useRef, useState } from 'react';

import { AccordionSection } from '@/components/Accordion';
import { ActivityEditor } from '@/components/ActivityEditor';
import { BabyPhoto } from '@/components/BabyPhoto';
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
import { formatAge, formatDateTime, formatLongDate, parseDecimal, startOfLocalDay } from '@/lib/dates';
import {
  DIAPER_MEAL_PRESETS,
  formatBottleMlGoal,
  formatDiaperGoal,
  formatMealGoal,
  INTERVAL_PRESETS,
  ML_PRESETS,
  type DiaperWhen,
} from '@/lib/goals';
import { fetchDailyHoroscope } from '@/lib/horoscope-api';
import { HOROSCOPE_DISCLAIMER, horoscopeFor } from '@/lib/horoscope';
import {
  bottleMlAlertLine,
  diaperAlertLine,
  lastMealAt,
  mealAlertLine,
  notifyDiaperFromGoals,
  sleepAlertLine,
} from '@/lib/reminders';

export function BabyPage() {
  const { baby, tick } = useDb();
  const [name, setName] = useState(baby?.name ?? '');
  const [bornOn, setBornOn] = useState(baby?.bornOn ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(baby?.photoUrl ?? null);
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
  const [openSection, setOpenSection] = useState<string | null>(null);
  const guidedRef = useRef(false);
  const now = useNow(true, 30_000);

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (baby?.name) setName(baby.name);
    setBornOn(baby?.bornOn ?? '');
    setPhotoUrl(baby?.photoUrl ?? null);
  }, [baby?.name, baby?.bornOn, baby?.photoUrl]);

  useEffect(() => {
    if (!baby) return;
    setEditIdentity(!(baby.bornOn && baby.name));
  }, [baby?.bornOn, baby?.name]);

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
      setEditGoals(!configured);
      if (!guidedRef.current) {
        if (!(baby.bornOn && baby.name)) setOpenSection('identity');
        else if (!configured) setOpenSection('goals');
        guidedRef.current = true;
      }
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

  const diaperAlert = useMemo(
    () =>
      diaperAlertLine({
        lastDiaper,
        mealAt,
        mealIntervalMinutes: delay,
        diaperWhen,
        diaperOffset,
        now,
      }),
    [lastDiaper, diaperOffset, diaperWhen, mealAt, delay, now],
  );

  const saveIdentity = () => {
    if (!baby) return;
    updateBaby(baby.id, { name, bornOn: bornOn || null, photoUrl });
    if (name.trim() && bornOn) setEditIdentity(false);
  };

  const onPhotoChange = (url: string | null) => {
    setPhotoUrl(url);
    if (!baby) return;
    void updateBaby(baby.id, { photoUrl: url });
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
      <AccordionSection
        id="identity"
        title="Identité"
        open={openSection === 'identity'}
        onToggle={toggleSection}
        action={
          !editIdentity ? (
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setOpenSection('identity');
                setEditIdentity(true);
              }}>
              Modifier
            </button>
          ) : null
        }>
        {editIdentity ? (
          <>
            <BabyPhoto photoUrl={photoUrl} editable onChange={onPhotoChange} />
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
            <BabyPhoto photoUrl={photoUrl} editable={false} onChange={() => {}} />
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
      </AccordionSection>
      <AccordionSection
        id="goals"
        title="Objectifs"
        open={openSection === 'goals'}
        onToggle={toggleSection}
        action={
          !editGoals && goalsReady ? (
            <button
              type="button"
              className="linkish"
              onClick={() => {
                setOpenSection('goals');
                setEditGoals(true);
              }}>
              Modifier
            </button>
          ) : null
        }>
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
      </AccordionSection>
      <AccordionSection
        id="horoscope"
        title="Petit horoscope"
        open={openSection === 'horoscope'}
        onToggle={toggleSection}>
        {horoscope ? (
          <>
            <p className="zodiac">
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
          </>
        ) : (
          <p className="muted">Ajoute la date de naissance pour afficher le signe, les lectures et l’horoscope du jour.</p>
        )}
      </AccordionSection>
      <AccordionSection id="alerts" title="Alertes" open={openSection === 'alerts'} onToggle={toggleSection}>
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
          <span>{sleepAlertLine(activeSleep, now)}</span>
        </div>
        <div className="alert-line">
          <span className="muted">Couche</span>
          <span>{diaperAlert}</span>
        </div>
      </AccordionSection>
      <div className="entry-above-journal">
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
      </div>
      <AccordionSection id="journal" title="Journal" open={openSection === 'journal'} onToggle={toggleSection}>
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
      </AccordionSection>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
