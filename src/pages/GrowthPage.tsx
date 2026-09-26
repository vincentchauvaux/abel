import { useEffect, useState } from 'react';

import { ActivityEditor } from '@/components/ActivityEditor';
import { JournalLine } from '@/components/JournalLine';
import { ModuleHeader } from '@/components/Layout';
import { GrowthChart } from '@/components/GrowthChart';
import { Button, Card, Field } from '@/components/ui';
import { addMeasurement, listMeasurements } from '@/db/api';
import { useDb } from '@/db/DbProvider';
import type { Measurement, MeasurementType } from '@/db/types';
import { measurementToActivity, type ActivityItem } from '@/lib/activity';
import { parseDecimal } from '@/lib/dates';
import { measurementLabel, measurementUnit } from '@/lib/labels';

const TYPES: MeasurementType[] = ['WEIGHT', 'HEIGHT', 'HEAD_CIRCUMFERENCE'];

export function GrowthPage() {
  const { baby, tick } = useDb();
  const [rows, setRows] = useState<Measurement[]>([]);
  const [adding, setAdding] = useState<MeasurementType | null>(null);
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<ActivityItem | null>(null);

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
                <JournalLine
                  key={row.id}
                  item={measurementToActivity(row)}
                  onClick={() => setEditing(measurementToActivity(row))}
                />
              ))
            )}
          </Card>
        );
      })}
      {editing ? <ActivityEditor item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
