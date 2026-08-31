import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ActivityEditor } from '@/components/ActivityEditor';
import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip, Field } from '@/components/ui';
import { addBottle, getReminder, listBottles, listMilkStock } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BottleFeed, MilkType, PumpingSession } from '@/db/types';
import type { ActivityItem } from '@/lib/activity';
import { bottleAmountHistory } from '@/lib/bottle-history';
import { formatDateTime, formatTime, nowIso, parseDecimal, startOfLocalDay } from '@/lib/dates';
import { milkLabel } from '@/lib/labels';
import { notifyDiaperFromGoals, notifyMealFromGoals } from '@/lib/reminders';

function bottleActivityItem(row: BottleFeed): ActivityItem {
  return {
    id: row.id,
    kind: 'bottle',
    at: row.fedAt,
    title: 'Biberon',
    detail: `${row.amountMl} ml · ${milkLabel[row.milkType]}`,
  };
}

export function BottlePage() {
  const { baby, tick } = useDb();
  const [feeds, setFeeds] = useState<BottleFeed[]>([]);
  const [stock, setStock] = useState<PumpingSession[]>([]);
  const [milkType, setMilkType] = useState<MilkType>('FORMULA');
  const [amount, setAmount] = useState('');
  const [goalMl, setGoalMl] = useState<number | null>(null);
  const [goals, setGoals] = useState<Awaited<ReturnType<typeof getReminder>>>();
  const [stockId, setStockId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    Promise.all([listBottles(baby.id), getReminder(baby.id), listMilkStock(baby.id)]).then(
      ([rows, goals, available]) => {
        setFeeds(rows);
        setGoalMl(goals?.bottleMl ?? null);
        setGoals(goals);
        setStock(available);
      },
    );
  }, [baby, tick]);

  const today = feeds.filter((row) => row.fedAt >= startOfLocalDay().toISOString());
  const todayMl = today.reduce((sum, row) => sum + row.amountMl, 0);
  const selected = stock.find((row) => row.id === stockId);

  const pickStock = (row: PumpingSession) => {
    setStockId(row.id);
    setMilkType('BREAST_MILK');
    setAmount(String(row.remainingMl ?? ''));
  };

  return (
    <div className="screen">
      <ModuleHeader title="Biberon" toolId="bottle" />
      <Card>
        <h2>Nouveau biberon</h2>
        <p className="muted">La quantité est obligatoire. Au sein, utilise Allaitement.</p>
        <div className="row">
          {(['FORMULA', 'BREAST_MILK'] as const).map((type) => (
            <Chip
              key={type}
              label={milkLabel[type]}
              selected={milkType === type}
              onClick={() => {
                setMilkType(type);
                if (type === 'FORMULA') setStockId(null);
              }}
            />
          ))}
        </div>
        {milkType === 'BREAST_MILK' ? (
          <>
            <p className="goal-label">Depuis le stock (lait tiré)</p>
            {stock.length === 0 ? (
              <p className="muted">Pas de stock. Ajoute un tirage dans Tire-lait.</p>
            ) : (
              <div className="row">
                {stock.map((row) => (
                  <Chip
                    key={row.id}
                    label={`${row.remainingMl} ml · ${formatTime(row.startedAt)}`}
                    selected={stockId === row.id}
                    onClick={() => pickStock(row)}
                  />
                ))}
                <Chip
                  label="Sans stock"
                  selected={stockId === null}
                  onClick={() => {
                    setStockId(null);
                    setAmount(goalMl ? String(goalMl) : '');
                  }}
                />
              </div>
            )}
          </>
        ) : null}
        <Field
          label="Quantité (ml)"
          value={amount}
          onChange={setAmount}
          placeholder={goalMl ? String(goalMl) : selected ? String(selected.remainingMl) : '120'}
        />
        {selected ? (
          <p className="muted">Max stock sélectionné : {selected.remainingMl} ml ({formatDateTime(selected.startedAt)}).</p>
        ) : null}
        <Button
          disabled={!amount.trim()}
          onClick={async () => {
            if (!baby) return;
            const ml = parseDecimal(amount);
            if (ml === null || ml <= 0) return;
            const qty = Math.round(ml);
            if (stockId && selected && qty > (selected.remainingMl ?? 0)) return;
            const fedAt = nowIso();
            try {
              await addBottle(baby.id, milkType, qty, fedAt, milkType === 'BREAST_MILK' ? stockId : null);
              setAmount('');
              setStockId(null);
              await notifyMealFromGoals(goals, fedAt);
              await notifyDiaperFromGoals(goals, fedAt);
            } catch {
              window.alert('Stock insuffisant pour cette quantité.');
            }
          }}>
          Enregistrer
        </Button>
      </Card>
      <Card>
        {today.length === 0 ? (
          <p className="muted">Rien de noté aujourd’hui.</p>
        ) : (
          today.map((row, index) => {
            const history = bottleAmountHistory(row);
            return (
              <div className={`bottle-day-block${index > 0 ? ' bottle-day-block-spaced' : ''}`} key={row.id}>
                <div className="bottle-day-head">
                  <p className="bottle-day-title">
                    Aujourd’hui · {history.length} · {row.amountMl} ml
                  </p>
                  <button
                    type="button"
                    className="icon-btn module-history-edit"
                    onClick={() => setEditing(bottleActivityItem(row))}
                    aria-label={`Modifier le biberon de ${formatTime(row.fedAt)}`}>
                    <Pencil size={18} aria-hidden />
                  </button>
                </div>
                <p className="muted bottle-day-type">
                  {milkLabel[row.milkType]}
                  {row.pumpingSessionId ? ' · stock' : ''}
                </p>
                <div className="bottle-day-edits">
                  {history.map((entry, entryIndex) => (
                    <div className="bottle-day-edit-line" key={`${entry.at}-${entryIndex}`}>
                      <span>{formatTime(entry.at)}</span>
                      <span className="muted">{entry.amountMl} ml</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
        {today.length > 0 ? (
          <p className="muted bottle-day-total">Total jour · {today.length} · {todayMl} ml</p>
        ) : null}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
