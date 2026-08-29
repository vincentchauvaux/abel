import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, hitSlop, spacing } from '@/theme';

export function ModuleHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.back()} hitSlop={hitSlop} style={styles.back}>
        <ChevronLeft color={colors.text} size={28} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
});
