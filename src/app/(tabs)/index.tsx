import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { type ReactNode, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { Screen } from '@/components/Screen';
import { Card, ChoiceChip } from '@/components/ui';
import { db } from '@/db/client';
import {
  bottleFeeds,
  diaperEvents,
  feedingSessions,
  measurements,
  pumpingSessions,
  reminderRules,
} from '@/db/schema';
import { useBaby } from '@/hooks/use-baby';
import {
  eachLocalDay,
  elapsedMs,
  formatDateTime,
  formatMinutes,
  formatTime,
  localDateKey,
  periodRange,
  weekdayShort,
  type Period,
} from '@/lib/dates';
import { nextReminderIso } from '@/lib/notifications';
import { colors, spacing } from '@/theme';

const CHART_WIDTH = Dimensions.get('window').width - 64;

export default function DashboardScreen() {
  const baby = useBaby();
  const babyId = baby?.id ?? '';
  const [period, setPeriod] = useState<Period>('today');
  const from = periodRange(period).from;

  const { data: sessionsRaw } = useLiveQuery(
    db
      .select()
      .from(feedingSessions)
      .where(and(eq(feedingSessions.babyId, babyId), isNull(feedingSessions.deletedAt))),
    [babyId],
  );
  const { data: bottlesRaw } = useLiveQuery(
    db
      .select()
      .from(bottleFeeds)
      .where(and(eq(bottleFeeds.babyId, babyId), isNull(bottleFeeds.deletedAt))),
    [babyId],
  );
  const { data: diapersRaw } = useLiveQuery(
    db
      .select()
      .from(diaperEvents)
      .where(and(eq(diaperEvents.babyId, babyId), isNull(diaperEvents.deletedAt))),
    [babyId],
  );
  const { data: pumpsRaw } = useLiveQuery(
    db
      .select()
      .from(pumpingSessions)
      .where(and(eq(pumpingSessions.babyId, babyId), isNull(pumpingSessions.deletedAt))),
    [babyId],
  );
  const { data: weightsRaw } = useLiveQuery(
    db
      .select()
      .from(measurements)
      .where(
        and(
          eq(measurements.babyId, babyId),
          eq(measurements.type, 'WEIGHT'),
          isNull(measurements.deletedAt),
        ),
      ),
    [babyId],
  );
  const { data: rulesRaw } = useLiveQuery(
    db
      .select()
      .from(reminderRules)
      .where(and(eq(reminderRules.babyId, babyId), isNull(reminderRules.deletedAt)))
      .limit(1),
    [babyId],
  );

  const sessions = sessionsRaw ?? [];
  const bottles = bottlesRaw ?? [];
  const diapers = diapersRaw ?? [];
  const pumps = pumpsRaw ?? [];
  const weights = weightsRaw ?? [];
  const rules = rulesRaw ?? [];

  const inRange = <T extends { startedAt?: string; fedAt?: string; occurredAt?: string; measuredAt?: string }>(
    row: T,
    field: keyof T,
  ) => {
    const value = row[field];
    if (typeof value !== 'string') return false;
    return !from || value >= from;
  };

  const sessionsRange = sessions.filter((row) => inRange(row, 'startedAt'));
  const bottlesRange = bottles.filter((row) => inRange(row, 'fedAt'));
  const diapersRange = diapers.filter((row) => inRange(row, 'occurredAt'));
  const pumpsRange = pumps.filter((row) => inRange(row, 'startedAt'));

  const feedingMs = sessionsRange.reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0);
  const pumpedMl = pumpsRange.reduce((sum, row) => sum + (row.amountMl ?? 0), 0);

  const lastFeeding = [...sessions]
    .filter((row) => row.endedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const delay = rules[0]?.delayMinutes ?? 0;
  const nextReminder = nextReminderIso(lastFeeding?.endedAt, delay);

  const chartDays = useMemo(() => {
    const start =
      period === '30d' || period === 'all' ? periodRange('30d').from! : periodRange('7d').from!;
    return eachLocalDay(start);
  }, [period]);

  const feedingBars = chartDays.map((day) => ({
    label: weekdayShort(day),
    value: Math.round(
      sessions
        .filter((row) => localDateKey(row.startedAt) === day)
        .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt), 0) / 60_000,
    ),
    frontColor: colors.primary,
  }));

  const bottleBars = chartDays.map((day) => ({
    label: weekdayShort(day),
    value: bottles
      .filter((row) => localDateKey(row.fedAt) === day)
      .reduce((sum, row) => sum + row.amountMl, 0),
    frontColor: colors.accent,
  }));

  const diaperBars = chartDays.map((day) => ({
    label: weekdayShort(day),
    value: diapers.filter((row) => localDateKey(row.occurredAt) === day).length,
    frontColor: colors.pee,
  }));

  const weightPoints = [...weights]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((row) => ({
      value: row.value,
      label: weekdayShort(localDateKey(row.measuredAt)),
    }));

  return (
    <Screen scroll>
      <Text style={styles.hello}>Où en est {baby?.name ?? 'bébé'} ?</Text>
      <View style={styles.period}>
        {([
          ['today', 'Aujourd’hui'],
          ['7d', '7 jours'],
          ['30d', '30 jours'],
          ['all', 'Tout'],
        ] as const).map(([key, label]) => (
          <ChoiceChip key={key} label={label} selected={period === key} onPress={() => setPeriod(key)} />
        ))}
      </View>

      <View style={styles.cards}>
        <Stat title="Tétées" value={String(sessionsRange.length)} />
        <Stat title="Couches" value={String(diapersRange.length)} />
        <Stat title="Allaitement" value={formatMinutes(feedingMs)} />
        <Stat title="Tirage" value={`${pumpedMl} ml`} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Dernière tétée</Text>
        {lastFeeding ? (
          <>
            <Text style={styles.big}>{formatDateTime(lastFeeding.startedAt)}</Text>
            <Text style={styles.muted}>{formatMinutes(elapsedMs(lastFeeding.startedAt, lastFeeding.endedAt))}</Text>
          </>
        ) : (
          <Text style={styles.muted}>Pas encore de tétée enregistrée.</Text>
        )}
        <Text style={[styles.cardTitle, { marginTop: 8 }]}>Prochain rappel</Text>
        <Text style={styles.muted}>
          {nextReminder ? formatTime(nextReminder) : 'Aucun rappel programmé'}
        </Text>
      </Card>

      <ChartBlock title="Durée d’allaitement (min)">
        <BarChart
          data={feedingBars}
          width={CHART_WIDTH}
          barWidth={18}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axis}
          isAnimated
        />
      </ChartBlock>

      <ChartBlock title="Biberons (ml)">
        <BarChart
          data={bottleBars}
          width={CHART_WIDTH}
          barWidth={18}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axis}
          isAnimated
        />
      </ChartBlock>

      <ChartBlock title="Couches">
        <BarChart
          data={diaperBars}
          width={CHART_WIDTH}
          barWidth={18}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axis}
          isAnimated
        />
      </ChartBlock>

      <ChartBlock title="Poids (kg)">
        {weightPoints.length > 1 ? (
          <LineChart
            data={weightPoints}
            width={CHART_WIDTH}
            color={colors.accent}
            dataPointsColor={colors.accent}
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={styles.axis}
            xAxisLabelTextStyle={styles.axis}
            curved
            areaChart
            startFillColor={colors.accent}
            startOpacity={0.2}
            endOpacity={0.02}
          />
        ) : (
          <Text style={styles.muted}>Ajoute au moins deux pesées pour voir la courbe.</Text>
        )}
      </ChartBlock>
    </Screen>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ChartBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  hello: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  period: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statTitle: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 16,
  },
  big: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
  axis: {
    color: colors.textMuted,
    fontSize: 10,
  },
});
