import { useEffect, useState } from 'react';
import { useStockStatus } from '../js/useStockStatus';
import {
  sendStockAlertNotification,
  scheduleDailyStockNotification,
  checkNotificationPermission
} from '../js/notificationService';

/**
 * Headless Background Component:
 * Listens for stock changes and sends device-level outside notifications
 * (in Android notification tray / status bar) when stock is low or out,
 * and maintains daily scheduled notifications.
 * Renders NO inside UI banner.
 */
export default function StockNotification() {
  const { out, low, outItems, lowItems } = useStockStatus();
  const [lastSentKey, setLastSentKey] = useState('');

  // Schedule daily notification once permission is active
  useEffect(() => {
    async function initDaily() {
      const hasPerm = await checkNotificationPermission();
      if (hasPerm) {
        await scheduleDailyStockNotification();
      }
    }
    initDaily();
  }, []);

  // When low or out-of-stock items exist or count changes, send external device notification
  useEffect(() => {
    const currentKey = `${out}-${low}`;
    if ((out > 0 || low > 0) && currentKey !== lastSentKey) {
      setLastSentKey(currentKey);
      sendStockAlertNotification(out, low, outItems, lowItems);
    }
  }, [out, low, outItems, lowItems, lastSentKey]);

  // Pure background service, returns no in-app UI banner
  return null;
}
