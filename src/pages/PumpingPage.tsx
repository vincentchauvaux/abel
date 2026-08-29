import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip, Field } from '@/components/ui';
import { listPumps, startPumping, updatePumping } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { PumpingSession, Side } from '@/db/types';
import { formatTime, parseDecimal, startOfLocalDay } from '@/lib/dates';
import { sideLabel } from '@/lib/labels';

export function PumpingPage() {
  const { baby, tick } = useDb();
  const [sessions, setSessions] = useState<PumpingSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [side, setSide] = useState<Side | null>(null);

  useEffect(() => {
    if (!baby) return;
    listPumps(baby.id).then(setSessions);
  }, [baby, tick]);

  const today = sessions.filter((row) => row.startedAt >= startOfLocalDay().toISOString());
  const todayMl = today.reduce((sum, row) => sum + (row.amountMl ?? 0), 0);
  const editing = sessions.find((row) => row.id === editingId);

  return (
    <div className="screen">
      <ModuleHeader title="Tire-lait" />
      <Button
        onClick={async () => {
          if (!baby) return;
          const id = await startPumping(baby.id);
          setEditingId(id);
          setAmount('');
          setDuration('');
          setSide(null);
        }}>
        Tirer mon lait
      </Button>
      {editing ? (
        <Card>
          <h2>Tirage · {formatTime(editing.startedAt)}</h2>
          <Field label="Quantité (ml)" value={amount} onChange={setAmount} placeholder="145" />
          <Field label="Durée (min, facultatif)" value={duration} onChange={setDuration} placeholder="15" />
          <p className="muted">Côté</p>
          <div className="row">
            {(['LEFT', 'RIGHT', 'BOTH'] as const).map((item) => (
              <Chip key={item} label={sideLabel[item]} selected={side === item} onClick={() => setSide(item)} />
            ))}
          </div>
          <Button
            disabled={!amount}
            onClick={() => {
              const ml = parseDecimal(amount);
              if (!editingId || ml === null || ml <= 0) return;
              const minutes = duration ? parseDecimal(duration) : null;
              updatePumping(editingId, {
                amountMl: Math.round(ml),
                durationMinutes: minutes === null ? null : Math.round(minutes),
                side,
              });
              setEditingId(null);
            }}>
            Enregistrer
          </Button>
        </Card>
      ) : null}
      <Card>
        <h2>Aujourd’hui · {todayMl} ml</h2>
        {today.map((row) => (
          <div className="line" key={row.id}>
            <strong>{formatTime(row.startedAt)}</strong>
            <span className="muted">{row.amountMl == null ? 'à compléter' : `${row.amountMl} ml`}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
