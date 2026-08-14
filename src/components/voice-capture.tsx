/**
 * Voice quick-capture (PRD F3) — the mic bar and its overlay.
 *
 * Hold the bar to dictate, release to transcribe, then read back what Recall heard
 * before it is saved. Nothing is stored until the user taps Save: that read-back is
 * the whole trust contract for a feature that listens.
 */

import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Eyebrow } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { addNote } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { listen, stopListening } from '@/services/voice';

type Phase = 'idle' | 'listening' | 'thinking' | 'review';

const TODO_HINT =
  /\b(remind|submit|email|send|print|finish|buy|call|book|pay|due|deadline|assignment|apply)\b/i;

/**
 * ponytail: keyword tagging. It is one call site — swap it for the agent loop's
 * LLM classifier (and a due-date parse) the moment that exists.
 */
export const tagFor = (text: string) => (TODO_HINT.test(text) ? 'todo' : 'note');

export function VoiceCapture({ onCaptured }: { onCaptured: (message: string) => void }) {
  const theme = useTheme();
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function start() {
    setText('');
    setError(null);
    setPhase('listening');
    listen(setText)
      .then((final) => {
        if (!final) return setPhase('idle'); // user said nothing — no dead-end dialog
        setText(final);
        setPhase('review');
      })
      .catch((e: Error) => {
        setError(e.message);
        setPhase('idle');
      });
  }

  function release() {
    if (phase !== 'listening') return;
    setPhase('thinking');
    stopListening();
  }

  function save() {
    const trimmed = text.trim();
    if (!trimmed) return setPhase('idle');
    const tag = tagFor(trimmed);
    addNote(trimmed, tag);
    setPhase('idle');
    onCaptured(tag === 'todo' ? 'Saved to Today' : 'Saved to Notes');
  }

  return (
    <>
      <View style={[styles.bar, { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hold to speak"
          onPressIn={start}
          onPressOut={release}
          style={styles.barPress}>
          <View style={[styles.mic, { backgroundColor: theme.accent }]}>
            <Bars active={phase === 'listening'} color={theme.onAccent} height={14} />
          </View>
          <ThemedText type="body" themeColor="textSecondary">
            {error ?? 'Hold to speak'}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Type a capture instead"
          onPress={() => {
            setText('');
            setError(null);
            setPhase('review');
          }}
          style={styles.typeButton}>
          <ThemedText type="label" themeColor="textMuted">
            Type
          </ThemedText>
        </Pressable>
      </View>

      <Modal visible={phase !== 'idle'} transparent animationType="fade" onRequestClose={release}>
        <View style={[styles.overlay, { backgroundColor: theme.scrim }]}>
          {phase === 'review' ? (
            <Card style={styles.review} borderColor={theme.accentEdge}>
              <Eyebrow tone="accent">Recall heard</Eyebrow>
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                autoFocus={!text}
                placeholder="Type what you want to remember"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text }]}
              />
              <View style={styles.chips}>
                <Chip label={tagFor(text) === 'todo' ? 'Todo' : 'Note'} />
              </View>
              <View style={styles.reviewActions}>
                <Button label="Save" onPress={save} style={styles.grow} />
                <Button label="Discard" variant="ghost" onPress={() => setPhase('idle')} />
              </View>
            </Card>
          ) : (
            <Pressable style={styles.live} onPress={release} accessibilityRole="button">
              <View
                style={[
                  styles.liveMic,
                  { backgroundColor: phase === 'listening' ? theme.accent : theme.accentWash },
                ]}>
                <Bars active={phase === 'listening'} color={theme.onAccent} height={34} />
              </View>
              <Eyebrow tone="accent">{phase === 'listening' ? 'Listening' : 'Transcribing'}</Eyebrow>
              <ThemedText type="headline" style={styles.partial}>
                {text || 'Say what you need to remember…'}
              </ThemedText>
              <ThemedText type="label" themeColor="textMuted">
                Audio is transcribed on your phone. Nothing is saved until you confirm.
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Modal>
    </>
  );
}

function Chip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.accentWash }]}>
      <ThemedText type="meta" themeColor="accent">
        {label}
      </ThemedText>
    </View>
  );
}

/** Three bars that breathe while the mic is live — the only "is it on?" signal there is. */
function Bars({ active, color, height }: { active: boolean; color: string; height: number }) {
  const [scale] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.35)));

  useEffect(() => {
    if (!active) return;
    const loops = scale.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.35, duration: 320, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, scale]);

  return (
    <View style={styles.bars}>
      {scale.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: height / 5,
            height,
            borderRadius: height / 10,
            backgroundColor: color,
            transform: [{ scaleY: active ? v : 0.5 }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 18,
    elevation: 8,
  },
  barPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, height: '100%' },
  typeButton: { paddingLeft: 14, paddingVertical: 8 },
  mic: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2.5 },
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  live: { alignItems: 'center', gap: 22, paddingBottom: 60 },
  liveMic: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  partial: { textAlign: 'center' },
  review: { gap: 14 },
  input: { fontSize: 21, lineHeight: 28, fontWeight: '600', minHeight: 60 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm },
  reviewActions: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
