import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { tagFor } from '@/components/voice-capture';
import { Spacing } from '@/constants/theme';
import type { ClassSlot, Deadline } from '@/db';
import {
  classCard,
  countdown,
  dueLabel,
  heroLines,
  phaseFor,
  suggestFocusBlock,
  urgency,
} from '@/features/briefing';

const HOUR = 3600_000;

const at = (hour: number, min = 0, dayOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d;
};

const deadline = (id: number, due: Date, title = `D${id}`): Deadline => ({
  id,
  title,
  course: null,
  due_at: due.getTime(),
  done: 0,
  created_at: 0,
});

const slot = (weekday: number, start_min: number, len = 60): ClassSlot => ({
  id: start_min,
  course: 'CS241',
  weekday,
  start_min,
  end_min: start_min + len,
  room: 'LT-4',
});

/** Pure checks for everything the briefing derives. No DB, no clock beyond `now`. */
function checks(): string[] {
  const out: string[] = [];
  const ok = (name: string, pass: boolean) => out.push(`${pass ? 'PASS' : 'FAIL'}  ${name}`);

  // countdown — two units, zero-padded hours, never a bare "0m"
  ok('countdown: overdue', countdown(-1) === 'overdue');
  ok('countdown: under an hour', countdown(5 * 60_000) === '5m');
  ok('countdown: rounds up to a minute', countdown(3_000) === '1m');
  ok('countdown: hours are padded', countdown(6 * HOUR + 12 * 60_000) === '06h 12m');
  ok('countdown: days drop minutes', countdown(39 * HOUR) === '1d 15h');

  // urgency bands
  ok('urgency: inside 12h is urgent', urgency(11 * HOUR) === 'urgent');
  ok('urgency: 13h is warn', urgency(13 * HOUR) === 'warn');
  ok('urgency: 3 days is calm', urgency(72 * HOUR) === 'calm');

  // phase
  ok('phase: 08:00 is morning', phaseFor(at(8)) === 'morning');
  ok('phase: 16:00 is evening', phaseFor(at(16)) === 'evening');

  // dueLabel
  ok('dueLabel: today', dueLabel(at(23, 59).getTime(), at(8)) === '23:59 today');
  ok('dueLabel: tomorrow', dueLabel(at(23, 59, 1).getTime(), at(8)) === '23:59 tomorrow');
  ok('dueLabel: further out names the day', /^[A-Z][a-z]{2} 23:59$/.test(dueLabel(at(23, 59, 3).getTime(), at(8))));

  // hero lines
  const now = at(8);
  const week = [deadline(1, at(23, 59)), deadline(2, at(18, 0, 2)), deadline(3, at(9, 0, 4))];
  ok('hero: morning counts the week', heroLines('morning', week, now)[0] === 'Three deadlines this week.');
  ok('hero: morning counts today', heroLines('morning', week, now)[1] === 'One lands today.');
  ok('hero: morning with nothing due', heroLines('morning', [], now)[0] === 'Nothing needs you');
  ok(
    'hero: morning with nothing today',
    heroLines('morning', [deadline(1, at(9, 0, 3))], now)[1] === 'None land today.',
  );
  const evening = at(20);
  ok(
    'hero: evening counts what slipped',
    heroLines('evening', [deadline(1, at(18)), deadline(2, at(23, 59))], evening)[0] ===
      'Two things slipped today.',
  );
  ok(
    'hero: evening flags what is still fixable',
    heroLines('evening', [deadline(1, at(18)), deadline(2, at(23, 59))], evening)[1] ===
      'One is still fixable.',
  );
  ok('hero: evening with a clean day', heroLines('evening', [], evening)[1] === 'Nothing slipped.');

  // classCard — a weekly slot resolved against a real clock
  const today = at(9).getDay();
  const soon = classCard(slot(today, 10 * 60), at(9));
  ok('classCard: time of day', soon?.at === '10:00');
  ok('classCard: room and countdown', soon?.detail === 'LT-4 · in 01h 00m');
  ok('classCard: today is today', soon?.isToday === true);
  const wrapped = classCard(slot(today, 8 * 60), at(9));
  ok('classCard: a past slot wraps to next week', wrapped?.isToday === false);
  ok('classCard: no timetable', classCard(null, at(9)) === null);

  // suggestFocusBlock
  const due = deadline(1, at(23, 59, 1), 'OS assignment 2 — write-up');
  const pick = suggestFocusBlock([due], [], at(9));
  ok('suggest: takes the latest evening slot', pick?.headline.startsWith('Block 21:00–23:00') === true);
  ok('suggest: trims the title at the dash', pick?.headline.endsWith('for OS assignment 2') === true);
  const busy = suggestFocusBlock([due], [slot(at(9).getDay(), 22 * 60, 60)], at(9));
  ok('suggest: steps back around a class', busy?.headline.startsWith('Block 20:00–22:00') === true);
  ok('suggest: nothing due inside a day', suggestFocusBlock([deadline(2, at(9, 0, 4))], [], at(9)) === null);
  ok(
    'suggest: block must finish before the deadline',
    suggestFocusBlock([deadline(3, at(21, 30))], [], at(9))?.headline.startsWith('Block 19:00') === true,
  );
  ok('suggest: too late in the day to fit one', suggestFocusBlock([due], [], at(22)) === null);

  // capture tagging
  ok('tag: an action is a todo', tagFor('remind me to submit the mess form') === 'todo');
  ok('tag: a thought is a note', tagFor('the lecturer prefers Dijkstra for this') === 'note');

  return out;
}

export default function BriefingTestScreen() {
  const results = checks();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Briefing self-check</ThemedText>
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
