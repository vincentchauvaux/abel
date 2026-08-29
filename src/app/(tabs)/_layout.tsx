import { Tabs } from 'expo-router';

import { AbelTabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AbelTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="tools" options={{ title: 'Outils' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
