import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Introuvable', headerShown: true }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>Page introuvable</Text>
        <Link href="/" style={styles.link}>
          Retour au dashboard
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
