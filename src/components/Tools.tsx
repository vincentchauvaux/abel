import { type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { colors, radius, spacing } from '@/theme';

export type ToolItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: Href;
  soon?: boolean;
};

export function ToolsSwitch({
  value,
  onChange,
}: {
  value: 'apports' | 'suivi';
  onChange: (value: 'apports' | 'suivi') => void;
}) {
  return (
    <View style={styles.switch}>
      {(['apports', 'suivi'] as const).map((item) => {
        const selected = value === item;
        return (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={[styles.switchItem, selected && styles.switchItemActive]}>
            <Text style={[styles.switchLabel, selected && styles.switchLabelActive]}>
              {item === 'apports' ? 'Apports' : 'Suivi'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToolGrid({ items }: { items: ToolItem[] }) {
  const router = useRouter();
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Pressable
            key={item.key}
            disabled={item.soon}
            onPress={() => {
              if (item.href) router.push(item.href);
            }}
            style={[styles.tile, item.soon && styles.tileSoon]}>
            <View style={styles.iconWrap}>
              <Icon color={item.soon ? colors.textMuted : colors.primary} size={32} />
            </View>
            <Text style={[styles.tileLabel, item.soon && styles.soonText]}>{item.label}</Text>
            {item.soon ? <Text style={styles.soon}>bientôt</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
  },
  switchItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  switchItemActive: {
    backgroundColor: colors.surface,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  switchLabelActive: {
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    width: '47%',
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tileSoon: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  soon: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  soonText: {
    color: colors.textMuted,
  },
});
