import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Chip, Field } from '@/components/ui';
import {
  addBottle,
  addDiaper,
  addMeasurementAt,
  addNote,
  addPumping,
  addSleep,
  addSolidFood,
  addSupplement,
  addTemperature,
  getReminder,
  listMilkStock,
  logFeedingNow,
  startFeeding,
  startSleep,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { DiaperKind, MeasurementType, MilkType, PumpingSession, Side } from '@/db/types';
import {
  addMinutesIso,
  addMinutesToLocal,
  endLocalFromStartAndTime,
  formatTime,
  fromDatetimeLocalValue,
  joinDatetimeLocal,
  minutesBetweenLocal,
  parseDecimal,
  splitDatetimeLocal,
  toDatetimeLocalValue,
} from '@/lib/dates';
import { diaperLabel, measurementLabel, milkLabel, sideLabel } from '@/lib/labels';
import { notifyDiaperFromGoals, notifyMealFromGoals } from '@/lib/reminders';
import { SegmentedControl } from '@/components/SegmentedControl';
import { readToolsSection, writeToolsSection, TOOL_SECTION_OPTIONS, type ToolsSection } from '@/lib/tools-section';

export type SmartEntryType =
  | 'feeding'
  | 'bottle'
  | 'diaper'
  | 'pumping'
  | 'solid'
  | 'supplement'
  | 'sleep'
  | 'temperature'
  | 'note'
  | 'measurement';

const APPORTS: { key: SmartEntryType; label: string }[] = [
  { key: 'feeding', label: 'Tétée' },
  { key: 'bottle', label: 'Biberon' },
  { key: 'solid', label: 'Diversif.' },
  { key: 'supplement', label: 'Complément' },
];

const SUIVI: { key: SmartEntryType; label: string }[] = [
  { key: 'diaper', label: 'Couche' },
  { key: 'pumping', label: 'Tire-lait' },
  { key: 'sleep', label: 'Sommeil' },
  { key: 'temperature', label: 'Température' },
  { key: 'measurement', label: 'Croissance' },
  { key: 'note', label: 'Note' },
];

type Props = {
  defaultType?: SmartEntryType;
  onSaved?: () => void;
};

export function SmartEntryForm({ defaultType = 'feeding', onSaved }: Props) {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [section, setSection] = useState<ToolsSection>(() => {
    if (SUIVI.some((t) => t.key === defaultType)) return 'suivi';
    return readToolsSection();
  });
  const [type, setType] = useState<SmartEntryType>(defaultType);
  const [when, setWhen] = useState(toDatetimeLocalValue());
  const [side, setSide] = useState<Side>('LEFT');
  const [milkType, setMilkType] = useState<MilkType>('FORMULA');
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const [celsius, setCelsius] = useState('');
  const [measureType, setMeasureType] = useState<MeasurementType>('WEIGHT');
  const [measureValue, setMeasureValue] = useState('');
  const [stock, setStock] = useState<PumpingSession[]>([]);
  const [stockId, setStockId] = useState<string | null>(null);
  const [goalMl, setGoalMl] = useState<number | null>(null);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof getReminder>>>();
  const [useTimer, setUseTimer] = useState(true);
  const [sleepStatus, setSleepStatus] = useState<'open' | 'done'>('done');
  const [sleepMinutes, setSleepMinutes] = useState('60');
  const [endedWhen, setEndedWhen] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const tools = section === 'apports' ? APPORTS : SUIVI;
  const { date: startDate, time: startTime } = splitDatetimeLocal(when);
  const { date: endDate, time: endTime } = splitDatetimeLocal(endedWhen);
  const endNextDay = Boolean(startDate && endDate && endDate > startDate);
  const showSleepEnd = type === 'sleep' && sleepStatus === 'done';

  useEffect(() => {
    const list = section === 'apports' ? APPORTS : SUIVI;
    if (!list.some((t) => t.key === type)) setType(list[0].key);
  }, [section, type]);

  useEffect(() => {
    if (type !== 'sleep') return;
    setSleepStatus('done');
    setSleepMinutes('60');
    setEndedWhen(addMinutesToLocal(when || toDatetimeLocalValue(), 60));
    // Ne réinitialise que lors du passage au type sommeil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (!baby) return;
    Promise.all([listMilkStock(baby.id), getReminder(baby.id)]).then(([available, goals]) => {
      setStock(available);
      setGoalMl(goals?.bottleMl ?? null);
      setGoals(goals);
    });
  }, [baby, tick]);

  const chooseSection = (next: ToolsSection) => {
    setSection(next);
    writeToolsSection(next);
    setError('');
    setOk('');
    setType((next === 'apports' ? APPORTS : SUIVI)[0].key);
  };

  const resetSoft = () => {
    setAmount('');
    setText('');
    setCelsius('');
    setMeasureValue('');
    setStockId(null);
    const nextWhen = toDatetimeLocalValue();
    setWhen(nextWhen);
    setSleepStatus('done');
    setSleepMinutes('60');
    setEndedWhen(addMinutesToLocal(nextWhen, 60));
    setError('');
  };

  const syncSleepDurationFromRange = (startLocal: string, endLocal: string) => {
    if (!endLocal.trim()) return;
    const mins = minutesBetweenLocal(startLocal, endLocal);
    if (mins == null) return;
    setSleepMinutes(mins < 0 ? '' : String(mins));
  };

  const handleSleepDateChange = (nextDate: string) => {
    const nextWhen = joinDatetimeLocal(nextDate, startTime);
    const mins = endedWhen ? minutesBetweenLocal(when, endedWhen) : null;
    setWhen(nextWhen);
    if (mins != null && mins >= 0) setEndedWhen(addMinutesToLocal(nextWhen, mins));
  };

  const handleSleepStartTimeChange = (nextTime: string) => {
    const nextWhen = joinDatetimeLocal(startDate, nextTime);
    setWhen(nextWhen);
    if (sleepStatus === 'done') syncSleepDurationFromRange(nextWhen, endedWhen);
  };

  const handleSleepEndTimeChange = (nextTime: string) => {
    if (!nextTime.trim()) {
      setEndedWhen('');
      return;
    }
    const nextEnd = endLocalFromStartAndTime(when, nextTime);
    setEndedWhen(nextEnd);
    syncSleepDurationFromRange(when, nextEnd);
  };

  const handleSleepDurationChange = (next: string) => {
    setSleepMinutes(next);
    const mins = parseDecimal(next);
    if (mins == null || mins < 0 || !when) return;
    setEndedWhen(addMinutesToLocal(when, Math.round(mins)));
  };

  const endedAtFromSleepForm = (startIso: string): string | { error: string } => {
    if (endedWhen.trim()) {
      const end = fromDatetimeLocalValue(endedWhen);
      if (new Date(end).getTime() <= new Date(startIso).getTime()) {
        return { error: 'La fin doit être après le début.' };
      }
      return end;
    }
    const mins = parseDecimal(sleepMinutes);
    if (mins === null || mins <= 0) {
      return { error: 'Indique l’heure de fin ou la durée en minutes.' };
    }
    return addMinutesIso(startIso, Math.round(mins));
  };

  const atIso = () => fromDatetimeLocalValue(when || toDatetimeLocalValue());

  const finish = async (message: string) => {
    setOk(message);
    resetSoft();
    onSaved?.();
    window.setTimeout(() => setOk(''), 2500);
  };

  const saveFeeding = async (chosen: Side) => {
    if (!baby) return;
    if (useTimer) {
      await startFeeding(baby.id, chosen);
      onSaved?.();
      navigate('/');
      return;
    }
    const at = atIso();
    await logFeedingNow(baby.id, chosen, at);
    await notifyMealFromGoals(goals, at);
    await notifyDiaperFromGoals(goals, at);
    await finish(`Tétée ${sideLabel[chosen].toLowerCase()} notée`);
  };

  const saveDiaper = async (chosen: DiaperKind) => {
    if (!baby) return;
    await addDiaper(baby.id, chosen, atIso());
    await finish(`Couche ${diaperLabel[chosen].toLowerCase()} notée`);
  };

  const save = async () => {
    if (!baby) return;
    setError('');
    const at = atIso();
    try {
      if (type === 'feeding') {
        await saveFeeding(side);
        return;
      }
      if (type === 'bottle') {
        const ml = parseDecimal(amount);
        if (ml === null || ml <= 0) {
          setError('Indique une quantité en ml.');
          return;
        }
        const qty = Math.round(ml);
        const selected = stock.find((row) => row.id === stockId);
        if (stockId && selected && qty > (selected.remainingMl ?? 0)) {
          setError('Stock insuffisant.');
          return;
        }
        await addBottle(baby.id, milkType, qty, at, milkType === 'BREAST_MILK' ? stockId : null);
        await notifyMealFromGoals(goals, at);
        await notifyDiaperFromGoals(goals, at);
        await finish(`Biberon ${qty} ml noté`);
        return;
      }
      if (type === 'pumping') {
        const ml = parseDecimal(amount);
        if (ml === null || ml <= 0) {
          setError('Indique une quantité en ml.');
          return;
        }
        await addPumping(baby.id, { amountMl: Math.round(ml), startedAt: at, side });
        await finish(`Tirage ${Math.round(ml)} ml en stock`);
        return;
      }
      if (type === 'solid') {
        if (!text.trim()) {
          setError('Indique l’aliment.');
          return;
        }
        await addSolidFood(baby.id, text, at);
        await finish('Diversification notée');
        return;
      }
      if (type === 'supplement') {
        if (!text.trim()) {
          setError('Indique le complément.');
          return;
        }
        await addSupplement(baby.id, text, at);
        await finish('Complément noté');
        return;
      }
      if (type === 'sleep') {
        if (sleepStatus === 'open') {
          await startSleep(baby.id, at);
          onSaved?.();
          navigate('/');
          return;
        }
        const ended = endedAtFromSleepForm(at);
        if (typeof ended === 'object') {
          setError(ended.error);
          return;
        }
        await addSleep(baby.id, at, ended);
        await finish('Sieste notée');
        return;
      }
      if (type === 'temperature') {
        const n = parseDecimal(celsius);
        if (n === null) {
          setError('Indique la température.');
          return;
        }
        await addTemperature(baby.id, n, at);
        await finish(`Température ${String(n).replace('.', ',')} °C`);
        return;
      }
      if (type === 'note') {
        if (!text.trim()) {
          setError('Écris une note.');
          return;
        }
        await addNote(baby.id, text, at);
        await finish('Note enregistrée');
        return;
      }
      if (type === 'measurement') {
        const n = parseDecimal(measureValue);
        if (n === null || n <= 0) {
          setError('Indique une valeur.');
          return;
        }
        await addMeasurementAt(baby.id, measureType, n, at);
        await finish(`${measurementLabel[measureType]} noté`);
      }
    } catch {
      setError('Enregistrement impossible.');
    }
  };

  return (
    <div className="smart-entry">
      <SegmentedControl
        size="lg"
        value={section}
        onChange={chooseSection}
        options={TOOL_SECTION_OPTIONS}
        ariaLabel="Section d’outils"
      />
      <p className="muted">{section === 'apports' ? 'Ce que l’on donne' : 'Ce que l’on observe'}</p>
      <div className="row">
        {tools.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            selected={type === item.key}
            onClick={() => {
              setType(item.key);
              setError('');
              setOk('');
            }}
          />
        ))}
      </div>

      {type !== 'sleep' && (type !== 'feeding' || !useTimer) ? (
        <label className="field">
          <span>Date et heure</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
      ) : null}

      {type === 'sleep' ? (
        <>
          <label className="field">
            <span>Date</span>
            <input type="date" value={startDate} onChange={(e) => handleSleepDateChange(e.target.value)} />
          </label>
          {showSleepEnd ? (
            <div className="grid-2">
              <label className="field">
                <span>Début</span>
                <input type="time" value={startTime} onChange={(e) => handleSleepStartTimeChange(e.target.value)} />
              </label>
              <label className="field">
                <span>Fin</span>
                <input type="time" value={endTime} onChange={(e) => handleSleepEndTimeChange(e.target.value)} />
              </label>
            </div>
          ) : (
            <label className="field">
              <span>Début</span>
              <input type="time" value={startTime} onChange={(e) => handleSleepStartTimeChange(e.target.value)} />
            </label>
          )}
          {endNextDay ? <p className="muted">Fin le lendemain.</p> : null}
          {showSleepEnd ? (
            <Field
              label="Durée (min)"
              value={sleepMinutes}
              onChange={handleSleepDurationChange}
              placeholder="90"
              inputMode="decimal"
            />
          ) : null}
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
          {sleepStatus === 'done' ? (
            <p className="muted">Indique l’heure de fin ou la durée — changer l’une recalcule l’autre.</p>
          ) : (
            <p className="muted">Démarre une sieste à l’heure choisie (à terminer depuis Outils ou le Dashboard).</p>
          )}
        </>
      ) : null}

      {type === 'feeding' ? (
        <>
          <div className="card-head">
            <p className="goal-label" style={{ margin: 0 }}>
              Noter une tétée
            </p>
            <label className="check-inline">
              <input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} />
              Minuteur
            </label>
          </div>
          <p className="muted">
            {useTimer
              ? 'Un appui démarre le minuteur sur ce sein et ouvre Allaitement. Tu pourras passer à l’autre pendant la séance.'
              : 'Un appui = tétée notée (sans ml).'}
          </p>
          <div className="row">
            {(['LEFT', 'RIGHT'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => void saveFeeding(s)}>
                {sideLabel[s]}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {type === 'diaper' ? (
        <>
          <p className="muted">Un appui = couche notée tout de suite.</p>
          <div className="grid-2">
            <button type="button" className="big pee" onClick={() => void saveDiaper('PEE')}>
              Pipi
            </button>
            <button type="button" className="big poo" onClick={() => void saveDiaper('POO')}>
              Caca
            </button>
          </div>
          <button type="button" className="big" onClick={() => void saveDiaper('BOTH')}>
            Les deux
          </button>
        </>
      ) : null}

      {type === 'bottle' ? (
        <>
          <div className="row">
            {(['FORMULA', 'BREAST_MILK'] as const).map((m) => (
              <Chip
                key={m}
                label={milkLabel[m]}
                selected={milkType === m}
                onClick={() => {
                  setMilkType(m);
                  if (m === 'FORMULA') setStockId(null);
                }}
              />
            ))}
          </div>
          {milkType === 'BREAST_MILK' ? (
            <>
              <p className="goal-label">Depuis le stock</p>
              {stock.length === 0 ? (
                <p className="muted">Pas de stock. Note un tirage (Tire-lait) d’abord.</p>
              ) : (
                <div className="row">
                  {stock.map((row) => (
                    <Chip
                      key={row.id}
                      label={`${row.remainingMl} ml · ${formatTime(row.startedAt)}`}
                      selected={stockId === row.id}
                      onClick={() => {
                        setStockId(row.id);
                        setAmount(String(row.remainingMl ?? ''));
                      }}
                    />
                  ))}
                  <Chip label="Sans stock" selected={stockId === null} onClick={() => setStockId(null)} />
                </div>
              )}
            </>
          ) : null}
          <Field
            label="Quantité (ml)"
            value={amount}
            onChange={setAmount}
            placeholder={goalMl ? String(goalMl) : '120'}
          />
        </>
      ) : null}

      {type === 'pumping' ? (
        <>
          <div className="row">
            {(['LEFT', 'RIGHT', 'BOTH'] as const).map((s) => (
              <Chip key={s} label={sideLabel[s]} selected={side === s} onClick={() => setSide(s)} />
            ))}
          </div>
          <Field label="Quantité (ml)" value={amount} onChange={setAmount} placeholder="145" />
        </>
      ) : null}

      {type === 'solid' || type === 'supplement' || type === 'note' ? (
        <Field
          label={type === 'solid' ? 'Aliment' : type === 'supplement' ? 'Complément' : 'Texte'}
          value={text}
          onChange={setText}
          inputMode="text"
          multiline={type === 'note'}
        />
      ) : null}

      {type === 'temperature' ? (
        <Field label="Température (°C)" value={celsius} onChange={setCelsius} placeholder="37,2" />
      ) : null}

      {type === 'measurement' ? (
        <>
          <div className="row">
            {(['WEIGHT', 'HEIGHT', 'HEAD_CIRCUMFERENCE'] as const).map((t) => (
              <Chip
                key={t}
                label={measurementLabel[t]}
                selected={measureType === t}
                onClick={() => setMeasureType(t)}
              />
            ))}
          </div>
          <Field label="Valeur" value={measureValue} onChange={setMeasureValue} placeholder="4,2" />
        </>
      ) : null}

      {type !== 'feeding' && type !== 'diaper' ? (
        <Button onClick={() => void save()}>Enregistrer</Button>
      ) : null}

      {error ? <p className="muted">{error}</p> : null}
      {ok ? <p className="ok-flash">{ok}</p> : null}
    </div>
  );
}
