import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private responseSubscription: Notifications.Subscription | null = null;
  private receivedSubscription: Notifications.Subscription | null = null;

  /**
   * Initialize notification listeners (call once on app start)
   */
  async initialize() {
    // Handle notification tap (when user clicks on a notification)
    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );

    // Handle notification received while app is in foreground
    this.receivedSubscription = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived
    );

    console.log('📱 Notification service initialized');
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    if (this.responseSubscription) {
      this.responseSubscription.remove();
    }
    if (this.receivedSubscription) {
      this.receivedSubscription.remove();
    }
    console.log('📱 Notification service cleaned up');
  }

  /**
   * Register push token with backend (call after user login)
   */
  async registerPushToken(): Promise<string | null> {
    try {
      // Skip on web/simulator
      if (!Device.isDevice) {
        console.log('📱 Push notifications not available on web/simulator');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('📱 Push notification permission not granted');
        return null;
      }

      // Get Expo push token with explicit projectId
      const projectId = 'fea7ca9c-9133-4cd1-99a9-6b952edc3932';
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      const token = tokenData.data;
      const deviceType = Platform.OS;

      // Register with backend
      await api.pushTokens.register(token, deviceType);
      console.log('📱 Push token registered:', token.substring(0, 30) + '...');

      return token;
    } catch (error) {
      // Silently fail - notifications are not critical for app functionality
      console.log('📱 Push notifications unavailable (this is normal in dev mode)');
      return null;
    }
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    console.log('📱 Notification tapped:', data);

    if (data?.conversation_id) {
      // Navigate to the conversation
      router.push(`/conversation/${data.conversation_id}`);
    } else if (data?.type === 'report') {
      // Navigate to reports
      router.push('/(tabs)/reports');
    }
  };

  /**
   * Handle notification received while app is open
   */
  private handleNotificationReceived = (notification: Notifications.Notification) => {
    const data = notification.request.content.data;
    console.log('📱 Notification received in foreground:', data);
    
    // Could add custom logic here, like showing an in-app banner
    // For now, the default handler shows the notification
  };

  /**
   * Send a local notification (for testing)
   */
  async sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Immediate
    });
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear all notifications
   */
  async clearAll() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
