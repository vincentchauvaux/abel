import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip, Field } from '@/components/ui';
import { addBottle, getReminder, listBottles } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { BottleFeed, MilkType } from '@/db/types';
import { formatTime, nowIso, parseDecimal, startOfLocalDay } from '@/lib/dates';
import { milkLabel } from '@/lib/labels';

export function BottlePage() {
  const { baby, tick } = useDb();
  const [feeds, setFeeds] = useState<BottleFeed[]>([]);
  const [milkType, setMilkType] = useState<MilkType>('BREAST_MILK');
  const [amount, setAmount] = useState('');
  const [goalMl, setGoalMl] = useState<number | null>(null);

  useEffect(() => {
    if (!baby) return;
    Promise.all([listBottles(baby.id), getReminder(baby.id)]).then(([rows, goals]) => {
      setFeeds(rows);
      const ml = goals?.bottleMl ?? null;
      setGoalMl(ml);
      setAmount((current) => (current === '' && ml ? String(ml) : current));
    });
  }, [baby, tick]);

  const today = feeds.filter((row) => row.fedAt >= startOfLocalDay().toISOString());
  const todayMl = today.reduce((sum, row) => sum + row.amountMl, 0);

  return (
    <div className="screen">
      <ModuleHeader title="Biberon" />
      <Card>
        <h2>Nouveau biberon</h2>
        <div className="row">
          {(['BREAST_MILK', 'FORMULA'] as const).map((type) => (
            <Chip key={type} label={milkLabel[type]} selected={milkType === type} onClick={() => setMilkType(type)} />
          ))}
        </div>
        <Field
          label="Quantité (ml)"
          value={amount}
          onChange={setAmount}
          placeholder={goalMl ? String(goalMl) : '120'}
        />
        {goalMl ? <p className="muted">Objectif : {goalMl} ml par repas (réglé sur Bébé).</p> : null}
        <Button
          disabled={!amount}
          onClick={() => {
            const ml = parseDecimal(amount);
            if (!baby || ml === null || ml <= 0) return;
            addBottle(baby.id, milkType, Math.round(ml), nowIso());
            setAmount(goalMl ? String(goalMl) : '');
          }}>
          Enregistrer
        </Button>
      </Card>
      <Card>
        <h2>Aujourd’hui · {todayMl} ml</h2>
        {today.map((row) => (
          <div className="line" key={row.id}>
            <strong>{formatTime(row.fedAt)}</strong>
            <span className="muted">
              {row.amountMl} ml · {milkLabel[row.milkType]}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
