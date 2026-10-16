import React, { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings, applyVisualSettings } from '../js/settingsService';
import { checkBiometricAvailability, authenticateWithBiometrics } from '../js/biometricAuth';
import { scheduleDailyStockNotification } from '../js/notificationService';
import '../Css/settingsModal.css';

export default function SettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(getAppSettings);
  const [biometricInfo, setBiometricInfo] = useState(null);
  const [testStatus, setTestStatus] = useState('');
  const [saveToast, setSaveToast] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = getAppSettings();
      setSettings(current);
      applyVisualSettings(current);
      checkBiometricAvailability().then(setBiometricInfo);
      setTestStatus('');
      setSaveToast('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle biometric lock
  async function handleToggleBiometric(enabled) {
    if (enabled) {
      setTestStatus('Verifying phone biometric / lock...');
      const res = await authenticateWithBiometrics({
        title: 'Enable App Lock',
        subtitle: 'Confirm your fingerprint, face, or phone lock to enable'
      });

      if (res.success) {
        const updated = { ...settings, appLockEnabled: true };
        setSettings(updated);
        saveAppSettings(updated);
        setTestStatus('✅ App Lock enabled successfully!');
      } else {
        setTestStatus(`❌ Could not verify: ${res.errorMessage || 'Canceled'}`);
      }
    } else {
      const updated = { ...settings, appLockEnabled: false };
      setSettings(updated);
      saveAppSettings(updated);
      setTestStatus('App lock disabled.');
    }
  }

  // Test biometric directly
  async function handleTestBiometric() {
    setTestStatus('Testing biometric / device lock...');
    const res = await authenticateWithBiometrics({
      title: 'Biometric Test',
      subtitle: 'Testing device authentication'
    });
    if (res.success) {
      setTestStatus('✅ Success! Biometric / Phone Lock verified.');
    } else {
      setTestStatus(`❌ Test failed: ${res.errorMessage || 'Canceled'}`);
    }
  }

  // Handle font size change with instant live preview and auto-save
  function handleFontSizeChange(size) {
    const updated = { ...settings, fontSize: size };
    setSettings(updated);
    applyVisualSettings(updated);
    saveAppSettings(updated);
    setSaveToast(`Font size set to ${size} (${size === 'small' ? '88%' : size === 'normal' ? '100%' : size === 'large' ? '112%' : '125%'})`);
    setTimeout(() => setSaveToast(''), 1500);
  }

  // Handle transparency change
  function handleTransparencyChange(val) {
    const num = parseFloat(val);
    const updated = { ...settings, whiteNotifTransparency: num };
    setSettings(updated);
    applyVisualSettings(updated);
    saveAppSettings(updated);
  }

  // Handle time selection
  async function handleTimeChange(timeStr) {
    const updated = { ...settings, dailyNotificationTime: timeStr };
    setSettings(updated);
    saveAppSettings(updated);
    try {
      await scheduleDailyStockNotification(timeStr);
      setSaveToast(`Daily reminder time set to ${timeStr}`);
      setTimeout(() => setSaveToast(''), 1500);
    } catch (_) {}
  }

  // Reset backup password to 0 (per user requirement)
  function handleResetPinToZero() {
    const updated = { ...settings, backupPin: '0', appLockEnabled: true };
    setSettings(updated);
    saveAppSettings(updated);
    setTestStatus('✅ Backup password reset to 0! On next login, you will be prompted to set a new password.');
  }

  // Direct PIN change
  function handlePinInput(val) {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    const updated = { ...settings, backupPin: clean };
    setSettings(updated);
    saveAppSettings(updated);
  }

  // Handle stock limits change
  function handleStockLimitChange(key, value) {
    const num = Math.max(0, parseInt(value, 10) || 0);
    const updated = {
      ...settings,
      stockLimits: {
        ...settings.stockLimits,
        [key]: num
      }
    };
    setSettings(updated);
  }

  // Final Save button action
  async function handleSave() {
    saveAppSettings(settings);
    applyVisualSettings(settings);
    try {
      await scheduleDailyStockNotification(settings.dailyNotificationTime);
    } catch (_) {}

    setSaveToast('Settings saved successfully!');
    setTimeout(() => {
      setSaveToast('');
      onClose();
    }, 600);
  }

  const isIos = biometricInfo?.platform === 'ios';
  const lockLabel = isIos
    ? 'Apple Face ID / Touch ID & Passcode'
    : 'Android Fingerprint, Face & Screen Lock';

  const isPinZero = !settings.backupPin || settings.backupPin === '0';

  const timePresets = [
    { label: '8:00 AM', value: '08:00' },
    { label: '9:00 AM', value: '09:00' },
    { label: '10:00 AM', value: '10:00' },
    { label: '1:00 PM', value: '13:00' },
    { label: '6:00 PM', value: '18:00' },
    { label: '9:00 PM', value: '21:00' },
  ];

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal-box">
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-modal-title">
            <i className="fa-solid fa-gear"></i>
            <span>App Settings</span>
          </div>
          <button className="settings-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Content Body */}
        <div className="settings-modal-body">
          {/* SECTION 1: SECURITY & APP PASSWORD */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-shield-halved"></i>
              <span>Security & App Password</span>
            </div>

            <div className="settings-row settings-toggle-row">
              <div className="settings-label-wrap">
                <span className="settings-label">Require App Password & Phone Lock</span>
                <span className="settings-hint">
                  {lockLabel}. Unlocks with your phone lock or password.
                </span>
              </div>
              <label className="settings-switch">
                <input
                  type="checkbox"
                  checked={Boolean(settings.appLockEnabled)}
                  onChange={e => handleToggleBiometric(e.target.checked)}
                />
                <span className="settings-slider"></span>
              </label>
            </div>

            {testStatus && (
              <p className={`settings-status-msg ${testStatus.startsWith('✅') ? 'success' : testStatus.startsWith('❌') ? 'error' : ''}`}>
                {testStatus}
              </p>
            )}

            <div className="settings-btn-group">
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleTestBiometric}
              >
                <i className="fa-solid fa-fingerprint"></i> Test Phone Lock Prompt
              </button>
            </div>

            {/* Backup PIN / Password */}
            <div className="settings-row" style={{ marginTop: '10px', alignItems: 'flex-start' }}>
              <div className="settings-label-wrap">
                <span className="settings-label">Backup App Password</span>
                <span className="settings-hint">
                  {isPinZero
                    ? '⚠️ Password is 0 (Unset) - You will be prompted to set it on next login.'
                    : 'Active 4-digit password used to unlock app.'}
                </span>
              </div>

              <div className="settings-pin-input-group">
                <input
                  type="password"
                  maxLength={4}
                  className="settings-pin-input"
                  value={settings.backupPin || ''}
                  onChange={e => handlePinInput(e.target.value)}
                  placeholder="0"
                  title="4-digit app password"
                />
                <button
                  type="button"
                  className="settings-pin-reset-icon-btn"
                  onClick={handleResetPinToZero}
                  title="Reset password to 0 (ask password on login)"
                  aria-label="Reset password to 0"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: FONT SIZE */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-text-height"></i>
              <span>Font Size</span>
            </div>
            <p className="settings-hint">Adjust text scaling throughout the entire app</p>

            <div className="settings-font-options">
              {[
                { id: 'small', label: 'Small', scale: '88%' },
                { id: 'normal', label: 'Normal', scale: '100%' },
                { id: 'large', label: 'Large', scale: '112%' },
                { id: 'xlarge', label: 'Extra Large', scale: '125%' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`settings-font-pill ${settings.fontSize === opt.id ? 'active' : ''}`}
                  onClick={() => handleFontSizeChange(opt.id)}
                >
                  <span className="font-pill-name">{opt.label}</span>
                  <span className="font-pill-pct">{opt.scale}</span>
                </button>
              ))}
            </div>

            <div className="settings-font-preview">
              <span style={{ fontSize: 'var(--app-font-scale, 100%)', display: 'block', transition: 'font-size 0.2s ease' }}>
                Preview: Sanjay Inventory App text scaling ({settings.fontSize || 'normal'})
              </span>
            </div>
          </div>

          {/* SECTION 3: NOTIFICATION ALERT & DAILY TIME */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-regular fa-bell"></i>
              <span>Notification Alert & Daily Time</span>
            </div>

            {/* Daily Notification Time */}
            <div className="settings-row settings-col-wrap">
              <div className="settings-row" style={{ width: '100%' }}>
                <div className="settings-label-wrap">
                  <span className="settings-label">Daily Reminder Time</span>
                  <span className="settings-hint">Time of day when the daily stock reminder fires</span>
                </div>
                <input
                  type="time"
                  className="settings-time-input"
                  value={settings.dailyNotificationTime || '09:00'}
                  onChange={e => handleTimeChange(e.target.value)}
                />
              </div>

              {/* Quick Time Preset Buttons */}
              <div className="settings-time-presets" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', width: '100%' }}>
                {timePresets.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`settings-time-pill ${settings.dailyNotificationTime === preset.value ? 'active' : ''}`}
                    onClick={() => handleTimeChange(preset.value)}
                    style={{
                      background: settings.dailyNotificationTime === preset.value ? '#2563eb' : '#ffffff',
                      color: settings.dailyNotificationTime === preset.value ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* White Notification Transparency */}
            <div className="settings-row settings-col-wrap">
              <div className="settings-label-wrap">
                <span className="settings-label">White Notification Card Transparency</span>
                <span className="settings-hint">
                  Opacity: {Math.round((settings.whiteNotifTransparency || 0.85) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="1.0"
                step="0.05"
                className="settings-slider-range"
                value={settings.whiteNotifTransparency || 0.85}
                onChange={e => handleTransparencyChange(e.target.value)}
              />

              {/* Live Preview Card */}
              <div
                className="settings-notif-preview"
                style={{
                  background: `rgba(255, 255, 255, ${settings.whiteNotifTransparency || 0.85})`
                }}
              >
                <div className="preview-header">
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ea580c' }}></i>
                  <strong>Low Stock Alert (Preview)</strong>
                </div>
                <p>Notification cards dynamically adjust to this chosen transparency.</p>
              </div>
            </div>
          </div>

          {/* SECTION 4: STOCK LIMITS */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-sliders"></i>
              <span>Stock Threshold Limits</span>
            </div>
            <p className="settings-hint">Configure quantity cutoffs for Out, Low, and In-Stock categorizations</p>

            <div className="settings-limits-grid">
              <div className="settings-limit-card out-limit">
                <div className="limit-card-header">
                  <span className="badge-dot dot-out"></span>
                  <span className="limit-title">Out of Stock</span>
                </div>
                <div className="limit-input-wrap">
                  <span className="limit-prefix">&lt;</span>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={settings.stockLimits?.outLimit ?? 20}
                    onChange={e => handleStockLimitChange('outLimit', e.target.value)}
                  />
                  <span className="limit-unit">units</span>
                </div>
                <span className="limit-desc">Items with quantity below this are Out of Stock</span>
              </div>

              <div className="settings-limit-card low-limit">
                <div className="limit-card-header">
                  <span className="badge-dot dot-low"></span>
                  <span className="limit-title">Low Stock</span>
                </div>
                <div className="limit-input-wrap">
                  <span className="limit-prefix">&lt;</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={settings.stockLimits?.lowLimit ?? 30}
                    onChange={e => handleStockLimitChange('lowLimit', e.target.value)}
                  />
                  <span className="limit-unit">units</span>
                </div>
                <span className="limit-desc">
                  Items between {settings.stockLimits?.outLimit ?? 20} and {(settings.stockLimits?.lowLimit ?? 30) - 1} units
                </span>
              </div>

              <div className="settings-limit-card stocked-limit">
                <div className="limit-card-header">
                  <span className="badge-dot dot-stocked"></span>
                  <span className="limit-title">Fully Stocked</span>
                </div>
                <div className="limit-input-wrap">
                  <span className="limit-prefix">≥</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={settings.stockLimits?.stockedLimit ?? 30}
                    onChange={e => handleStockLimitChange('stockedLimit', e.target.value)}
                  />
                  <span className="limit-unit">units</span>
                </div>
                <span className="limit-desc">
                  Items with {settings.stockLimits?.stockedLimit ?? 30}+ units are fully stocked
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          {saveToast && <span className="settings-save-toast">✅ {saveToast}</span>}
          <button type="button" className="settings-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="settings-btn-save" onClick={handleSave}>
            <i className="fa-solid fa-check"></i> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
