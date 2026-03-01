import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { updateFcmToken } from '../services/auth.service';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleNotification
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  async function registerForPushNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);

      // Send token to server
      await updateFcmToken(token);
    } catch (err) {
      console.log('Push notification setup error:', err);
    }
  }

  function handleNotification(notification) {
    const data = notification.request.content.data;
    console.log('Notification received:', data);
  }

  function handleNotificationResponse(response) {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);
    // Navigate based on notification type
    if (data.type === 'new_listing' && data.listing_id) {
      // Navigate to listing details
    }
  }
}
