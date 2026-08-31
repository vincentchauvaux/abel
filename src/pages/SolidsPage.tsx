import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Field } from '@/components/ui';
import { addSolidFood, listSolidFoods } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { SolidFood } from '@/db/types';
import { formatTime, startOfLocalDay } from '@/lib/dates';

export function SolidsPage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<SolidFood[]>([]);
  const [food, setFood] = useState('');

  useEffect(() => {
    if (!baby) return;
    listSolidFoods(baby.id).then(setRows);
  }, [baby, tick]);

  const today = rows.filter((row) => row.eatenAt >= startOfLocalDay().toISOString());

  return (
    <div className="screen">
      <ModuleHeader title="Diversification" toolId="solids" />
      <Card>
        <h2>Nouvel aliment</h2>
        <Field label="Aliment" value={food} onChange={setFood} placeholder="Carotte" inputMode="text" />
        <Button
          disabled={!food.trim()}
          onClick={() => {
            if (!baby || !food.trim()) return;
            addSolidFood(baby.id, food);
            setFood('');
          }}>
          Enregistrer
        </Button>
      </Card>
      <Card>
        <h2>Aujourd’hui · {today.length}</h2>
        {today.length === 0 ? (
          <p className="muted">Un aliment = une ligne, datée tout de suite.</p>
        ) : (
          today.map((row) => (
            <div className="line" key={row.id}>
              <strong>{row.food}</strong>
              <span className="muted">{formatTime(row.eatenAt)}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
