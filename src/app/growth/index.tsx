import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ModuleHeader } from '@/components/ModuleHeader';
import { Screen } from '@/components/Screen';
import { Card, Field, PrimaryButton } from '@/components/ui';
import { addMeasurement } from '@/db/api';
import { db } from '@/db/client';
import { measurements, type MeasurementType } from '@/db/schema';
import { useBaby } from '@/hooks/use-baby';
import { formatDate, parseDecimal } from '@/lib/dates';
import { measurementLabel, measurementUnit } from '@/lib/labels';
import { colors, spacing } from '@/theme';

const TYPES: MeasurementType[] = ['WEIGHT', 'HEIGHT', 'HEAD_CIRCUMFERENCE'];

export default function GrowthScreen() {
  const baby = useBaby();
  const babyId = baby?.id ?? '';
  const [adding, setAdding] = useState<MeasurementType | null>(null);
  const [value, setValue] = useState('');

  const { data: rowsRaw } = useLiveQuery(
    db
      .select()
      .from(measurements)
      .where(and(eq(measurements.babyId, babyId), isNull(measurements.deletedAt)))
      .orderBy(desc(measurements.measuredAt)),
    [babyId],
  );
  const rows = rowsRaw ?? [];

  const save = () => {
    if (!babyId || !adding) return;
    const parsed = parseDecimal(value);
    if (parsed === null || parsed <= 0) return;
    addMeasurement(babyId, adding, parsed);
    setAdding(null);
    setValue('');
  };

  return (
    <Screen scroll>
      <ModuleHeader title="Croissance" />
      {TYPES.map((type) => {
        const list = rows.filter((row) => row.type === type);
        return (
          <Card key={type}>
            <View style={styles.head}>
              <Text style={styles.blockTitle}>
                {measurementLabel[type]} ({measurementUnit[type]})
              </Text>
              <PrimaryButton
                label="Ajouter"
                onPress={() => {
                  setAdding(type);
                  setValue('');
                }}
              />
            </View>
            {adding === type ? (
              <>
                <Field
                  label={`Valeur en ${measurementUnit[type]}`}
                  value={value}
                  onChangeText={setValue}
                  placeholder={type === 'WEIGHT' ? '4,82' : '56'}
                />
                <PrimaryButton label="Enregistrer" onPress={save} disabled={!value} />
              </>
            ) : null}
            {list.length === 0 ? (
              <Text style={styles.muted}>Pas encore de mesure.</Text>
            ) : (
              list.map((row) => (
                <View key={row.id} style={styles.item}>
                  <Text style={styles.date}>{formatDate(row.measuredAt)}</Text>
                  <Text style={styles.value}>
                    {String(row.value).replace('.', ',')} {row.unit}
                  </Text>
                </View>
              ))
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    gap: spacing.sm,
  },
  blockTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  value: {
    fontWeight: '700',
    color: colors.text,
  },
});
