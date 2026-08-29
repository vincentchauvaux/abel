import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { Button, Card, Field } from '@/components/ui';
import { addTemperature, listTemperatures } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Temperature } from '@/db/types';
import { formatDateTime, parseDecimal } from '@/lib/dates';

export function TemperaturePage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<Temperature[]>([]);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!baby) return;
    listTemperatures(baby.id).then(setRows);
  }, [baby, tick]);

  return (
    <div className="screen">
      <ModuleHeader title="Température" />
      <Card>
        <h2>Nouvelle mesure</h2>
        <p className="muted">Saisie uniquement. Abel ne donne aucun conseil médical.</p>
        <Field label="Température (°C)" value={value} onChange={setValue} placeholder="37,2" />
        <Button
          disabled={!value}
          onClick={() => {
            const celsius = parseDecimal(value);
            if (!baby || celsius === null) return;
            addTemperature(baby.id, celsius);
            setValue('');
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
            <div className="line" key={row.id}>
              <span className="muted">{formatDateTime(row.measuredAt)}</span>
              <strong>{String(row.celsius).replace('.', ',')} °C</strong>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
