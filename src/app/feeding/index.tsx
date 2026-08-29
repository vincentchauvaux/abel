import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ModuleHeader } from '@/components/ModuleHeader';
import { Screen } from '@/components/Screen';
import { Card, ChoiceChip, PrimaryButton } from '@/components/ui';
import { db } from '@/db/client';
import {
  lastEndedFeeding,
  startFeeding,
  stopFeeding,
  switchFeedingSide,
  upsertReminderRule,
} from '@/db/api';
import { feedingSegments, feedingSessions, reminderRules, type Side } from '@/db/schema';
import { useBaby } from '@/hooks/use-baby';
import { useNow } from '@/hooks/use-now';
import { elapsedMs, formatDuration, formatMinutes, formatTime, startOfLocalDay } from '@/lib/dates';
import { sideLabel } from '@/lib/labels';
import { rescheduleFeedingReminder } from '@/lib/notifications';
import { colors, radius, spacing } from '@/theme';

const SIDES: Side[] = ['LEFT', 'RIGHT', 'BOTH'];
const PRESETS = [
  { label: 'Aucun', minutes: 0 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
];

export default function FeedingScreen() {
  const baby = useBaby();
  const babyId = baby?.id ?? '';
  const [custom, setCustom] = useState('');

  const { data: sessionsRaw } = useLiveQuery(
    db
      .select()
      .from(feedingSessions)
      .where(and(eq(feedingSessions.babyId, babyId), isNull(feedingSessions.deletedAt)))
      .orderBy(desc(feedingSessions.startedAt)),
    [babyId],
  );
  const { data: segmentsRaw } = useLiveQuery(
    db.select().from(feedingSegments).where(isNull(feedingSegments.deletedAt)),
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
  const segments = segmentsRaw ?? [];
  const rules = rulesRaw ?? [];

  const active = sessions.find((row) => !row.endedAt);
  const now = useNow(Boolean(active));
  const activeSegments = segments.filter((row) => row.feedingSessionId === active?.id);
  const openSegment = activeSegments.find((row) => !row.endedAt);
  const delay = rules[0]?.delayMinutes ?? 0;

  const sideMs = (side: Side) =>
    activeSegments
      .filter((row) => row.side === side)
      .reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt, now), 0);

  const todayStart = startOfLocalDay().toISOString();
  const todaySessions = sessions.filter((row) => row.startedAt >= todayStart);
  const todayMs = todaySessions.reduce((sum, row) => sum + elapsedMs(row.startedAt, row.endedAt, now), 0);

  const onStart = (side: Side) => {
    if (!babyId) return;
    startFeeding(babyId, side);
  };

  const onStop = async () => {
    if (!active) return;
    const endedAt = stopFeeding(active.id);
    await rescheduleFeedingReminder(endedAt, delay);
  };

  const setDelay = async (minutes: number) => {
    if (!babyId) return;
    upsertReminderRule(babyId, minutes);
    const last = lastEndedFeeding(babyId);
    if (last?.endedAt) await rescheduleFeedingReminder(last.endedAt, minutes);
  };

  return (
    <Screen scroll>
      <ModuleHeader title="Allaitement" />

      <Card>
        {active ? (
          <>
            <Text style={styles.timer}>
              {formatDuration(elapsedMs(active.startedAt, active.endedAt, now))}
            </Text>
            <Text style={styles.caption}>Début {formatTime(active.startedAt)}</Text>
            <View style={styles.sides}>
              {(['LEFT', 'RIGHT'] as const).map((side) => (
                <Text key={side} style={styles.sideTime}>
                  {sideLabel[side]} {formatDuration(sideMs(side))}
                </Text>
              ))}
            </View>
            <View style={styles.row}>
              {SIDES.map((side) => (
                <ChoiceChip
                  key={side}
                  label={sideLabel[side]}
                  selected={openSegment?.side === side}
                  onPress={() => switchFeedingSide(active.id, side)}
                />
              ))}
            </View>
            <PrimaryButton label="Terminer" onPress={onStop} />
          </>
        ) : (
          <>
            <Text style={styles.caption}>Choisis un côté, puis appuie pour démarrer.</Text>
            <View style={styles.row}>
              {SIDES.map((side) => (
                <Pressable key={side} onPress={() => onStart(side)} style={styles.start}>
                  <Text style={styles.startLabel}>{sideLabel[side]}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.blockTitle}>Aujourd’hui</Text>
        <Text style={styles.today}>
          {todaySessions.length} tétées · {formatMinutes(todayMs)}
        </Text>
        {todaySessions.map((session) => (
          <View key={session.id} style={styles.historyRow}>
            <Text style={styles.historyTime}>{formatTime(session.startedAt)}</Text>
            <Text style={styles.historyMeta}>
              {formatDuration(elapsedMs(session.startedAt, session.endedAt, now))}
              {session.endedAt ? '' : ' · en cours'}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.blockTitle}>Rappel après la dernière tétée</Text>
        <View style={styles.row}>
          {PRESETS.map((item) => (
            <ChoiceChip
              key={item.minutes}
              label={item.label}
              selected={delay === item.minutes}
              onPress={() => setDelay(item.minutes)}
            />
          ))}
        </View>
        <Text style={styles.caption}>Personnalisé (minutes)</Text>
        <View style={styles.customRow}>
          <TextInput
            value={custom}
            onChangeText={setCustom}
            keyboardType="number-pad"
            placeholder="ex. 150"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <PrimaryButton
            label="OK"
            onPress={() => {
              const n = Number.parseInt(custom, 10);
              if (Number.isFinite(n) && n >= 0) setDelay(n);
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
  },
  caption: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  sides: {
    gap: 4,
    alignItems: 'center',
  },
  sideTime: {
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  start: {
    flex: 1,
    minHeight: 72,
    minWidth: 90,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  blockTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text,
  },
  today: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTime: {
    fontWeight: '600',
    color: colors.text,
  },
  historyMeta: {
    color: colors.textMuted,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.text,
  },
});
