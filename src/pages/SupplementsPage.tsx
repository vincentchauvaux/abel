import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip, Field } from '@/components/ui';
import { addSupplement, listSupplements } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Supplement } from '@/db/types';
import { formatTime, startOfLocalDay } from '@/lib/dates';

const PRESETS = ['Vitamine D', 'Fer', 'Fluor'];

export function SupplementsPage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<Supplement[]>([]);
  const [name, setName] = useState('Vitamine D');

  useEffect(() => {
    if (!baby) return;
    listSupplements(baby.id).then(setRows);
  }, [baby, tick]);

  const today = rows.filter((row) => row.givenAt >= startOfLocalDay().toISOString());

  return (
    <div className="screen">
      <ModuleHeader title="Compléments" />
      <Card>
        <h2>Donner maintenant</h2>
        <div className="row">
          {PRESETS.map((item) => (
            <Chip key={item} label={item} selected={name === item} onClick={() => setName(item)} />
          ))}
        </div>
        <Field label="Autre" value={name} onChange={setName} placeholder="Vitamine D" inputMode="text" />
        <Button
          disabled={!name.trim()}
          onClick={() => {
            if (!baby || !name.trim()) return;
            addSupplement(baby.id, name);
          }}>
          Enregistrer
        </Button>
      </Card>
      <Card>
        <h2>Aujourd’hui · {today.length}</h2>
        {today.length === 0 ? (
          <p className="muted">Un appui enregistre l’heure. Ce n’est pas un conseil médical.</p>
        ) : (
          today.map((row) => (
            <div className="line" key={row.id}>
              <strong>{row.name}</strong>
              <span className="muted">{formatTime(row.givenAt)}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
