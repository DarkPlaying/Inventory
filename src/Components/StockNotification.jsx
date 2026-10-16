import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import {
  sendStockChangeNotification,
  checkAndTriggerDailyStockNotification,
  requestNotificationPermission
} from '../js/notificationService';
import { syncRealtimeStockToWidget } from '../js/widgetSync';

/**
 * Headless Background Component:
 * - Maintains 1x per day stock notification (never triggers on page reload / refresh).
 * - Sends device notification when database stocks are ADDED, UPDATED, or REMOVED in realtime.
 * - Suppresses initial notifications during app startup.
 */
export default function StockNotification() {
  const isFirstLoad = useRef(true);

  // 1. Request notification permission on first launch (shows iOS system prompt) & check daily notification
  useEffect(() => {
    async function initNotifications() {
      try {
        const hasPrompted = localStorage.getItem('has_requested_notifications');
        if (!hasPrompted) {
          localStorage.setItem('has_requested_notifications', 'true');
          await requestNotificationPermission();
        }
      } catch (_) {}
      checkAndTriggerDailyStockNotification();
      syncRealtimeStockToWidget();
    }
    initNotifications();

    function onSettingsChange() {
      syncRealtimeStockToWidget();
    }
    window.addEventListener('inventory-settings-changed', onSettingsChange);
    return () => window.removeEventListener('inventory-settings-changed', onSettingsChange);
  }, []);

  // 2. Listen to database realtime changes (INSERT, UPDATE, DELETE)
  // Realtime changes ONLY fire when database actually changes, NEVER on page load or refresh!
  useEffect(() => {
    const timer = setTimeout(() => {
      isFirstLoad.current = false;
    }, 1500);

    const channel = supabase
      .channel('realtime-stock-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items' }, (payload) => {
        syncRealtimeStockToWidget();
        if (!isFirstLoad.current && payload.new) {
          sendStockChangeNotification(
            '📦 New Stock Added',
            `"${payload.new.name || 'Item'}" was added to inventory (${payload.new.quantity ?? ''} units).`
          );
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items' }, (payload) => {
        syncRealtimeStockToWidget();
        if (!isFirstLoad.current && payload.new) {
          sendStockChangeNotification(
            '🔄 Stock Updated',
            `"${payload.new.name || 'Item'}" quantity changed to ${payload.new.quantity}.`
          );
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, () => {
        syncRealtimeStockToWidget();
        if (!isFirstLoad.current) {
          sendStockChangeNotification(
            '🗑️ Stock Removed',
            'An item was removed from inventory.'
          );
        }
      })
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
