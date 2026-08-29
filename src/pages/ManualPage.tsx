import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip, Field } from '@/components/ui';
import {
  addBottle,
  addDiaper,
  addMeasurementAt,
  addNote,
  addPumping,
  addSolidFood,
  addSupplement,
  addTemperature,
  logFeedingNow,
  startSleep,
} from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { DiaperKind, MeasurementType, MilkType, Side } from '@/db/types';
import { fromDatetimeLocalValue, parseDecimal, toDatetimeLocalValue } from '@/lib/dates';
import { diaperLabel, measurementLabel, milkLabel, sideLabel } from '@/lib/labels';

type EntryType =
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

const TYPES: { key: EntryType; label: string }[] = [
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

export function ManualPage() {
  const { baby } = useDb();
  const navigate = useNavigate();
  const [type, setType] = useState<EntryType>('bottle');
  const [when, setWhen] = useState(toDatetimeLocalValue());
  const [side, setSide] = useState<Side>('LEFT');
  const [milkType, setMilkType] = useState<MilkType>('FORMULA');
  const [amount, setAmount] = useState('');
  const [diaperKind, setDiaperKind] = useState<DiaperKind>('PEE');
  const [text, setText] = useState('');
  const [celsius, setCelsius] = useState('');
  const [measureType, setMeasureType] = useState<MeasurementType>('WEIGHT');
  const [measureValue, setMeasureValue] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (!baby || !when) return;
    setError('');
    const at = fromDatetimeLocalValue(when);
    try {
      if (type === 'feeding') {
        await logFeedingNow(baby.id, side, at);
      } else if (type === 'bottle') {
        const ml = parseDecimal(amount);
        if (ml === null || ml <= 0) {
          setError('Indique une quantité en ml.');
          return;
        }
        await addBottle(baby.id, milkType, Math.round(ml), at, null);
      } else if (type === 'diaper') {
        await addDiaper(baby.id, diaperKind, at);
      } else if (type === 'pumping') {
        const ml = parseDecimal(amount);
        if (ml === null || ml <= 0) {
          setError('Indique une quantité en ml.');
          return;
        }
        await addPumping(baby.id, { amountMl: Math.round(ml), startedAt: at, side });
      } else if (type === 'solid') {
        if (!text.trim()) {
          setError('Indique l’aliment.');
          return;
        }
        await addSolidFood(baby.id, text, at);
      } else if (type === 'supplement') {
        if (!text.trim()) {
          setError('Indique le complément.');
          return;
        }
        await addSupplement(baby.id, text, at);
      } else if (type === 'sleep') {
        await startSleep(baby.id, at);
      } else if (type === 'temperature') {
        const n = parseDecimal(celsius);
        if (n === null) {
          setError('Indique la température.');
          return;
        }
        await addTemperature(baby.id, n, at);
      } else if (type === 'note') {
        if (!text.trim()) {
          setError('Écris une note.');
          return;
        }
        await addNote(baby.id, text, at);
      } else if (type === 'measurement') {
        const n = parseDecimal(measureValue);
        if (n === null || n <= 0) {
          setError('Indique une valeur.');
          return;
        }
        await addMeasurementAt(baby.id, measureType, n, at);
      }
      navigate('/');
    } catch {
      setError('Enregistrement impossible.');
    }
  };

  return (
    <div className="screen">
      <ModuleHeader title="Entrée manuelle" />
      <Card>
        <h2>Quoi ?</h2>
        <div className="row">
          {TYPES.map((item) => (
            <Chip key={item.key} label={item.label} selected={type === item.key} onClick={() => setType(item.key)} />
          ))}
        </div>
        <label className="field">
          <span>Date et heure</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>

        {type === 'feeding' || type === 'pumping' ? (
          <div className="row">
            {(['LEFT', 'RIGHT', 'BOTH'] as const).map((s) => (
              <Chip key={s} label={sideLabel[s]} selected={side === s} onClick={() => setSide(s)} />
            ))}
          </div>
        ) : null}

        {type === 'bottle' ? (
          <>
            <div className="row">
              {(['FORMULA', 'BREAST_MILK'] as const).map((m) => (
                <Chip key={m} label={milkLabel[m]} selected={milkType === m} onClick={() => setMilkType(m)} />
              ))}
            </div>
            <Field label="Quantité (ml)" value={amount} onChange={setAmount} placeholder="120" />
          </>
        ) : null}

        {type === 'pumping' ? <Field label="Quantité (ml)" value={amount} onChange={setAmount} placeholder="145" /> : null}

        {type === 'diaper' ? (
          <div className="row">
            {(['PEE', 'POO', 'BOTH'] as const).map((k) => (
              <Chip key={k} label={diaperLabel[k]} selected={diaperKind === k} onClick={() => setDiaperKind(k)} />
            ))}
          </div>
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

        {error ? <p className="muted">{error}</p> : null}
        <Button onClick={() => void save()}>Enregistrer</Button>
      </Card>
    </div>
  );
}
