import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { TemperatureValue } from '@/components/TemperatureValue';
import { Button, Card, Field } from '@/components/ui';
import { addTemperature, listTemperatures } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Temperature } from '@/db/types';
import { formatDateTime, parseDecimal } from '@/lib/dates';
import { formatTemperature, temperatureLevelClass } from '@/lib/temperature';

export function TemperaturePage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<Temperature[]>([]);
  const [value, setValue] = useState('');

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
              <TemperatureValue celsius={row.celsius} />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
