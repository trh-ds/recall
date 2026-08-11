import { MMKV } from 'react-native-mmkv';

/** Settings, flags, consent state. Small + hot data only — structured data goes in SQLite. */
export const kv = new MMKV({ id: 'recall' });

const CONSENT_GRANTED = 'consent.granted';
const CONSENT_AT = 'consent.at';

/**
 * DPDP consent gate (AGENT.md §8). Nothing may be read, stored, or sent to an
 * LLM provider until `granted()` is true.
 */
export const consent = {
  granted: () => kv.getBoolean(CONSENT_GRANTED) ?? false,
  grantedAt: () => kv.getNumber(CONSENT_AT),
  grant() {
    kv.set(CONSENT_GRANTED, true);
    kv.set(CONSENT_AT, Date.now());
  },
  /** Clears the flag only — use `deleteAllData()` to also purge stored data. */
  clear() {
    kv.delete(CONSENT_GRANTED);
    kv.delete(CONSENT_AT);
  },
};

/** Every key/value as plain JSON, for the data export. */
export function kvSnapshot(): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const key of kv.getAllKeys()) {
    const value = kv.getString(key) ?? kv.getNumber(key) ?? kv.getBoolean(key);
    if (value !== undefined) out[key] = value;
  }
  return out;
}
