import { registerPlugin, Capacitor } from '@capacitor/core';
import supabase from '../supabase';
import { getAppSettings } from './settingsService';
import { getStoredTasks } from './taskLogic';

// Custom Native Android & iOS Stock Widget Plugin
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
 * Fetch live data directly from Supabase and sync in realtime to home screen widgets
 */
export async function syncRealtimeStockToWidget() {
  try {
    const { data: items } = await supabase.from('items').select('*');
    const { data: bills } = await supabase.from('billing').select('*');

    const settings = getAppSettings();
    const limits = settings?.stockLimits || { outLimit: 20, lowLimit: 30, stockedLimit: 30 };
    const outLimit = limits.outLimit ?? 20;
    const lowLimit = limits.lowLimit ?? 30;

    const itemsList = items || [];
    let outStockCount = 0;
    let lowStockCount = 0;
    let rawBalance = 0;

    itemsList.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const tp = Number(item.total_price);
      rawBalance += (!isNaN(tp) && tp > 0) ? tp : (price * qty);

      if (qty < outLimit || item.status === 'OUT') {
        outStockCount++;
      } else if (qty < lowLimit) {
        lowStockCount++;
      }
    });

    const rawRevenue = (bills && bills.length > 0)
      ? bills.reduce((acc, b) => acc + (Number(b.total || b.total_price || b.amount) || 0), 0)
      : rawBalance;

    const tasks = getStoredTasks ? getStoredTasks() : [];
    const pendingTasks = tasks.filter(t => t.status !== 'completed');

    return await syncStockAndTasksToWidget({
      totalItems: itemsList.length,
      lowStockCount,
      outOfStockCount: outStockCount,
      tasksCount: pendingTasks.length,
      nominalBalance: Math.round(rawBalance),
      nominalRevenue: Math.round(rawRevenue),
      tasks
    });
  } catch (err) {
    console.warn('syncRealtimeStockToWidget error:', err);
  }
}

/**
 * Sync latest inventory metrics, stock tasks, and theme to Android & iOS Home Widgets
 */
export async function syncStockAndTasksToWidget({
  totalItems = 0,
  lowStockCount = 0,
  outOfStockCount = 0,
  tasksCount = 0,
  nominalBalance = 0,
  nominalRevenue = 0,
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
    tasksCount: Number(tasksCount) || 0,
    nominalBalance: Number(nominalBalance) || 0,
    nominalRevenue: Number(nominalRevenue) || 0,
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

  // Native Android & iOS Widget Sync
  if (Capacitor.isNativePlatform()) {
    try {
      await StockWidgetNative.updateWidgetData(snapshot);
    } catch (e) {
      console.warn('Native widget sync notice:', e);
    }
  }

  return snapshot;
}

export const PREFERRED_WIDGET_SIZE_KEY = 'inventory_preferred_widget_size';

export function getPreferredWidgetSize() {
  try {
    return localStorage.getItem(PREFERRED_WIDGET_SIZE_KEY) || 'large';
  } catch (_) {
    return 'large';
  }
}

export function setPreferredWidgetSize(size) {
  try {
    localStorage.setItem(PREFERRED_WIDGET_SIZE_KEY, size);
  } catch (_) {}
}

/**
 * Request to pin widget on home screen with chosen size (small, medium, large)
 */
export async function requestPinStockWidget(size = 'large') {
  setPreferredWidgetSize(size);
  if (Capacitor.isNativePlatform()) {
    try {
      return await StockWidgetNative.requestPinWidget({ size });
    } catch (err) {
      console.warn('requestPinWidget error:', err);
      return { supported: false, error: err?.message };
    }
  }
  return { supported: false, web: true, size };
}
