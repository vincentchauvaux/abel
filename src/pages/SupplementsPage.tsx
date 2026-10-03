import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Chip, Field } from '@/components/ui';
import { addSupplement, listSupplements } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Supplement } from '@/db/types';
import { supplementToActivity, type ActivityItem } from '@/lib/activity';
import { startOfLocalDay } from '@/lib/dates';
import { returnHome } from '@/lib/return-home';

const PRESETS = ['Vitamine D', 'Fer', 'Fluor'];

export function SupplementsPage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Supplement[]>([]);
  const [name, setName] = useState('Vitamine D');
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    listSupplements(baby.id).then(setRows);
  }, [baby, tick]);

  const today = rows.filter((row) => row.givenAt >= startOfLocalDay().toISOString());

  return (
    <div className="screen">
      <ModuleHeader title="Compléments" toolId="supplements" />
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
            void addSupplement(baby.id, name).then(() => returnHome(navigate));
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
            <JournalLine
              key={row.id}
              item={supplementToActivity(row)}
              onClick={() => setEditing(supplementToActivity(row))}
            />
          ))
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
