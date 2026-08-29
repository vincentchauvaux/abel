import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { initDatabase } from '@/db/init';
import '@/lib/notifications';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(async () => {
        setReady(true);
        await SplashScreen.hideAsync();
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur de base locale');
      });
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="feeding" />
        <Stack.Screen name="bottle" />
        <Stack.Screen name="diapers" />
        <Stack.Screen name="pumping" />
        <Stack.Screen name="growth" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: 24,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 16,
  },
});
