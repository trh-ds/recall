import Constants from 'expo-constants';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

import { logNotification } from '@/db';
import { consent } from '@/db/kv';

/** Android grants notification access only from Settings — there is no runtime prompt. */
export async function notificationAccess(): Promise<'authorized' | 'denied' | 'unknown'> {
  return RNAndroidNotificationListener.getPermissionStatus();
}

/** Opens the system "Notification access" list. The user toggles Recall on there. */
export function requestNotificationAccess() {
  RNAndroidNotificationListener.requestPermission();
}

type Payload = { app?: string; title?: string; text?: string; bigText?: string };

/**
 * Headless-JS entry for every posted notification (F4). Registered in `index.js`
 * because it must run with the app killed.
 *
 * Stores app + title + a text snippet locally so triage has something to classify.
 * Nothing is sent anywhere here — classification happens later, in the app, on the
 * snippet only (AGENT.md §8).
 */
export async function onNotificationPosted(taskData: { notification: string }) {
  if (!consent.granted()) return; // golden rule 4: no processing before consent
  let n: Payload;
  try {
    n = JSON.parse(taskData?.notification ?? '{}');
  } catch {
    return;
  }
  // Our own briefings/reminders would otherwise feed themselves back in.
  if (!n.app || n.app === Constants.expoConfig?.android?.package) return;
  logNotification({
    app: n.app,
    title: n.title ?? null,
    body: (n.text || n.bigText || '').slice(0, 500),
  });
}
