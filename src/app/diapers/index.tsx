import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ModuleHeader } from '@/components/ModuleHeader';
import { Screen } from '@/components/Screen';
import { BigAction, Card, ChoiceChip, PrimaryButton } from '@/components/ui';
import { addDiaper, deleteDiaper, updateDiaper } from '@/db/api';
import { db } from '@/db/client';
import { diaperEvents, type DiaperKind } from '@/db/schema';
import { useBaby } from '@/hooks/use-baby';
import { formatTime, startOfLocalDay } from '@/lib/dates';
import { diaperLabel } from '@/lib/labels';
import { colors, radius, spacing } from '@/theme';

export default function DiapersScreen() {
  const baby = useBaby();
  const babyId = baby?.id ?? '';
  const [editing, setEditing] = useState<string | null>(null);

  const { data: eventsRaw } = useLiveQuery(
    db
      .select()
      .from(diaperEvents)
      .where(and(eq(diaperEvents.babyId, babyId), isNull(diaperEvents.deletedAt)))
      .orderBy(desc(diaperEvents.occurredAt)),
    [babyId],
  );
  const events = eventsRaw ?? [];

  const todayStart = startOfLocalDay().toISOString();
  const today = events.filter((row) => row.occurredAt >= todayStart);
  const selected = events.find((row) => row.id === editing);

  const log = (kind: DiaperKind) => {
    if (!babyId) return;
    addDiaper(babyId, kind);
  };

  return (
    <Screen scroll>
      <ModuleHeader title="Couche" />
      <View style={styles.actions}>
        <BigAction label="Pipi" onPress={() => log('PEE')} color={colors.pee} />
        <BigAction label="Caca" onPress={() => log('POO')} color={colors.poo} />
      </View>
      <BigAction label="Les deux" onPress={() => log('BOTH')} />

      <Card>
        <Text style={styles.blockTitle}>Aujourd’hui · {today.length}</Text>
        {today.length === 0 ? (
          <Text style={styles.muted}>Un appui enregistre l’heure tout de suite.</Text>
        ) : (
          today.map((row) => (
            <Pressable key={row.id} onPress={() => setEditing(row.id)} style={styles.row}>
              <Text style={styles.time}>{formatTime(row.occurredAt)}</Text>
              <Text style={styles.kind}>{diaperLabel[row.kind as DiaperKind]}</Text>
            </Pressable>
          ))
        )}
      </Card>

      <Modal visible={Boolean(selected)} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.blockTitle}>Modifier</Text>
            <View style={styles.chips}>
              {(['PEE', 'POO', 'BOTH'] as const).map((kind) => (
                <ChoiceChip
                  key={kind}
                  label={diaperLabel[kind]}
                  selected={selected?.kind === kind}
                  onPress={() => selected && updateDiaper(selected.id, kind)}
                />
              ))}
            </View>
            <PrimaryButton
              label="Supprimer"
              tone="danger"
              onPress={() => {
                if (!selected) return;
                Alert.alert('Supprimer cette couche ?', undefined, [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                      deleteDiaper(selected.id);
                      setEditing(null);
                    },
                  },
                ]);
              }}
            />
            <PrimaryButton label="Fermer" tone="muted" onPress={() => setEditing(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  time: {
    fontWeight: '700',
    color: colors.text,
  },
  kind: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
