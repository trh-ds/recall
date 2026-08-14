/**
 * Home — the daily briefing (PRD F1). This is the anchor habit: if this screen is
 * not worth opening every morning, nothing else in the app matters.
 *
 * It reads only on-device state, and it says so at the bottom. Anything the agent
 * wants to *do* appears as a suggestion the user has to approve (AGENT.md §7).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Checkbox, Eyebrow, Segmented } from '@/components/ui';
import { VoiceCapture } from '@/components/voice-capture';
import { Radius } from '@/constants/theme';
import { toggleNote } from '@/db';
import {
  buildBriefing,
  clock,
  phaseFor,
  type Phase,
  type Suggestion,
  type Urgency,
} from '@/features/briefing';
import { useTheme } from '@/hooks/use-theme';
import { cancelFocusBlock, scheduleFocusBlock } from '@/services/notify';

const PHASES = ['Morning', 'Evening'] as const;
const label = (p: Phase) => (p === 'morning' ? 'Morning' : 'Evening');

export default function HomeScreen() {
  const theme = useTheme();
  const [now, setNow] = useState(() => new Date());
  /** null = follow the clock; set once the user picks a phase by hand. */
  const [picked, setPicked] = useState<Phase | null>(null);
  const [revision, setRevision] = useState(0);
  const [sheet, setSheet] = useState<Suggestion | null>(null);
  const [decided, setDecided] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);

  const phase = picked ?? phaseFor(now);
  const reload = useCallback(() => setRevision((r) => r + 1), []);
  const [toast, showToast] = useToast();

  // Countdowns are the point of this screen — a stale "in 6h" is a lie. One tick a
  // minute is enough for a display that never shows seconds.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Cheap enough to derive during render — every read is synchronous SQLite over a
  // few hundred rows. `revision` is what a write (tick a task, save a capture) bumps.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- revision is the invalidation key
  const briefing = useMemo(() => buildBriefing(now, phase), [now, phase, revision]);

  const urgencyColor = (u: Urgency) =>
    u === 'urgent' ? theme.urgent : u === 'warn' ? theme.warn : theme.textMuted;

  async function approve(s: Suggestion) {
    setSheet(null);
    setDecided(true);
    await scheduleFocusBlock(s.deadlineId, s.headline, s.startAt);
    showToast(`Focus block set · ${clock(new Date(s.startAt))}`, () =>
      cancelFocusBlock(s.deadlineId),
    );
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ThemedText type="meta" themeColor="textMuted">
              {briefing.stamp}
            </ThemedText>
            <Segmented
              options={PHASES}
              value={label(phase)}
              onChange={(v) => setPicked(v === 'Morning' ? 'morning' : 'evening')}
            />
          </View>

          {briefing.isEmpty ? (
            <EmptyBriefing />
          ) : (
            <>
              <ThemedText type="hero">{briefing.heroLine1}</ThemedText>
              <ThemedText type="hero" themeColor="accent" style={styles.heroGap}>
                {briefing.heroLine2}
              </ThemedText>

              {briefing.nextUp ? (
                <Card style={styles.section}>
                  <View style={styles.cardHead}>
                    <Eyebrow tone="accent">
                      {briefing.nextUp.isToday ? 'Next up' : 'Tomorrow, first thing'}
                    </Eyebrow>
                    <ThemedText type="numeral" themeColor="textSecondary">
                      {briefing.nextUp.at}
                    </ThemedText>
                  </View>
                  <ThemedText type="cardTitle">{briefing.nextUp.title}</ThemedText>
                  <ThemedText type="body" themeColor="textSecondary" style={styles.tight}>
                    {briefing.nextUp.detail}
                  </ThemedText>
                </Card>
              ) : null}

              {briefing.deadlines.length ? (
                <View style={styles.section}>
                  <Eyebrow>{phase === 'morning' ? 'Deadlines' : 'What slipped'}</Eyebrow>
                  <View style={styles.stack}>
                    {briefing.deadlines.map((d) => (
                      <Card
                        key={d.id}
                        borderColor={d.urgency === 'urgent' ? theme.urgentEdge : undefined}
                        style={styles.row}>
                        <View style={[styles.bar, { backgroundColor: urgencyColor(d.urgency) }]} />
                        <View style={styles.fill}>
                          <ThemedText type="rowTitle">{d.title}</ThemedText>
                          <View style={styles.countdown}>
                            <ThemedText type="numeral" style={{ color: urgencyColor(d.urgency) }}>
                              {d.countdown}
                            </ThemedText>
                            <ThemedText type="label" themeColor="textSecondary">
                              · {d.note}
                            </ThemedText>
                          </View>
                        </View>
                      </Card>
                    ))}
                  </View>
                </View>
              ) : null}

              {briefing.tasks.length ? (
                <View style={styles.section}>
                  <View style={styles.cardHead}>
                    <Eyebrow>Top 3 today</Eyebrow>
                    <ThemedText type="meta" themeColor="textMuted">
                      {briefing.doneCount}
                    </ThemedText>
                  </View>
                  <Card style={styles.list}>
                    {briefing.tasks.map((t, i) => (
                      <Pressable
                        key={t.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: !!t.done }}
                        accessibilityLabel={t.text}
                        onPress={() => {
                          toggleNote(t.id);
                          reload();
                        }}
                        style={[
                          styles.taskRow,
                          i < briefing.tasks.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: theme.hairline,
                          },
                        ]}>
                        <Checkbox done={!!t.done} />
                        <ThemedText
                          type="rowTitle"
                          themeColor={t.done ? 'textMuted' : 'text'}
                          style={[styles.fill, !!t.done && styles.struck]}>
                          {t.text}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </Card>
                </View>
              ) : null}

              {briefing.suggestion && !decided ? (
                <Card
                  borderColor={theme.accentEdge}
                  style={[styles.section, { backgroundColor: theme.accentWash }]}>
                  <Eyebrow tone="accent">Needs you</Eyebrow>
                  <ThemedText type="headline" style={styles.tight}>
                    {briefing.suggestion.headline}?
                  </ThemedText>
                  <Button
                    label="Review"
                    onPress={() => setSheet(briefing.suggestion)}
                    style={styles.reviewButton}
                  />
                </Card>
              ) : null}

              {briefing.triage ? (
                <View style={styles.section}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: triageOpen }}
                    onPress={() => setTriageOpen((o) => !o)}>
                    <Card style={styles.row}>
                      <View style={styles.fill}>
                        <ThemedText type="rowTitle">
                          {briefing.triage.kept.length} flagged · {briefing.triage.heldBack} held
                          back
                        </ThemedText>
                        <ThemedText type="label" themeColor="textSecondary" style={styles.tight}>
                          Overnight notifications, triaged
                        </ThemedText>
                      </View>
                      <ThemedText type="headline" themeColor="textMuted">
                        {triageOpen ? '⌃' : '⌄'}
                      </ThemedText>
                    </Card>
                  </Pressable>
                  {triageOpen ? (
                    <Card style={styles.list}>
                      {briefing.triage.kept.map((n) => (
                        <View key={n.id} style={styles.taskRow}>
                          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                          <View style={styles.fill}>
                            <ThemedText type="label">
                              {n.app}
                              {n.title ? ` · ${n.title}` : ''}
                            </ThemedText>
                            <ThemedText type="label" themeColor="textSecondary">
                              Kept — matches something you have open.
                            </ThemedText>
                          </View>
                        </View>
                      ))}
                    </Card>
                  ) : null}
                </View>
              ) : null}

              <ThemedText type="label" themeColor="textMuted" style={styles.sources}>
                {briefing.sources}
              </ThemedText>
            </>
          )}
        </ScrollView>

        <View style={styles.dock}>
          <VoiceCapture
            onCaptured={(msg) => {
              reload();
              showToast(msg);
            }}
          />
        </View>

        {toast}
      </SafeAreaView>

      <ConfirmSheet
        suggestion={sheet}
        onApprove={approve}
        onDismiss={() => {
          setSheet(null);
          setDecided(true);
          showToast('Dismissed · not suggested again today');
        }}
        onClose={() => setSheet(null)}
      />
    </ThemedView>
  );
}

