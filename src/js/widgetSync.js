import { registerPlugin, Capacitor } from '@capacitor/core';

// Custom Native Android Stock Widget Plugin
export const StockWidgetNative = registerPlugin('StockWidgetPlugin');

export const WIDGET_THEME_STORAGE_KEY = 'inventory_widget_theme';

export function getStoredWidgetTheme() {
  try {
    return localStorage.getItem(WIDGET_THEME_STORAGE_KEY) || 'light';
  } catch (_) {
    return 'light';
  }
}

export function setStoredWidgetTheme(theme) {
  try {
    localStorage.setItem(WIDGET_THEME_STORAGE_KEY, theme);
  } catch (_) {}
}

/**
 * Format concise summary for widget and notifications
 */
export function summarizeTasksForDate(tasks, targetDateStr) {
  if (!tasks || tasks.length === 0) return 'No tasks';
  const matching = tasks.filter(t => t.dueDate === targetDateStr && t.status !== 'completed');
  if (matching.length === 0) return 'All clear - No pending tasks';

  return matching
    .slice(0, 2)
    .map(t => {
      if (t.targetAim && t.stockItemName) {
        return `${t.stockItemName}: Aim ${t.targetAim} (Now ${t.currentStock ?? '?'})`;
      }
      return t.title || t.stockItemName || 'Stock task';
    })
    .join(' • ') + (matching.length > 2 ? ` (+${matching.length - 2} more)` : '');
}

/**
 * Sync latest inventory metrics, stock tasks, and theme to Android Home Widget and Local Snapshot
 */
export async function syncStockAndTasksToWidget({
  totalItems = 0,
  lowStockCount = 0,
  outOfStockCount = 0,
  tasks = [],
  widgetTheme
} = {}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const todaySummary = summarizeTasksForDate(tasks, todayStr);
  const tomorrowSummary = summarizeTasksForDate(tasks, tomorrowStr);
  const activeTheme = widgetTheme || getStoredWidgetTheme();

  const snapshot = {
    totalItemsCount: Number(totalItems) || 0,
    lowStockCount: Number(lowStockCount) || 0,
    outOfStockCount: Number(outOfStockCount) || 0,
    todayTasksText: todaySummary,
    tomorrowTasksText: tomorrowSummary,
    widgetTheme: activeTheme,
    updatedAt: new Date().toISOString()
  };

  // Persist locally
  try {
    localStorage.setItem('stock_widget_snapshot', JSON.stringify(snapshot));
    setStoredWidgetTheme(activeTheme);
  } catch (_) {}

  // Web / PWA App Badging API (outside-app icon badge)
  if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
    try {
      const urgentCount = Number(lowStockCount) + Number(outOfStockCount);
      if (urgentCount > 0) {
        navigator.setAppBadge(urgentCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    } catch (_) {}
  }

  // Native Android Widget Sync
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      await StockWidgetNative.updateWidgetData(snapshot);
    } catch (e) {
      console.warn('Native widget sync notice:', e);
    }
  }

  return snapshot;
}
