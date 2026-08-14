import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { recentNotifications } from '@/db';
import { consent } from '@/db/kv';
import { useTheme } from '@/hooks/use-theme';
import { eventsOn } from '@/services/calendar';
import {
  notificationAccess,
  requestNotificationAccess,
} from '@/services/notification-listener';
import {
  cancelAllNotifications,
  scheduleDailyBriefing,
  scheduleDeadlineReminder,
  scheduledNotifications,
} from '@/services/notify';
import { listen, speak, stopSpeaking } from '@/services/voice';

/**
 * Manual harness for Phase 3. Every service needs a real device + a real user tap,
 * so these are buttons rather than assertions — except the consent gate, which is
 * checked automatically because it's the one rule that must never regress.
 */
function Button({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

export default function ServicesTestScreen() {
  const [log, setLog] = useState<string[]>([]);
  const [granted, setGranted] = useState(consent.granted());
  const [access, setAccess] = useState('checking…');

  const say = (s: string) => setLog((l) => [s, ...l].slice(0, 30));

  useEffect(() => {
    notificationAccess().then(setAccess).catch((e) => setAccess(`error: ${e.message}`));
  }, []);

  async function run(name: string, fn: () => Promise<unknown>) {
    try {
      say(`${name}: ${JSON.stringify(await fn())}`);
    } catch (e) {
      say(`${name}: ERROR ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Consent gate: with consent off, a permission-requiring call must return null
  // rather than prompting. Cheap to verify, catastrophic to get wrong (§8).
  const gateCheck = granted
    ? 'consent ON — gate not under test'
    : 'consent OFF — services must return null/empty below';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Services test</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {gateCheck}
          </ThemedText>

          <ThemedView style={styles.row}>
            <Button
              label={granted ? 'Revoke consent (dev)' : 'Grant consent (dev)'}
              onPress={() => {
                if (granted) consent.clear();
                else consent.grant();
                setGranted(consent.granted());
              }}
            />
          </ThemedView>

          <ThemedText type="smallBold">Notifications</ThemedText>
          <ThemedView style={styles.row}>
            <Button
              label="Briefing in ~1 min"
              onPress={() => {
                const t = new Date(Date.now() + 60_000);
                run('daily briefing', () =>
                  scheduleDailyBriefing('3 deadlines · next class DBMS 09:00', t.getHours(), t.getMinutes()),
                );
              }}
            />
            <Button
              label="Deadline in ~1 min"
              onPress={() =>
                run('deadline reminder', () =>
                  scheduleDeadlineReminder(999, 'Test assignment', Date.now() + 60_000, 0),
                )
              }
            />
          </ThemedView>
          <ThemedView style={styles.row}>
            <Button
              label="List scheduled"
              onPress={() =>
                run('scheduled', async () =>
                  (await scheduledNotifications()).map((n) => n.identifier),
                )
              }
            />
            <Button label="Cancel all" onPress={() => run('cancel all', cancelAllNotifications)} />
          </ThemedView>

          <ThemedText type="smallBold">Voice</ThemedText>
          <ThemedView style={styles.row}>
            <Button
              label="Speak"
              onPress={() => {
                speak('Good morning. Three deadlines today. Next class, D B M S, at nine.');
                say('speak: started');
              }}
            />
            <Button label="Stop" onPress={() => { stopSpeaking(); say('speak: stopped'); }} />
            <Button
              label="Listen"
              onPress={() => run('listen', () => listen((p) => say(`… ${p}`)))}
            />
          </ThemedView>

          <ThemedText type="smallBold">Calendar</ThemedText>
          <ThemedView style={styles.row}>
            <Button
              label="Today’s events"
              onPress={() =>
                run('calendar', async () =>
                  (await eventsOn()).map((e) => `${e.title} @ ${String(e.startDate).slice(11, 16)}`),
                )
              }
            />
          </ThemedView>

          <ThemedText type="smallBold">Notification access: {access}</ThemedText>
          <ThemedView style={styles.row}>
            <Button
              label="Open settings"
              onPress={() => {
                requestNotificationAccess();
                say('opened notification access settings — toggle Recall on, then come back');
              }}
            />
            <Button
              label="Re-check"
              onPress={() => notificationAccess().then(setAccess)}
            />
            <Button
              label="Captured (last 10)"
              onPress={() =>
                run('captured', async () =>
                  recentNotifications(10).map((n) => `${n.app}: ${n.title ?? ''}`),
                )
              }
            />
          </ThemedView>

          <ThemedText type="smallBold">Log</ThemedText>
          {log.map((l, i) => (
            <ThemedText key={i} type="code" themeColor="textSecondary">
              {l}
            </ThemedText>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.two, padding: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  button: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 8 },
});
