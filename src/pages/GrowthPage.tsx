import { useEffect, useState } from 'react';

import { ModuleHeader } from '@/components/Layout';
import { GrowthChart } from '@/components/GrowthChart';
import { Button, Card, Field } from '@/components/ui';
import { addMeasurement, listMeasurements } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Measurement, MeasurementType } from '@/db/types';
import { formatDate, parseDecimal } from '@/lib/dates';
import { measurementLabel, measurementUnit } from '@/lib/labels';

const TYPES: MeasurementType[] = ['WEIGHT', 'HEIGHT', 'HEAD_CIRCUMFERENCE'];

export function GrowthPage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<Measurement[]>([]);
  const [adding, setAdding] = useState<MeasurementType | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!baby) return;
    listMeasurements(baby.id).then(setRows);
  }, [baby, tick]);

  return (
    <div className="screen">
      <ModuleHeader title="Croissance" toolId="growth" />
      <GrowthChart
        weights={rows.filter((row) => row.type === 'WEIGHT')}
        heights={rows.filter((row) => row.type === 'HEIGHT')}
        bornOn={baby?.bornOn}
      />
      {TYPES.map((type) => {
        const list = rows.filter((row) => row.type === type);
        return (
          <Card key={type}>
            <h2>
              {measurementLabel[type]} ({measurementUnit[type]})
            </h2>
            <Button
              onClick={() => {
                setAdding(type);
                setValue('');
              }}>
              Ajouter
            </Button>
            {adding === type ? (
              <>
                <Field
                  label={`Valeur en ${measurementUnit[type]}`}
                  value={value}
                  onChange={setValue}
                  placeholder={type === 'WEIGHT' ? '4,82' : '56'}
                />
                <Button
                  disabled={!value}
                  onClick={() => {
                    const parsed = parseDecimal(value);
                    if (!baby || parsed === null || parsed <= 0) return;
                    addMeasurement(baby.id, type, parsed);
                    setAdding(null);
                    setValue('');
                  }}>
                  Enregistrer
                </Button>
              </>
            ) : null}
            {list.length === 0 ? (
              <p className="muted">Pas encore de mesure.</p>
            ) : (
              list.map((row) => (
                <div className="line" key={row.id}>
                  <span className="muted">{formatDate(row.measuredAt)}</span>
                  <strong>
                    {String(row.value).replace('.', ',')} {row.unit}
                  </strong>
                </div>
              ))
            )}
          </Card>
        );
      })}
    </div>
  );
}
