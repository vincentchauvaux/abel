import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Field } from '@/components/ui';
import { addTemperature, listTemperatures } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Temperature } from '@/db/types';
import { temperatureToActivity, type ActivityItem } from '@/lib/activity';
import { parseDecimal } from '@/lib/dates';
import { formatTemperature, temperatureLevelClass } from '@/lib/temperature';
import { returnHome } from '@/lib/return-home';

export function TemperaturePage() {
  const { baby, tick } = useDb();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Temperature[]>([]);
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<ActivityItem | null>(null);

  useEffect(() => {
    if (!baby) return;
    listTemperatures(baby.id).then(setRows);
  }, [baby, tick]);

  const previewTemp = parseDecimal(value);

  return (
    <div className="screen">
      <ModuleHeader title="Température" toolId="temperature" />
      <Card>
        <h2>Nouvelle mesure</h2>
        <p className="muted">Saisie uniquement. Mimom ne donne aucun conseil médical.</p>
        <Field label="Température (°C)" value={value} onChange={setValue} placeholder="37,2" />
        {previewTemp != null ? (
          <p className={temperatureLevelClass(previewTemp)}>
            Aperçu : {formatTemperature(previewTemp)} °C
          </p>
        ) : null}
        <Button
          disabled={!value}
          onClick={() => {
            const celsius = parseDecimal(value);
            if (!baby || celsius === null) return;
            void addTemperature(baby.id, celsius).then(() => returnHome(navigate));
          }}>
          Enregistrer
        </Button>
      </Card>
      <Card>
        <h2>Historique</h2>
        {rows.length === 0 ? (
          <p className="muted">Pas encore de mesure.</p>
        ) : (
          rows.slice(0, 30).map((row) => (
            <JournalLine
              key={row.id}
              item={temperatureToActivity(row)}
              onClick={() => setEditing(temperatureToActivity(row))}
            />
          ))
        )}
      </Card>
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