/**
 * The autonomy gate (AGENT.md §7). It always states what will happen, why Recall
 * thinks so, and what it will touch — a one-tap Approve is only safe if the user
 * can see all three before tapping.
 */
function ConfirmSheet({
  suggestion,
  onApprove,
  onDismiss,
  onClose,
}: {
  suggestion: Suggestion | null;
  onApprove: (s: Suggestion) => void;
  onDismiss: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  if (!suggestion) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.fill, { backgroundColor: theme.scrim }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.backgroundElement, borderColor: theme.accentEdge },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.hairline }]} />
        <Eyebrow tone="accent">Recall suggests</Eyebrow>
        <ThemedText type="cardTitle" style={styles.tight}>
          {suggestion.headline}
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.tight}>
          {suggestion.because}
        </ThemedText>
        <View style={[styles.willDo, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="label" themeColor="textSecondary">
            Will do
          </ThemedText>
          <ThemedText type="label">Remind you on this phone at {clock(new Date(suggestion.startAt))}</ThemedText>
        </View>
        <Button label="Approve" onPress={() => onApprove(suggestion)} style={styles.sheetButton} />
        <View style={styles.sheetActions}>
          <Button label="Not now" variant="secondary" onPress={onClose} style={styles.fill} />
          <Button label="Dismiss" variant="ghost" onPress={onDismiss} style={styles.fill} />
        </View>
        <ThemedText type="label" themeColor="textMuted" style={styles.sheetFoot}>
          Focus blocks are on Suggest · Recall never acts on its own
        </ThemedText>
      </View>
    </Modal>
  );
}

/** An honest empty day, not a nag. The offer below it is the only thing to act on. */
function EmptyBriefing() {
  return (
    <View>
      <ThemedText type="hero">Nothing needs you</ThemedText>
      <ThemedText type="hero" themeColor="accent" style={styles.heroGap}>
        right now.
      </ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        No deadlines, no classes on the timetable and nothing captured yet. Hold the bar below
        and tell Recall what is coming up.
      </ThemedText>
    </View>
  );
}

/** Toast with a single undo. Returns the node so the screen decides where it sits. */
function useToast() {
  const [state, setState] = useState<{ message: string; undo?: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = useTheme();

  const show = useCallback((message: string, undo?: () => void) => {
    setState({ message, undo });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(null), 4000);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const node = state ? (
    <View style={[styles.toast, { backgroundColor: theme.backgroundRaised }]}>
      <ThemedText type="label">{state.message}</ThemedText>
      {state.undo ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            state.undo?.();
            setState(null);
          }}>
          <ThemedText type="label" themeColor="accent">
            Undo
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  return [node, show] as const;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroGap: { marginBottom: 22 },
  section: { marginTop: 14 },
  stack: { gap: 12, marginTop: 12 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tight: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  countdown: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  list: { padding: 0, overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  struck: { textDecorationLine: 'line-through' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  reviewButton: { marginTop: 14 },
  sources: { marginTop: 24, textAlign: 'center' },
  dock: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    padding: 16,
    elevation: 10,
  },
  sheet: {
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 32,
  },
  handle: { width: 34, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  willDo: {
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 16,
    gap: 4,
  },
  sheetButton: { marginTop: 18 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  sheetFoot: { marginTop: 16, textAlign: 'center' },
});
