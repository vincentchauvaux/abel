import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_ID = 'abel-feeding-reminder';

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('abel', {
      name: 'Abel',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return asked.granted;
}

export async function rescheduleFeedingReminder(endedAtIso: string, delayMinutes: number) {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => undefined);

  if (delayMinutes <= 0) return;

  const fireAt = new Date(endedAtIso);
  fireAt.setMinutes(fireAt.getMinutes() + delayMinutes);
  if (fireAt.getTime() <= Date.now()) return;

  const ok = await ensureNotificationPermission();
  if (!ok) return;

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'Abel',
      body: 'Rappel tétée',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: 'abel',
    },
  });
}

export function nextReminderIso(endedAtIso: string | null | undefined, delayMinutes: number): string | null {
  if (!endedAtIso || delayMinutes <= 0) return null;
  const fireAt = new Date(endedAtIso);
  fireAt.setMinutes(fireAt.getMinutes() + delayMinutes);
  if (fireAt.getTime() <= Date.now()) return null;
  return fireAt.toISOString();
}
