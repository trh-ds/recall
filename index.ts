// Custom entry (instead of `main: expo-router/entry`) purely so the notification
// listener's headless task is registered — it has to run with the app killed.
import 'expo-router/entry';

import { AppRegistry } from 'react-native';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';

import { onNotificationPosted } from '@/services/notification-listener';

AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => onNotificationPosted,
);
