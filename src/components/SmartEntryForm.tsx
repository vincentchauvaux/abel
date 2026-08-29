import { useEffect, useState } from 'react';

import { Button, Chip, Field } from '@/components/ui';
import {
  addBottle,
  addDiaper,
  addMeasurementAt,
  addNote,
  addPumping,
  addSolidFood,
  addSupplement,
  addTemperature,
  getReminder,
  listMilkStock,
  logFeedingNow,
  startSleep,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { DiaperKind, MeasurementType, MilkType, PumpingSession, Side } from '@/db/types';
import { formatTime, fromDatetimeLocalValue, parseDecimal, toDatetimeLocalValue } from '@/lib/dates';
import { diaperLabel, measurementLabel, milkLabel, sideLabel } from '@/lib/labels';
import { notifyIn } from '@/lib/reminders';

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

const TYPES: { key: SmartEntryType; label: string }[] = [
  { key: 'feeding', label: 'Tétée' },
  { key: 'bottle', label: 'Biberon' },
  { key: 'diaper', label: 'Couche' },
  { key: 'pumping', label: 'Tire-lait' },
  { key: 'solid', label: 'Diversif.' },
  { key: 'supplement', label: 'Complément' },
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
  const [diaperAfter, setDiaperAfter] = useState(0);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    if (!baby) return;
    Promise.all([listMilkStock(baby.id), getReminder(baby.id)]).then(([available, goals]) => {
      setStock(available);
      setGoalMl(goals?.bottleMl ?? null);
      setDiaperAfter(goals?.diaperMinutes ?? 0);
    });
  }, [baby, tick]);

  const resetSoft = () => {
    setAmount('');
    setText('');
    setCelsius('');
    setMeasureValue('');
    setStockId(null);
    setWhen(toDatetimeLocalValue());
    setError('');
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
    await logFeedingNow(baby.id, chosen, atIso());
    await notifyIn(diaperAfter, 'Rappel couche après le repas');
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
        await notifyIn(diaperAfter, 'Rappel couche après le repas');
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
        await startSleep(baby.id, at);
        await finish('Sieste démarrée');
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
      <p className="muted">Choisis un outil : les options s’adaptent (comme dans le module).</p>
      <div className="row">
        {TYPES.map((item) => (
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

      <label className="field">
        <span>Date et heure</span>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>

      {type === 'feeding' ? (
        <>
          <p className="muted">Un appui = tétée notée (sans ml), comme dans Allaitement.</p>
          <div className="row">
            {(['LEFT', 'RIGHT', 'BOTH'] as const).map((s) => (
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

      {type === 'sleep' ? <p className="muted">Démarre une sieste à l’heure choisie (à terminer dans Sommeil).</p> : null}

      {type !== 'feeding' && type !== 'diaper' ? (
        <Button onClick={() => void save()}>Enregistrer</Button>
      ) : null}

      {error ? <p className="muted">{error}</p> : null}
      {ok ? <p className="ok-flash">{ok}</p> : null}
    </div>
  );
}
