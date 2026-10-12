import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFICATION_STORAGE_KEY = 'inventory_notification_pref';
export const STOCK_CHANNEL_ID = 'stock_alerts';

/**
 * Ensure notification channel exists (Android 8.0+)
 */
export async function ensureNotificationChannel() {
  try {
    await LocalNotifications.createChannel({
      id: STOCK_CHANNEL_ID,
      name: 'Stock Alerts',
      description: 'Alerts for low and out-of-stock items',
      importance: 5, // High importance (heads-up notification & sound)
      visibility: 1, // Public on lockscreen
      vibration: true,
      sound: 'default'
    });
  } catch (e) {
    console.warn('LocalNotifications createChannel error/fallback:', e);
  }
}

/**
 * Check if notifications are supported and whether permission is granted.
 */
export async function checkNotificationPermission() {
  try {
    await ensureNotificationChannel();
    const perm = await LocalNotifications.checkPermissions();
    return perm.display === 'granted';
  } catch (err) {
    // Fallback to Web Notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }
}

/**
 * Request notification permissions from device/browser.
 */
export async function requestNotificationPermission() {
  try {
    await ensureNotificationChannel();
    const result = await LocalNotifications.requestPermissions();
    const granted = result.display === 'granted';
    if (granted) {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'enabled');
      await scheduleDailyStockNotification();
    }
    return granted;
  } catch (err) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      const granted = perm === 'granted';
      if (granted) {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, 'enabled');
      }
      return granted;
    }
    return false;
  }
}

/**
 * Trigger an immediate notification for low or out-of-stock items.
 */
export async function sendStockAlertNotification(outCount, lowCount, outItems = [], lowItems = []) {
  if (outCount === 0 && lowCount === 0) return;

  const isOut = outCount > 0;
  const title = isOut ? '🚨 Out of Stock Alert!' : '⚠️ Low Stock Warning!';
  const preview = isOut
    ? `${outCount} item(s) out of stock (${outItems.slice(0, 3).join(', ')})`
    : `${lowCount} item(s) running low (${lowItems.slice(0, 3).join(', ')})`;

  try {
    await ensureNotificationChannel();
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() / 1000) % 100000,
          title,
          body: preview,
          channelId: STOCK_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          sound: 'default',
          attachments: undefined,
          actionTypeId: '',
          extra: { type: isOut ? 'OUT' : 'LOW' }
        }
      ]
    });
  } catch (err) {
    // Fallback to Web Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: preview,
          icon: '/dashboard.png'
        });
      } catch (e) {
        console.warn('Web notification error:', e);
      }
    }
  }
}

/**
 * Schedule a daily repeating notification to check stock levels.
 */
export async function scheduleDailyStockNotification() {
  try {
    await ensureNotificationChannel();
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) return;

    // Cancel prior daily notifications to prevent duplicates
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
    } catch (_) {}

    // Schedule daily at 9:00 AM
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(9, 0, 0, 0);
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9999,
          title: '📦 Daily Inventory Check',
          body: 'Good morning! Check your daily stock levels to restock low and out-of-stock items.',
          channelId: STOCK_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          schedule: {
            at: scheduledTime,
            every: 'day'
          },
          sound: 'default'
        }
      ]
    });

    localStorage.setItem('daily_stock_scheduled', 'true');
  } catch (err) {
    console.warn('Daily notification schedule fallback:', err);
  }
}
