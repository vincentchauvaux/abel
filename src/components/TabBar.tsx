import {
  CircleUser,
  Home,
  LayoutDashboard,
  LayoutGrid,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

export function AbelTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const onTools = current === 'tools';

  const go = (name: string) => {
    const route = state.routes.find((item) => item.name === name);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Pressable onPress={() => go('index')} style={styles.side} accessibilityRole="button">
        <LayoutDashboard
          color={current === 'index' ? colors.primary : colors.textMuted}
          size={24}
        />
        <Text style={[styles.label, current === 'index' && styles.labelActive]}>Dashboard</Text>
      </Pressable>

      <Pressable
        onPress={() => go(onTools ? 'index' : 'tools')}
        style={styles.centerWrap}
        accessibilityRole="button"
        accessibilityLabel={onTools ? 'Dashboard' : 'Outils'}>
        <View style={styles.center}>
          {onTools ? (
            <Home color="#FFFFFF" size={30} />
          ) : (
            <LayoutGrid color="#FFFFFF" size={30} />
          )}
        </View>
        <Text style={styles.centerLabel}>{onTools ? 'Dashboard' : 'Outils'}</Text>
      </Pressable>

      <Pressable onPress={() => go('profile')} style={styles.side} accessibilityRole="button">
        <CircleUser
          color={current === 'profile' ? colors.primary : colors.textMuted}
          size={24}
        />
        <Text style={[styles.label, current === 'profile' && styles.labelActive]}>Profil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    minHeight: 64,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.primary,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    marginTop: -28,
  },
  center: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  centerLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    paddingBottom: 4,
  },
});
