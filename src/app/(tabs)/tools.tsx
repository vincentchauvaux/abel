import { useState } from 'react';
import { Apple, Heart, Milk, Pill } from 'lucide-react-native';
import { Droplets, Moon, NotebookPen, Scale, Thermometer } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ToolGrid, ToolsSwitch, type ToolItem } from '@/components/Tools';
import { colors, spacing } from '@/theme';

const APPORTS: ToolItem[] = [
  { key: 'feeding', label: 'Allaitement', icon: Heart, href: '/feeding' },
  { key: 'bottle', label: 'Biberon', icon: Milk, href: '/bottle' },
  { key: 'solids', label: 'Diversification', icon: Apple, soon: true },
  { key: 'supplements', label: 'Compléments', icon: Pill, soon: true },
];

const SUIVI: ToolItem[] = [
  { key: 'diapers', label: 'Couche', icon: Droplets, href: '/diapers' },
  { key: 'pumping', label: 'Tire-lait', icon: Milk, href: '/pumping' },
  { key: 'growth', label: 'Croissance', icon: Scale, href: '/growth' },
  { key: 'sleep', label: 'Sommeil', icon: Moon, soon: true },
  { key: 'temp', label: 'Température', icon: Thermometer, soon: true },
  { key: 'notes', label: 'Notes', icon: NotebookPen, soon: true },
];

export default function ToolsScreen() {
  const [section, setSection] = useState<'apports' | 'suivi'>('apports');

  return (
    <Screen scroll>
      <Text style={styles.title}>Outils</Text>
      <ToolsSwitch value={section} onChange={setSection} />
      <Text style={styles.hint}>
        {section === 'apports' ? 'Ce que l’on donne' : 'Ce que l’on observe'}
      </Text>
      <ToolGrid items={section === 'apports' ? APPORTS : SUIVI} />
      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  hint: {
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
});
