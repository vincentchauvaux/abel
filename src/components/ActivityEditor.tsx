import { useEffect, useState } from 'react';

import { Button, Chip, Field } from '@/components/ui';
import {
  deleteBottle,
  deleteDiaper,
  deleteFeeding,
  deleteMeasurement,
  deleteNote,
  deletePumping,
  deleteSleep,
  deleteSolidFood,
  deleteSupplement,
  deleteTemperature,
  listSessionSides,
  setFeedingSide,
  updateBottle,
  updateDiaper,
  updateFeedingSession,
  updateMeasurement,
  updateNote,
  updatePumping,
  updateSleep,
  updateSolidFood,
  updateSupplement,
  updateTemperature,
} from '@/db/api';
import { db } from '@/db/client';
import type { Side } from '@/db/types';
import type { ActivityItem } from '@/lib/activity';
import {
  addMinutesIso,
  elapsedMs,
  formatDateTime,
  fromDatetimeLocalValue,
  parseDecimal,
  toDatetimeLocalValue,
} from '@/lib/dates';
import { diaperLabel, milkLabel, sideLabel } from '@/lib/labels';

type Props = {
  item: ActivityItem;
  onClose: () => void;
};

type FeedStatus = 'noted' | 'open' | 'done';
type SleepStatus = 'open' | 'done';

