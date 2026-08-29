import { type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'accent' | 'danger' | 'muted';
}) {
  const background =
    tone === 'accent'
      ? colors.accent
      : tone === 'danger'
        ? colors.danger
        : tone === 'muted'
          ? colors.surfaceMuted
          : colors.primary;
  const textColor = tone === 'muted' ? colors.text : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.primary, { backgroundColor: background, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={[styles.primaryLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function BigAction({
  label,
  icon: Icon,
  onPress,
  color = colors.primary,
}: {
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.big, { borderColor: color }]}>
      {Icon ? <Icon color={color} size={28} /> : null}
      <Text style={[styles.bigLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  keyboardType = 'decimal-pad',
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'decimal-pad' | 'number-pad' | 'default';
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  primary: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipLabel: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
  big: {
    flex: 1,
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  bigLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textMuted,
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
