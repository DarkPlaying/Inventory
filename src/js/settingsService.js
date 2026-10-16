// Centralized Settings Service for Inventory App
// Controls App Lock, Font Size, Notification Transparency, Daily Notification Time, and Stock Limits

export const SETTINGS_STORAGE_KEY = 'inventory_app_settings';

export const DEFAULT_SETTINGS = {
  // Biometric / Phone Lock & App Password
  // User requirement: backup password defaults to '0'. When '0', ask user to set password.
  // Whenever login, require password.
  appLockEnabled: true,
  backupPin: '0',

  // Font Size: 'small' (88%), 'normal' (100%), 'large' (112%), 'xlarge' (125%)
  fontSize: 'normal',

  // White notification card transparency (0.3 to 1.0)
  whiteNotifTransparency: 0.85,

  // Daily notification time in 24-hour format "HH:mm"
  dailyNotificationTime: '09:00',

  // Inventory limits
  stockLimits: {
    outLimit: 20,       // Items < outLimit or status OUT are Out of Stock
    lowLimit: 30,       // Items >= outLimit and < lowLimit are Low Stock
    stockedLimit: 30    // Items >= stockedLimit are Fully Stocked
  }
};

/**
 * Load saved settings merged with defaults
 */
export function getAppSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);

    // If backupPin was the old default '1234', migrate to '0' per user request
    let pin = parsed.backupPin !== undefined ? String(parsed.backupPin) : '0';
    if (pin === '1234') {
      pin = '0';
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      backupPin: pin,
      appLockEnabled: parsed.appLockEnabled !== undefined ? Boolean(parsed.appLockEnabled) : true,
      stockLimits: {
        ...DEFAULT_SETTINGS.stockLimits,
        ...(parsed.stockLimits || {})
      }
    };
  } catch (e) {
    console.warn('Failed to parse settings from storage:', e);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save updated settings to localStorage and trigger system updates
 */
export function saveAppSettings(newSettings) {
  try {
    const current = getAppSettings();
    const updated = {
      ...current,
      ...newSettings,
      stockLimits: {
        ...current.stockLimits,
        ...(newSettings.stockLimits || {})
      }
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    applyVisualSettings(updated);
    window.dispatchEvent(new CustomEvent('inventory-settings-changed', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Apply CSS variables, zoom, and font scaling throughout the entire app
 */
export function applyVisualSettings(settings = null) {
  if (typeof document === 'undefined') return;

  const current = settings || getAppSettings();
  const root = document.documentElement;
  const body = document.body;
  const rootDiv = document.getElementById('root');

  // 1. Font Size Scaling via both rem fontScale and direct zoom on app container
  const scales = {
    small: { scale: '88%', zoom: 0.88 },
    normal: { scale: '100%', zoom: 1.0 },
    large: { scale: '112%', zoom: 1.12 },
    xlarge: { scale: '125%', zoom: 1.25 }
  };

  const choice = scales[current.fontSize] || scales.normal;

  root.style.setProperty('--app-font-scale', choice.scale);
  root.style.setProperty('--app-zoom', String(choice.zoom));
  root.style.fontSize = choice.scale;

  if (body) {
    body.style.fontSize = choice.scale;
  }

  // Direct CSS zoom on root container applies font/size scaling across all screens instantly
  if (rootDiv) {
    rootDiv.style.zoom = String(choice.zoom);
  }

  // 2. White Notification Transparency
  const alpha = Math.min(Math.max(Number(current.whiteNotifTransparency) || 0.85, 0.2), 1.0);
  root.style.setProperty('--stock-alert-opacity', String(alpha));
  root.style.setProperty('--stock-alert-bg', `rgba(255, 255, 255, ${alpha})`);
  root.style.setProperty('--stock-modal-bg', `rgba(255, 255, 255, ${alpha})`);
}

// Auto-apply on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyVisualSettings());
  } else {
    applyVisualSettings();
  }
}
