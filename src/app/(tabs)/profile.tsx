import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';

import { Screen } from '@/components/Screen';
import { Card, PrimaryButton } from '@/components/ui';
import { renameBaby } from '@/db/api';
import { useBaby } from '@/hooks/use-baby';
import { getSessionEmail, isGoogleConfigured, signInWithGoogle, signOut } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { syncNow } from '@/lib/sync';
import { colors, radius, spacing } from '@/theme';

export default function ProfileScreen() {
  const baby = useBaby();
  const [name, setName] = useState(baby?.name ?? '');
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (baby?.name) setName(baby.name);
  }, [baby?.name]);

  useEffect(() => {
    getSessionEmail().then(setEmail).catch(() => setEmail(null));
  }, []);

  const saveName = () => {
    if (!baby) return;
    renameBaby(baby.id, name);
  };

  const connect = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await signInWithGoogle();
      setEmail(await getSessionEmail());
      setStatus('Connectée.');
    } catch (error) {
      Alert.alert('Connexion', error instanceof Error ? error.message : 'Échec de la connexion');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await signOut();
      setEmail(null);
      setStatus('Déconnectée.');
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await syncNow();
      setStatus('Synchronisation terminée.');
    } catch (error) {
      Alert.alert('Sync', error instanceof Error ? error.message : 'Échec de la sync');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Profil</Text>
      <Card>
        <Text style={styles.label}>Prénom du bébé</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          style={styles.input}
          placeholder="Bébé"
          placeholderTextColor={colors.textMuted}
        />
      </Card>

      <Card>
        <Text style={styles.label}>Compte</Text>
        <Text style={styles.muted}>
          {email ?? 'Pas encore connectée. Les données restent sur cet appareil.'}
        </Text>
        {email ? (
          <PrimaryButton label="Se déconnecter" onPress={disconnect} disabled={busy} tone="muted" />
        ) : (
          <PrimaryButton label="Continuer avec Google" onPress={connect} disabled={busy} />
        )}
        <PrimaryButton label="Synchroniser" onPress={sync} disabled={busy} tone="accent" />
        {status ? <Text style={styles.status}>{status}</Text> : null}
        {!(isSupabaseConfigured() && isGoogleConfigured()) ? (
          <Text style={styles.hint}>
            Pour activer Google et la sync, copie .env.example vers .env, renseigne Supabase et les
            identifiants Google, puis fais un development build EAS (pas Expo Go).
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  label: {
    fontWeight: '700',
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  status: {
    color: colors.accent,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.text,
  },
});
