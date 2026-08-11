import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  addDeadline,
  addNote,
  type ClassSlot,
  db,
  getNextClass,
  listDeadlines,
  searchNotes,
} from '@/db';

/** Build a Date on the next given weekday at a given time — no calendar trivia needed. */
function dayAt(weekday: number, hour: number, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  d.setHours(hour, min, 0, 0);
  return d;
}

/**
 * Self-check for the storage layer. Reads/writes only rows it creates and deletes
 * them again — it never touches real user data.
 */
function checks(): string[] {
  const out: string[] = [];
  const ok = (name: string, pass: boolean) => out.push(`${pass ? 'PASS' : 'FAIL'}  ${name}`);

  // Migration ran: every table is queryable.
  try {
    for (const t of ['notes', 'deadlines', 'classes', 'notifications', 'events']) {
      db.getFirstSync(`SELECT * FROM ${t} LIMIT 1`);
    }
    ok('migration: all tables exist', true);
  } catch (e) {
    ok(`migration: ${e instanceof Error ? e.message : String(e)}`, false);
  }

  // getNextClass — pure, fixture-driven, covers the week wraparound.
  const slot = (id: number, weekday: number, start_min: number): ClassSlot => ({
    id,
    course: `C${id}`,
    weekday,
    start_min,
    end_min: start_min + 60,
    room: null,
  });
  const week = [slot(1, 1, 540), slot(2, 3, 840), slot(3, 5, 600)]; // Mon 9:00, Wed 14:00, Fri 10:00
  ok('nextClass: before today’s class', getNextClass(dayAt(1, 8), week)?.id === 1);
  ok('nextClass: after today’s class', getNextClass(dayAt(1, 10), week)?.id === 2);
  ok('nextClass: wraps past end of week', getNextClass(dayAt(5, 11), week)?.id === 1);
  ok('nextClass: empty timetable', getNextClass(dayAt(1, 8), []) === null);

  // Note round-trip + LIKE-wildcard escaping.
  const marker = `selfcheck-${Date.now()}`;
  const noteId = addNote(`${marker} abc`, 'test');
  ok('notes: insert + keyword search', searchNotes(marker).some((n) => n.id === noteId));
  ok('notes: `_` is literal, not a wildcard', searchNotes(`${marker} a_c`).length === 0);
  db.runSync('DELETE FROM notes WHERE id = ?', [noteId]);
  ok('notes: cleaned up', searchNotes(marker).length === 0);

  // Deadline round-trip: open list is due-ascending and excludes done.
  const soon = addDeadline(`${marker} soon`, Date.now() + 3600_000);
  const later = addDeadline(`${marker} later`, Date.now() + 7200_000);
  const open = listDeadlines().filter((d) => d.title.startsWith(marker));
  ok('deadlines: sorted by due date', open[0]?.id === soon && open[1]?.id === later);
  db.runSync('DELETE FROM deadlines WHERE title LIKE ?', [`${marker}%`]);
  ok('deadlines: cleaned up', listDeadlines().every((d) => !d.title.startsWith(marker)));

  return out;
}

export default function DbTestScreen() {
  const results = checks();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">DB self-check</ThemedText>
          <ThemedText type="smallBold">
            {failed === 0 ? `All ${results.length} checks passed` : `${failed} FAILED`}
          </ThemedText>
          {results.map((r) => (
            <ThemedText key={r} type="code" themeColor={r.startsWith('FAIL') ? 'text' : 'textSecondary'}>
              {r}
            </ThemedText>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.one, padding: Spacing.three },
});