export function ActivityEditor({ item, onClose }: Props) {
  const [when, setWhen] = useState(toDatetimeLocalValue(item.at));
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const [kind, setKind] = useState('');
  const [side, setSide] = useState<Side>('LEFT');
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('noted');
  const [feedMinutes, setFeedMinutes] = useState('');
  const [sleepStatus, setSleepStatus] = useState<SleepStatus>('done');
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [pumpDuration, setPumpDuration] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (item.kind === 'bottle') {
        const row = await db.bottleFeeds.get(item.id);
        if (!cancelled && row) {
          setAmount(String(row.amountMl));
          setKind(row.milkType);
          setWhen(toDatetimeLocalValue(row.fedAt));
        }
      } else if (item.kind === 'diaper') {
        const row = await db.diaperEvents.get(item.id);
        if (!cancelled && row) {
          setKind(row.kind);
          setWhen(toDatetimeLocalValue(row.occurredAt));
        }
      } else if (item.kind === 'pumping') {
        const row = await db.pumpingSessions.get(item.id);
        if (!cancelled && row) {
          setAmount(row.amountMl != null ? String(row.amountMl) : '');
          setWhen(toDatetimeLocalValue(row.startedAt));
          if (row.side) setSide(row.side);
          if (row.durationMinutes != null) setPumpDuration(String(row.durationMinutes));
        }
      } else if (item.kind === 'feeding') {
        const row = await db.feedingSessions.get(item.id);
        const sides = await listSessionSides(item.id);
        if (!cancelled && row) {
          setWhen(toDatetimeLocalValue(row.startedAt));
          if (sides.length) setSide(sides[sides.length - 1]);
          if (!row.endedAt) {
            setFeedStatus('open');
            const mins = Math.max(1, Math.round(elapsedMs(row.startedAt, null) / 60_000));
            setFeedMinutes(String(mins));
          } else if (row.endedAt === row.startedAt || elapsedMs(row.startedAt, row.endedAt) < 15_000) {
            setFeedStatus('noted');
            setFeedMinutes('');
          } else {
            setFeedStatus('done');
            setFeedMinutes(String(Math.max(1, Math.round(elapsedMs(row.startedAt, row.endedAt) / 60_000))));
          }
        }
      } else if (item.kind === 'solid') {
        const row = await db.solidFoods.get(item.id);
        if (!cancelled && row) {
          setText(row.food);
          setWhen(toDatetimeLocalValue(row.eatenAt));
        }
      } else if (item.kind === 'supplement') {
        const row = await db.supplements.get(item.id);
        if (!cancelled && row) {
          setText(row.name);
          setWhen(toDatetimeLocalValue(row.givenAt));
        }
      } else if (item.kind === 'sleep') {
        const row = await db.sleepSessions.get(item.id);
        if (!cancelled && row) {
          setWhen(toDatetimeLocalValue(row.startedAt));
          if (!row.endedAt) {
            setSleepStatus('open');
            setSleepMinutes(String(Math.max(1, Math.round(elapsedMs(row.startedAt, null) / 60_000))));
          } else {
            setSleepStatus('done');
            setSleepMinutes(
              String(Math.max(1, Math.round(elapsedMs(row.startedAt, row.endedAt) / 60_000))),
            );
          }
        }
      } else if (item.kind === 'temperature') {
        const row = await db.temperatures.get(item.id);
        if (!cancelled && row) {
          setAmount(String(row.celsius));
          setWhen(toDatetimeLocalValue(row.measuredAt));
        }
      } else if (item.kind === 'note') {
        const row = await db.notes.get(item.id);
        if (!cancelled && row) {
          setText(row.body);
          setWhen(toDatetimeLocalValue(row.notedAt));
        }
      } else if (item.kind === 'measurement') {
        const row = await db.measurements.get(item.id);
        if (!cancelled && row) {
          setAmount(String(row.value));
          setWhen(toDatetimeLocalValue(row.measuredAt));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item]);

  const save = async () => {
    setError('');
    const at = fromDatetimeLocalValue(when);
    try {
      if (item.kind === 'bottle') {
        const ml = parseDecimal(amount);
        if (ml === null || ml <= 0) {
          setError('Quantité invalide.');
          return;
        }
        await updateBottle(item.id, {
          amountMl: Math.round(ml),
          fedAt: at,
          milkType: kind === 'BREAST_MILK' || kind === 'FORMULA' ? kind : undefined,
        });
      } else if (item.kind === 'diaper') {
        if (kind !== 'PEE' && kind !== 'POO' && kind !== 'BOTH') return;
        await updateDiaper(item.id, kind, at);
      } else if (item.kind === 'pumping') {
        const ml = parseDecimal(amount);
        if (ml === null || ml <= 0) {
          setError('Quantité invalide.');
          return;
        }
        const pumpMins = pumpDuration.trim() ? parseDecimal(pumpDuration) : null;
        if (pumpDuration.trim() && (pumpMins === null || pumpMins <= 0)) {
          setError('Durée invalide.');
          return;
        }
        await updatePumping(item.id, {
          amountMl: Math.round(ml),
          startedAt: at,
          side,
          durationMinutes: pumpMins === null ? null : Math.round(pumpMins),
        });
      } else if (item.kind === 'feeding') {
        let endedAt: string | null;
        if (feedStatus === 'open') {
          const session = await db.feedingSessions.get(item.id);
          if (session) {
            const otherOpen = (await db.feedingSessions.where('babyId').equals(session.babyId).toArray()).find(
              (row) => row.id !== item.id && !row.deletedAt && !row.endedAt,
            );
            if (otherOpen) {
              setError('Une autre tétée est déjà en minuteur. Termine-la d’abord.');
              return;
            }
          }
          endedAt = null;
        } else if (feedStatus === 'noted') {
          endedAt = at;
        } else {
          const mins = parseDecimal(feedMinutes);
          if (mins === null || mins <= 0) {
            setError('Indique la durée en minutes.');
            return;
          }
          endedAt = addMinutesIso(at, Math.round(mins));
        }
        await updateFeedingSession(item.id, { startedAt: at, endedAt });
        await setFeedingSide(item.id, side);
      } else if (item.kind === 'solid') {
        await updateSolidFood(item.id, { food: text, eatenAt: at });
      } else if (item.kind === 'supplement') {
        await updateSupplement(item.id, { name: text, givenAt: at });
      } else if (item.kind === 'sleep') {
        if (sleepStatus === 'open') {
          const session = await db.sleepSessions.get(item.id);
          if (session) {
            const otherOpen = (await db.sleepSessions.where('babyId').equals(session.babyId).toArray()).find(
              (row) => row.id !== item.id && !row.deletedAt && !row.endedAt,
            );
            if (otherOpen) {
              setError('Une autre sieste est déjà en cours. Termine-la d’abord.');
              return;
            }
          }
          await updateSleep(item.id, { startedAt: at, endedAt: null });
        } else {
          const mins = parseDecimal(sleepMinutes);
          if (mins === null || mins <= 0) {
            setError('Indique la durée en minutes.');
            return;
          }
          await updateSleep(item.id, {
            startedAt: at,
            endedAt: addMinutesIso(at, Math.round(mins)),
          });
        }
      } else if (item.kind === 'temperature') {
        const n = parseDecimal(amount);
        if (n === null) {
          setError('Température invalide.');
          return;
        }
        await updateTemperature(item.id, { celsius: n, measuredAt: at });
      } else if (item.kind === 'note') {
        await updateNote(item.id, { body: text, notedAt: at });
      } else if (item.kind === 'measurement') {
        const n = parseDecimal(amount);
        if (n === null) {
          setError('Valeur invalide.');
          return;
        }
        await updateMeasurement(item.id, { value: n, measuredAt: at });
      }
      onClose();
    } catch {
      setError('Modification impossible (stock insuffisant ?).');
    }
  };

  const remove = async () => {
    if (!window.confirm('Supprimer cette entrée ?')) return;
    if (item.kind === 'bottle') await deleteBottle(item.id);
    else if (item.kind === 'diaper') await deleteDiaper(item.id);
    else if (item.kind === 'pumping') await deletePumping(item.id);
    else if (item.kind === 'feeding') await deleteFeeding(item.id);
    else if (item.kind === 'solid') await deleteSolidFood(item.id);
    else if (item.kind === 'supplement') await deleteSupplement(item.id);
    else if (item.kind === 'sleep') await deleteSleep(item.id);
    else if (item.kind === 'temperature') await deleteTemperature(item.id);
    else if (item.kind === 'note') await deleteNote(item.id);
    else if (item.kind === 'measurement') await deleteMeasurement(item.id);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>
          {item.title} · {formatDateTime(item.at)}
        </h2>
        <label className="field">
          <span>
            {item.kind === 'sleep' || item.kind === 'feeding' ? 'Début' : 'Date et heure'}
          </span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>

        {item.kind === 'sleep' ? (
          <>
            <p className="goal-label">État</p>
            <div className="row">
              <Chip
                label="En cours"
                selected={sleepStatus === 'open'}
                onClick={() => {
                  setSleepStatus('open');
                  if (!sleepMinutes.trim()) setSleepMinutes('1');
                }}
              />
              <Chip
                label="Terminée"
                selected={sleepStatus === 'done'}
                onClick={() => {
                  setSleepStatus('done');
                  if (!sleepMinutes.trim()) setSleepMinutes('60');
                }}
              />
            </div>
            {sleepStatus === 'done' ? (
              <Field
                label="Durée (min)"
                value={sleepMinutes}
                onChange={setSleepMinutes}
                placeholder="90"
                inputMode="decimal"
              />
            ) : (
              <p className="muted">Sommeil en cours — tu peux aussi le terminer depuis Outils ou le Dashboard.</p>
            )}
          </>
        ) : null}

        {item.kind === 'feeding' ? (
          <>
            <p className="goal-label">Sein</p>
            <div className="row">
              {(['LEFT', 'RIGHT', 'BOTH'] as const).map((s) => (
                <Chip key={s} label={sideLabel[s]} selected={side === s} onClick={() => setSide(s)} />
              ))}
            </div>
            <p className="goal-label">État</p>
            <div className="row">
              <Chip
                label="Notée"
                selected={feedStatus === 'noted'}
                onClick={() => {
                  setFeedStatus('noted');
                  setFeedMinutes('');
                }}
              />
              <Chip
                label="Minuteur"
                selected={feedStatus === 'open'}
                onClick={() => {
                  setFeedStatus('open');
                  if (!feedMinutes.trim()) setFeedMinutes('1');
                }}
              />
              <Chip
                label="Terminée"
                selected={feedStatus === 'done'}
                onClick={() => {
                  setFeedStatus('done');
                  if (!feedMinutes.trim()) setFeedMinutes('10');
                }}
              />
            </div>
            {feedStatus === 'done' ? (
              <Field
                label="Durée (min)"
                value={feedMinutes}
                onChange={setFeedMinutes}
                placeholder="15"
                inputMode="decimal"
              />
            ) : null}
            {feedStatus === 'open' ? (
              <p className="muted">Le minuteur continue sur Allaitement. Tu pourras terminer là-bas ou saisir une durée ici en passant en Terminée.</p>
            ) : (
              <p className="muted">Changer le sein remplace les côtés de cette tétée.</p>
            )}
          </>
        ) : null}

        {item.kind === 'pumping' ? (
          <>
            <p className="goal-label">Côté</p>
            <div className="row">
              {(['LEFT', 'RIGHT', 'BOTH'] as const).map((s) => (
                <Chip key={s} label={sideLabel[s]} selected={side === s} onClick={() => setSide(s)} />
              ))}
            </div>
            <Field
              label="Durée (min, facultatif)"
              value={pumpDuration}
              onChange={setPumpDuration}
              placeholder="15"
              inputMode="decimal"
            />
          </>
        ) : null}

        {item.kind === 'bottle' ||
        item.kind === 'pumping' ||
        item.kind === 'temperature' ||
        item.kind === 'measurement' ? (
          <Field
            label={item.kind === 'temperature' ? '°C' : item.kind === 'measurement' ? 'Valeur' : 'Quantité (ml)'}
            value={amount}
            onChange={setAmount}
          />
        ) : null}
        {item.kind === 'bottle' ? (
          <div className="row">
            {(['FORMULA', 'BREAST_MILK'] as const).map((m) => (
              <Chip key={m} label={milkLabel[m]} selected={kind === m} onClick={() => setKind(m)} />
            ))}
          </div>
        ) : null}
        {item.kind === 'diaper' ? (
          <div className="row">
            {(['PEE', 'POO', 'BOTH'] as const).map((k) => (
              <Chip key={k} label={diaperLabel[k]} selected={kind === k} onClick={() => setKind(k)} />
            ))}
          </div>
        ) : null}
        {item.kind === 'solid' || item.kind === 'supplement' || item.kind === 'note' ? (
          <Field
            label={item.kind === 'note' ? 'Texte' : 'Libellé'}
            value={text}
            onChange={setText}
            inputMode="text"
            multiline={item.kind === 'note'}
          />
        ) : null}
        {error ? <p className="muted">{error}</p> : null}
        <Button onClick={() => void save()}>Enregistrer</Button>
        <Button tone="danger" onClick={() => void remove()}>
          Supprimer
        </Button>
        <Button tone="muted" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}
