import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ModuleHeader } from '@/components/ModuleHeader';
import { Screen } from '@/components/Screen';
import { Card, ChoiceChip, Field, PrimaryButton } from '@/components/ui';
import { startPumping, updatePumping } from '@/db/api';
import { db } from '@/db/client';
import { pumpingSessions, type Side } from '@/db/schema';
import { useBaby } from '@/hooks/use-baby';
import { formatTime, parseDecimal, startOfLocalDay } from '@/lib/dates';
import { sideLabel } from '@/lib/labels';
import { colors } from '@/theme';

export default function PumpingScreen() {
  const baby = useBaby();
  const babyId = baby?.id ?? '';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [side, setSide] = useState<Side | null>(null);

  const { data: sessionsRaw } = useLiveQuery(
    db
      .select()
      .from(pumpingSessions)
      .where(and(eq(pumpingSessions.babyId, babyId), isNull(pumpingSessions.deletedAt)))
      .orderBy(desc(pumpingSessions.startedAt)),
    [babyId],
  );
  const sessions = sessionsRaw ?? [];

  const todayStart = startOfLocalDay().toISOString();
  const today = sessions.filter((row) => row.startedAt >= todayStart);
  const todayMl = today.reduce((sum, row) => sum + (row.amountMl ?? 0), 0);
  const editing = sessions.find((row) => row.id === editingId);

  const tapStart = () => {
    if (!babyId) return;
    const id = startPumping(babyId);
    setEditingId(id);
    setAmount('');
    setDuration('');
    setSide(null);
  };

  const save = () => {
    if (!editingId) return;
    const ml = parseDecimal(amount);
    if (ml === null || ml <= 0) return;
    const minutes = duration ? parseDecimal(duration) : null;
    updatePumping(editingId, {
      amountMl: Math.round(ml),
      durationMinutes: minutes === null ? null : Math.round(minutes),
      side,
    });
    setEditingId(null);
  };

  return (
    <Screen scroll>
      <ModuleHeader title="Tire-lait" />
      <PrimaryButton label="Tirer mon lait" onPress={tapStart} />

      {editing ? (
        <Card>
          <Text style={styles.blockTitle}>Tirage · {formatTime(editing.startedAt)}</Text>
          <Field label="Quantité (ml)" value={amount} onChangeText={setAmount} placeholder="145" />
          <Field
            label="Durée (min, facultatif)"
            value={duration}
            onChangeText={setDuration}
            placeholder="15"
          />
          <Text style={styles.caption}>Côté</Text>
          <View style={styles.row}>
            {(['LEFT', 'RIGHT', 'BOTH'] as const).map((item) => (
              <ChoiceChip
                key={item}
                label={sideLabel[item]}
                selected={side === item}
                onPress={() => setSide(item)}
              />
            ))}
          </View>
          <PrimaryButton label="Enregistrer" onPress={save} disabled={!amount} />
        </Card>
      ) : null}

      <Card>
        <Text style={styles.blockTitle}>Aujourd’hui · {todayMl} ml</Text>
        {today.map((row) => (
          <View key={row.id} style={styles.item}>
            <Text style={styles.time}>{formatTime(row.startedAt)}</Text>
            <Text style={styles.meta}>
              {row.amountMl == null ? 'à compléter' : `${row.amountMl} ml`}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blockTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  caption: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
  },
});
