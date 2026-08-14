import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import { askThen } from './permissions';

const CHANNEL = 'recall';
const BRIEFING_ID = 'daily-briefing';

/** A reminder that fires while the app is open is still a reminder — show it. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotifications(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Briefings & reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  if ((await Notifications.getPermissionsAsync()).granted) return true;
  const res = await askThen(
    'Recall delivers your morning briefing and deadline countdowns as notifications. They are built on your phone — nothing is sent anywhere to create them.',
    () => Notifications.requestPermissionsAsync(),
  );
  return res?.granted ?? false;
}

/**
 * The daily briefing (F1).
 * ponytail: a repeating local alarm, not a background task. Android OEMs — HyperOS
 * above all — kill background work, but an alarm survives; and `expo-background-task`
 * can't promise a 7am slot anyway. Cost: the body is written when it's scheduled, so
 * re-run this on every app open to keep it at most a day stale. Swap to a background
 * task only if same-morning freshness turns out to matter.
 */
export async function scheduleDailyBriefing(body: string, hour = 7, minute = 30) {
  if (!(await ensureNotifications())) return null;
  return Notifications.scheduleNotificationAsync({
    identifier: BRIEFING_ID,
    content: { title: 'Your day at a glance', body },
    trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
}

/** Countdown nudge before a deadline (F2). Stable id, so re-scheduling replaces. */
export async function scheduleDeadlineReminder(
  id: number,
  title: string,
  dueAt: number,
  hoursBefore = 6,
) {
  const at = dueAt - hoursBefore * 3600_000;
  if (at <= Date.now()) return null; // already past — don't fire an alarm in the user's face
  if (!(await ensureNotifications())) return null;
  return Notifications.scheduleNotificationAsync({
    identifier: `deadline-${id}`,
    content: { title, body: `Due in ${hoursBefore}h` },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
  });
}

export const cancelDeadlineReminder = (id: number) =>
  Notifications.cancelScheduledNotificationAsync(`deadline-${id}`);

/**
 * A focus block the user approved through the autonomy gate (AGENT.md §7).
 * ponytail: it nudges at the start time; it does not write to the device calendar.
 * A calendar write needs the write permission and a chosen target calendar — add
 * `Calendar.createEventAsync` when the sheet can offer that choice.
 */
export async function scheduleFocusBlock(deadlineId: number, title: string, startAt: number) {
  if (startAt <= Date.now()) return null;
  if (!(await ensureNotifications())) return null;
  return Notifications.scheduleNotificationAsync({
    identifier: `focus-${deadlineId}`,
    content: { title: 'Focus block starts now', body: title },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: startAt, channelId: CHANNEL },
  });
}

export const cancelFocusBlock = (deadlineId: number) =>
  Notifications.cancelScheduledNotificationAsync(`focus-${deadlineId}`);

export const scheduledNotifications = () => Notifications.getAllScheduledNotificationsAsync();

export const cancelAllNotifications = () => Notifications.cancelAllScheduledNotificationsAsync();
