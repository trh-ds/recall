import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { askThen } from './permissions';

/** Briefing readout (AGENT.md §2, voice-first). Barges in over anything already speaking. */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text);
}

export const stopSpeaking = () => Speech.stop();

export async function micGranted() {
  return (await ExpoSpeechRecognitionModule.getPermissionsAsync()).granted;
}

/**
 * One shot of dictation (F3). Resolves with the final transcript, or `''` if the
 * user said nothing. The mic is live only between `start()` and the final result.
 * `onPartial` gets interim text so the UI can show words as they land.
 */
export function listen(onPartial?: (text: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    askThen(
      'Recall listens only while you hold the capture button. Android transcribes the audio on your phone; Recall never uploads the recording.',
      () => ExpoSpeechRecognitionModule.requestPermissionsAsync(),
    )
      .then((perm) => {
        if (!perm?.granted) return reject(new Error('microphone permission denied'));

        let latest = '';
        const subs = [
          ExpoSpeechRecognitionModule.addListener('result', (e) => {
            latest = e.results[0]?.transcript ?? latest;
            if (!e.isFinal) onPartial?.(latest);
          }),
          ExpoSpeechRecognitionModule.addListener('error', (e) => {
            // "no-speech" is a silent user, not a failure — hand back what we have.
            done(e.error === 'no-speech' ? null : new Error(e.message || e.error));
          }),
          ExpoSpeechRecognitionModule.addListener('end', () => done(null)),
        ];

        let settled = false;
        function done(err: Error | null) {
          if (settled) return;
          settled = true;
          subs.forEach((s) => s.remove());
          if (err) reject(err);
          else resolve(latest.trim());
        }

        ExpoSpeechRecognitionModule.start({
          lang: 'en-IN',
          interimResults: true,
          continuous: false,
          // Keep it on-device where the device supports it — least egress (AGENT.md §8).
          requiresOnDeviceRecognition: false,
        });
      })
      .catch(reject);
  });
}

export const stopListening = () => ExpoSpeechRecognitionModule.stop();
