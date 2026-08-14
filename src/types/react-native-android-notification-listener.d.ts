/** The package ships no types (last published 2022). Only what we call. */
declare module 'react-native-android-notification-listener' {
  const RNAndroidNotificationListener: {
    getPermissionStatus(): Promise<'authorized' | 'denied' | 'unknown'>;
    requestPermission(): void;
  };
  export const RNAndroidNotificationListenerHeadlessJsName: string;
  export default RNAndroidNotificationListener;
}
