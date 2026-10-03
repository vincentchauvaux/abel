import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { MilkStockLine } from '@/components/MilkStockLine';
import { Button, Card, Chip, Field } from '@/components/ui';
import { addPumping, listMilkStock, listPumps, startPumping, updatePumping } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { PumpingSession, Side } from '@/db/types';
import { pumpingSessionToActivity, type ActivityItem } from '@/lib/activity';
import { formatTime, fromDatetimeLocalValue, parseDecimal, startOfLocalDay, toDatetimeLocalValue } from '@/lib/dates';
import { sideLabel } from '@/lib/labels';
import { stockIdLabel } from '@/lib/milk-stock';
import { returnHome } from '@/lib/return-home';

export function PumpingPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PumpingSession[]>([]);
  const [stock, setStock] = useState<PumpingSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [side, setSide] = useState<Side | null>(null);
  const [when, setWhen] = useState(toDatetimeLocalValue());
  const [editingEntry, setEditingEntry] = useState<ActivityItem | null>(null);
  const [lastStockNo, setLastStockNo] = useState<number | null>(null);

  useEffect(() => {
    if (!baby) return;
    Promise.all([listPumps(baby.id), listMilkStock(baby.id)]).then(([rows, available]) => {
      setSessions(rows);
      setStock(available);
    });
  }, [baby, tick]);

  const today = sessions.filter((row) => row.startedAt >= startOfLocalDay().toISOString());
  const todayMl = today.reduce((sum, row) => sum + (row.amountMl ?? 0), 0);
  const stockMl = stock.reduce((sum, row) => sum + (row.remainingMl ?? 0), 0);
  const editing = sessions.find((row) => row.id === editingId);

  const resetForm = () => {
    setAmount('');
    setDuration('');
    setSide(null);
    setWhen(toDatetimeLocalValue());
    setEditingId(null);
  };

  return (
    <div className="screen">
      <ModuleHeader title="Tire-lait" toolId="pumping" />
      <Card>
        <h2>Noter un tirage</h2>
        <p className="muted">Quantité + date. Un ID est attribué tout de suite — note-le sur le sachet.</p>
        <label className="field">
          <span>Date et heure</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <Field label="Quantité (ml)" value={amount} onChange={setAmount} placeholder="145" />
        <Field label="Durée (min, facultatif)" value={duration} onChange={setDuration} placeholder="15" />
        <p className="muted">Côté</p>
        <div className="row">
          {(['LEFT', 'RIGHT', 'BOTH'] as const).map((item) => (
            <Chip key={item} label={sideLabel[item]} selected={side === item} onClick={() => setSide(item)} />
          ))}
        </div>
        <Button
          disabled={!amount.trim()}
          onClick={async () => {
            if (!baby) return;
            const ml = parseDecimal(amount);
            if (ml === null || ml <= 0 || !when) return;
            const minutes = duration.trim() ? parseDecimal(duration) : null;
            const created = await addPumping(baby.id, {
              amountMl: Math.round(ml),
              startedAt: fromDatetimeLocalValue(when),
              durationMinutes: minutes === null ? null : Math.round(minutes),
              side,
            });
            setLastStockNo(created.stockNo);
            resetForm();
            returnHome(navigate);
          }}>
          Mettre en stock
        </Button>
        <Button
          tone="muted"
          onClick={async () => {
            if (!baby) return;
            const id = await startPumping(baby.id);
            setEditingId(id);
            setAmount('');
            setDuration('');
            setSide(null);
            setWhen(toDatetimeLocalValue());
          }}>
          Tirage rapide (maintenant)
        </Button>
      </Card>
      {editing ? (
        <Card>
          <h2>
            Compléter · {stockIdLabel(editing.stockNo)} · {formatTime(editing.startedAt)}
          </h2>
          <Field label="Quantité (ml)" value={amount} onChange={setAmount} placeholder="145" />
          <Field label="Durée (min, facultatif)" value={duration} onChange={setDuration} placeholder="15" />
          <div className="row">
            {(['LEFT', 'RIGHT', 'BOTH'] as const).map((item) => (
              <Chip key={item} label={sideLabel[item]} selected={side === item} onClick={() => setSide(item)} />
            ))}
          </div>
          <Button
            disabled={!amount}
            onClick={async () => {
              const ml = parseDecimal(amount);
              if (!editingId || ml === null || ml <= 0) return;
              const minutes = duration ? parseDecimal(duration) : null;
              await updatePumping(editingId, {
                amountMl: Math.round(ml),
                durationMinutes: minutes === null ? null : Math.round(minutes),
                side,
                startedAt: when ? fromDatetimeLocalValue(when) : undefined,
              });
              setLastStockNo(editing.stockNo);
              resetForm();
              returnHome(navigate);
            }}>
            Enregistrer
          </Button>
        </Card>
      ) : null}
      <Card>
        <h2>Stock disponible · {stockMl} ml</h2>
        {lastStockNo != null ? (
          <p className="muted">Dernier sachet : {stockIdLabel(lastStockNo)} — note-le sur le lait.</p>
        ) : null}
        {stock.length === 0 ? (
          <p className="muted">Aucun lait en stock. Note un tirage ci-dessus.</p>
        ) : (
          <div className="stock-list">
            {stock.map((row) => (
              <MilkStockLine
                key={row.id}
                row={row}
                onClick={() => setEditingEntry(pumpingSessionToActivity(row))}
              />
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h2>Aujourd’hui · {todayMl} ml tirés</h2>
        {today.map((row) => (
          <JournalLine
            key={row.id}
            item={pumpingSessionToActivity(row)}
            onClick={() => setEditingEntry(pumpingSessionToActivity(row))}
          />
        ))}
      </Card>
      {editingEntry ? <ActivityEditor item={editingEntry} onClose={() => setEditingEntry(null)} /> : null}
    </div>
  );
}
