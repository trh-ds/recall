import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { callLog, complete, completeJson, extractJson } from '@/llm';
import { failoverChain, providers } from '@/llm/config';

/**
 * Self-check for the JSON extractor — the only non-trivial pure logic in the LLM
 * layer. Runs on render; a red line here means the parser broke.
 */
function parserCheck(): string {
  const cases: [string, unknown][] = [
    ['{"a":1}', { a: 1 }],
    ['```json\n{"a":1}\n```', { a: 1 }],
    ['Sure! Here you go: {"a":[1,2]} hope that helps', { a: [1, 2] }],
    ['[{"a":1}]', [{ a: 1 }]],
  ];
  for (const [raw, want] of cases) {
    try {
      if (JSON.stringify(extractJson(raw)) !== JSON.stringify(want)) return `FAIL on ${raw}`;
    } catch {
      return `THREW on ${raw}`;
    }
  }
  try {
    extractJson('no json here');
    return 'FAIL: bad input did not throw';
  } catch {
    return 'parser self-check: PASS';
  }
}

export default function LlmTestScreen() {
  const theme = useTheme();
  const [prompt, setPrompt] = useState('Name one study tip in under 15 words.');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [, bump] = useState(0);

  async function run(json: boolean) {
    setBusy(true);
    setOutput('running…');
    try {
      const messages = [{ role: 'user' as const, content: prompt }];
      const res = json
        ? await completeJson(
            [{ role: 'user', content: `${prompt}\nReturn {"answer": string}.` }],
          ).then((r) => ({ provider: r.provider, text: JSON.stringify(r.data, null, 2) }))
        : await complete(messages);
      setOutput(`[${res.provider}]\n${res.text}`);
    } catch (e) {
      setOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      bump((n) => n + 1);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">LLM test</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {parserCheck()}
          </ThemedText>

          <ThemedText type="smallBold">Keys ({failoverChain.join(' → ')})</ThemedText>
          {failoverChain.map((name) => (
            <ThemedText key={name} type="small" themeColor="textSecondary">
              {name}: {providers[name].apiKey ? 'set' : 'MISSING'} · {providers[name].model}
            </ThemedText>
          ))}

          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            multiline
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />

          <ThemedView style={styles.row}>
            <Pressable
              disabled={busy}
              onPress={() => run(false)}
              style={[styles.button, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">Run text</ThemedText>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => run(true)}
              style={[styles.button, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">Run JSON</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="code">{output}</ThemedText>

          <ThemedText type="smallBold">Call log (newest first)</ThemedText>
          {callLog.map((l, i) => (
            <ThemedText key={i} type="code" themeColor="textSecondary">
              {l.provider} {l.ms}ms{' '}
              {l.error ? `ERROR ${l.error}` : `${l.promptTokens ?? '?'}/${l.completionTokens ?? '?'} tok`}
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
  input: { minHeight: 72, borderRadius: 8, padding: Spacing.two, fontSize: 14 },
  row: { flexDirection: 'row', gap: Spacing.two },
  button: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 8 },
});
