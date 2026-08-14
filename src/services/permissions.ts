import { Alert, Linking } from 'react-native';

import { consent } from '@/db/kv';

/**
 * Plain-language rationale immediately before the OS prompt (AGENT.md §8), and
 * nothing at all before DPDP consent (golden rule 4).
 *
 * Returns `null` when the user declined *or* consent isn't granted — callers
 * treat both the same: the capability simply isn't available.
 */
export async function askThen<T>(why: string, request: () => Promise<T>): Promise<T | null> {
  if (!consent.granted()) return null;
  const agreed = await new Promise<boolean>((resolve) =>
    Alert.alert('One permission needed', why, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ], { cancelable: false }),
  );
  return agreed ? request() : null;
}

/** For permissions Android only grants from Settings (notification access). */
export const openSettings = () => Linking.openSettings();
