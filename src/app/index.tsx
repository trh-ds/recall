import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Recall</ThemedText>
        <ThemedText type="default">Your daily briefing will appear here.</ThemedText>
        <Link href="/llm-test">
          <ThemedText type="linkPrimary">LLM test</ThemedText>
        </Link>
        <Link href="/db-test">
          <ThemedText type="linkPrimary">DB self-check</ThemedText>
        </Link>
        <Link href="/services-test">
          <ThemedText type="linkPrimary">Services test</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
