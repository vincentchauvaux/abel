import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ModuleHeader } from '@/components/ModuleHeader';
import { Screen } from '@/components/Screen';
import { Card, ChoiceChip, Field, PrimaryButton } from '@/components/ui';
import { addBottle } from '@/db/api';
import { db } from '@/db/client';
import { bottleFeeds, type MilkType } from '@/db/schema';
import { useBaby } from '@/hooks/use-baby';
import { formatTime, nowIso, parseDecimal, startOfLocalDay } from '@/lib/dates';
import { milkLabel } from '@/lib/labels';
import { colors } from '@/theme';

export default function BottleScreen() {
  const baby = useBaby();
  const babyId = baby?.id ?? '';
  const [milkType, setMilkType] = useState<MilkType>('BREAST_MILK');
  const [amount, setAmount] = useState('');

  const { data: feedsRaw } = useLiveQuery(
    db
      .select()
      .from(bottleFeeds)
      .where(and(eq(bottleFeeds.babyId, babyId), isNull(bottleFeeds.deletedAt)))
      .orderBy(desc(bottleFeeds.fedAt)),
    [babyId],
  );
  const feeds = feedsRaw ?? [];

  const todayStart = startOfLocalDay().toISOString();
  const today = feeds.filter((row) => row.fedAt >= todayStart);
  const todayMl = today.reduce((sum, row) => sum + row.amountMl, 0);

  const save = () => {
    const ml = parseDecimal(amount);
    if (!babyId || ml === null || ml <= 0) return;
    addBottle(babyId, milkType, Math.round(ml), nowIso());
    setAmount('');
  };

  return (
    <Screen scroll>
      <ModuleHeader title="Biberon" />
      <Card>
        <Text style={styles.blockTitle}>Nouveau biberon</Text>
        <View style={styles.row}>
          {(['BREAST_MILK', 'FORMULA'] as const).map((type) => (
            <ChoiceChip
              key={type}
              label={milkLabel[type]}
              selected={milkType === type}
              onPress={() => setMilkType(type)}
            />
          ))}
        </View>
        <Field label="Quantité (ml)" value={amount} onChangeText={setAmount} placeholder="120" />
        <PrimaryButton label="Enregistrer" onPress={save} disabled={!amount} />
      </Card>

      <Card>
        <Text style={styles.blockTitle}>Aujourd’hui · {todayMl} ml</Text>
        {today.map((row) => (
          <View key={row.id} style={styles.item}>
            <Text style={styles.time}>{formatTime(row.fedAt)}</Text>
            <Text style={styles.meta}>
              {row.amountMl} ml · {milkLabel[row.milkType as MilkType]}
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
