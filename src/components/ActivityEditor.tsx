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
  addMinutesToLocal,
  elapsedMs,
  endLocalFromStartAndTime,
  formatDateTime,
  fromDatetimeLocalValue,
  joinDatetimeLocal,
  minutesBetweenLocal,
  parseDecimal,
  splitDatetimeLocal,
  toDatetimeLocalValue,
} from '@/lib/dates';
import { diaperLabel, feedingSidesLabel, milkLabel, sideLabel } from '@/lib/labels';

type Props = {
  item: ActivityItem;
  onClose: () => void;
};

type FeedStatus = 'noted' | 'open' | 'done';
type SleepStatus = 'open' | 'done';

export function ActivityEditor({ item, onClose }: Props) {
  const [when, setWhen] = useState(toDatetimeLocalValue(item.at));
  const [endedWhen, setEndedWhen] = useState('');
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const [kind, setKind] = useState('');
  const [side, setSide] = useState<Side>('LEFT');
  const [feedKeepBoth, setFeedKeepBoth] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('noted');
  const [feedMinutes, setFeedMinutes] = useState('');
  const [sleepStatus, setSleepStatus] = useState<SleepStatus>('done');
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [pumpDuration, setPumpDuration] = useState('');
  const [noteTodo, setNoteTodo] = useState(false);
  const [noteDone, setNoteDone] = useState(false);
  const [error, setError] = useState('');

  const timed = item.kind === 'feeding' || item.kind === 'sleep' || item.kind === 'pumping';
  const showEnd =
    (item.kind === 'feeding' && feedStatus === 'done') ||
    (item.kind === 'sleep' && sleepStatus === 'done') ||
    item.kind === 'pumping';
  const { date: startDate, time: startTime } = splitDatetimeLocal(when);
  const { date: endDate, time: endTime } = splitDatetimeLocal(endedWhen);
  const endNextDay = Boolean(startDate && endDate && endDate > startDate);

  const applyRangeToDuration = (startLocal: string, endLocal: string, setMins: (value: string) => void) => {
    const mins = minutesBetweenLocal(startLocal, endLocal);
    if (mins == null) return;
    setMins(mins < 0 ? '' : String(mins));
  };

  const syncDurationFromRange = (startLocal: string, endLocal: string) => {
    if (!endLocal.trim()) return;
    if (item.kind === 'feeding' && feedStatus === 'done') applyRangeToDuration(startLocal, endLocal, setFeedMinutes);
    else if (item.kind === 'sleep' && sleepStatus === 'done') applyRangeToDuration(startLocal, endLocal, setSleepMinutes);
    else if (item.kind === 'pumping') applyRangeToDuration(startLocal, endLocal, setPumpDuration);
  };

  const applyDurationToEnd = (minutesText: string) => {
    const mins = parseDecimal(minutesText);
    if (mins == null || mins < 0 || !when) return;
    setEndedWhen(addMinutesToLocal(when, Math.round(mins)));
  };

  const handleDateChange = (nextDate: string) => {
    const nextWhen = joinDatetimeLocal(nextDate, startTime);
    const mins = endedWhen ? minutesBetweenLocal(when, endedWhen) : null;
    setWhen(nextWhen);
    if (mins != null && mins >= 0) setEndedWhen(addMinutesToLocal(nextWhen, mins));
  };

  const handleStartTimeChange = (nextTime: string) => {
    const nextWhen = joinDatetimeLocal(startDate, nextTime);
    setWhen(nextWhen);
    syncDurationFromRange(nextWhen, endedWhen);
  };

  const handleEndTimeChange = (nextTime: string) => {
    if (!nextTime.trim()) {
      setEndedWhen('');
      return;
    }
    const nextEnd = endLocalFromStartAndTime(when, nextTime);
    setEndedWhen(nextEnd);
    syncDurationFromRange(when, nextEnd);
  };

  const handleDurationChange = (next: string, target: 'feeding' | 'sleep' | 'pumping') => {
    if (target === 'feeding') setFeedMinutes(next);
    else if (target === 'sleep') setSleepMinutes(next);
    else setPumpDuration(next);
    applyDurationToEnd(next);
  };

  const endedAtFromForm = (startIso: string): string | { error: string } => {
    if (endedWhen.trim()) {
      const end = fromDatetimeLocalValue(endedWhen);
      if (new Date(end).getTime() <= new Date(startIso).getTime()) {
        return { error: 'La fin doit être après le début.' };
      }
      return end;
    }
    const mins = parseDecimal(
      item.kind === 'sleep' ? sleepMinutes : item.kind === 'pumping' ? pumpDuration : feedMinutes,
    );
    if (mins === null || mins <= 0) {
      return { error: 'Indique l’heure de fin ou la durée en minutes.' };
    }
    return addMinutesIso(startIso, Math.round(mins));
  };

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
          if (row.durationMinutes != null) {
            setPumpDuration(String(row.durationMinutes));
            setEndedWhen(addMinutesToLocal(toDatetimeLocalValue(row.startedAt), row.durationMinutes));
          } else {
            setPumpDuration('');
            setEndedWhen('');
          }
        }
      } else if (item.kind === 'feeding') {
        const row = await db.feedingSessions.get(item.id);
        const sides = await listSessionSides(item.id);
        if (!cancelled && row) {
          setWhen(toDatetimeLocalValue(row.startedAt));
          const bothBreasts = feedingSidesLabel(sides) === sideLabel.BOTH;
          setFeedKeepBoth(bothBreasts);
          if (sides.length && !bothBreasts) setSide(sides[sides.length - 1]);
          if (!row.endedAt) {
            setFeedStatus('open');
            const mins = Math.max(1, Math.round(elapsedMs(row.startedAt, null) / 60_000));
            setFeedMinutes(String(mins));
            setEndedWhen('');
          } else if (row.endedAt === row.startedAt || elapsedMs(row.startedAt, row.endedAt) < 15_000) {
            setFeedStatus('noted');
            setFeedMinutes('');
            setEndedWhen('');
          } else {
            setFeedStatus('done');
            setFeedMinutes(String(Math.max(1, Math.round(elapsedMs(row.startedAt, row.endedAt) / 60_000))));
            setEndedWhen(toDatetimeLocalValue(row.endedAt));
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
            setEndedWhen('');
          } else {
            setSleepStatus('done');
            setSleepMinutes(
              String(Math.max(1, Math.round(elapsedMs(row.startedAt, row.endedAt) / 60_000))),
            );
            setEndedWhen(toDatetimeLocalValue(row.endedAt));
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
          setNoteTodo(row.isTodo);
          setNoteDone(!!row.doneAt);
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
        let pumpMins = pumpDuration.trim() ? parseDecimal(pumpDuration) : null;
        if (endedWhen.trim()) {
          const computed = minutesBetweenLocal(when, endedWhen);
          if (computed != null && computed < 0) {
            setError('La fin doit être après le début.');
            return;
          }
          if (!pumpDuration.trim() && computed != null && computed > 0) pumpMins = computed;
        }
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
          const end = endedAtFromForm(at);
          if (typeof end === 'object') {
            setError(end.error);
            return;
          }
          endedAt = end;
        }
        await updateFeedingSession(item.id, { startedAt: at, endedAt });
        if (!feedKeepBoth) await setFeedingSide(item.id, side);
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
          const end = endedAtFromForm(at);
          if (typeof end === 'object') {
            setError(end.error);
            return;
          }
          await updateSleep(item.id, { startedAt: at, endedAt: end });
        }
      } else if (item.kind === 'temperature') {
        const n = parseDecimal(amount);
        if (n === null) {
          setError('Température invalide.');
          return;
        }
        await updateTemperature(item.id, { celsius: n, measuredAt: at });
      } else if (item.kind === 'note') {
        const existing = await db.notes.get(item.id);
        let doneAt: string | null = null;
        if (noteTodo && noteDone) {
          doneAt = existing?.doneAt ?? new Date().toISOString();
        }
        await updateNote(item.id, { body: text, notedAt: at, isTodo: noteTodo, doneAt });
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
        {timed ? (
          <>
            <label className="field">
              <span>Date</span>
              <input type="date" value={startDate} onChange={(e) => handleDateChange(e.target.value)} />
            </label>
            {showEnd ? (
              <div className="grid-2">
                <label className="field">
                  <span>Début</span>
                  <input type="time" value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)} />
                </label>
                <label className="field">
                  <span>{item.kind === 'pumping' ? 'Fin (facultatif)' : 'Fin'}</span>
                  <input type="time" value={endTime} onChange={(e) => handleEndTimeChange(e.target.value)} />
                </label>
              </div>
            ) : (
              <label className="field">
                <span>Début</span>
                <input type="time" value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)} />
              </label>
            )}
            {endNextDay ? <p className="muted">Fin le lendemain.</p> : null}
          </>
        ) : (
          <label className="field">
            <span>Date et heure</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
        )}
        {item.kind === 'feeding' && feedStatus === 'done' ? (
          <Field
            label="Durée (min)"
            value={feedMinutes}
            onChange={(value) => handleDurationChange(value, 'feeding')}
            placeholder="15"
            inputMode="decimal"
          />
        ) : null}
        {item.kind === 'sleep' && sleepStatus === 'done' ? (
          <Field
            label="Durée (min)"
            value={sleepMinutes}
            onChange={(value) => handleDurationChange(value, 'sleep')}
            placeholder="90"
            inputMode="decimal"
          />
        ) : null}
        {item.kind === 'pumping' ? (
          <Field
            label="Durée (min, facultatif)"
            value={pumpDuration}
            onChange={(value) => handleDurationChange(value, 'pumping')}
            placeholder="15"
            inputMode="decimal"
          />
        ) : null}

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
                  setEndedWhen('');
                }}
              />
              <Chip
                label="Terminée"
                selected={sleepStatus === 'done'}
                onClick={() => {
                  setSleepStatus('done');
                  const mins = parseDecimal(sleepMinutes);
                  const nextMins = mins != null && mins > 0 ? Math.round(mins) : 60;
                  setSleepMinutes(String(nextMins));
                  setEndedWhen((prev) => prev || addMinutesToLocal(when, nextMins));
                }}
              />
            </div>
            {sleepStatus === 'done' ? null : (
              <p className="muted">Sommeil en cours — tu peux aussi le terminer depuis Outils ou le Dashboard.</p>
            )}
          </>
        ) : null}

        {item.kind === 'feeding' ? (
          <>
            <p className="goal-label">Sein</p>
            <div className="row">
              {(['LEFT', 'RIGHT'] as const).map((s) => (
                <Chip
                  key={s}
                  label={sideLabel[s]}
                  selected={!feedKeepBoth && side === s}
                  onClick={() => {
                    setFeedKeepBoth(false);
                    setSide(s);
                  }}
                />
              ))}
            </div>
            {feedKeepBoth ? (
              <p className="muted">Les deux seins pendant cette séance (durée totale). Choisir un seul côté remplace le détail.</p>
            ) : null}
            <p className="goal-label">État</p>
            <div className="row">
              <Chip
                label="Notée"
                selected={feedStatus === 'noted'}
                onClick={() => {
                  setFeedStatus('noted');
                  setFeedMinutes('');
                  setEndedWhen('');
                }}
              />
              <Chip
                label="Minuteur"
                selected={feedStatus === 'open'}
                onClick={() => {
                  setFeedStatus('open');
                  if (!feedMinutes.trim()) setFeedMinutes('1');
                  setEndedWhen('');
                }}
              />
              <Chip
                label="Terminée"
                selected={feedStatus === 'done'}
                onClick={() => {
                  setFeedStatus('done');
                  const mins = parseDecimal(feedMinutes);
                  const nextMins = mins != null && mins > 0 ? Math.round(mins) : 10;
                  setFeedMinutes(String(nextMins));
                  setEndedWhen((prev) => prev || addMinutesToLocal(when, nextMins));
                }}
              />
            </div>
            {feedStatus === 'open' ? (
              <p className="muted">Le minuteur continue sur Allaitement. Tu pourras terminer là-bas ou saisir une durée ici en passant en Terminée.</p>
            ) : feedKeepBoth ? null : (
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
          <>
            <Field
              label={item.kind === 'note' ? 'Texte' : 'Libellé'}
              value={text}
              onChange={setText}
              inputMode="text"
              multiline={item.kind === 'note'}
            />
            {item.kind === 'note' ? (
              <>
                <label className="check-inline">
                  <input
                    type="checkbox"
                    checked={noteTodo}
                    onChange={(e) => {
                      setNoteTodo(e.target.checked);
                      if (!e.target.checked) setNoteDone(false);
                    }}
                  />
                  À faire sur le dashboard
                </label>
                {noteTodo ? (
                  <label className="check-inline">
                    <input
                      type="checkbox"
                      checked={noteDone}
                      onChange={(e) => setNoteDone(e.target.checked)}
                    />
                    Fait (masquée du dashboard)
                  </label>
                ) : null}
              </>
            ) : null}
          </>
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
