import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  requestPinStockWidget,
  getPreferredWidgetSize,
  setPreferredWidgetSize,
  getStoredWidgetTheme,
  setStoredWidgetTheme,
  syncStockAndTasksToWidget
} from '../js/widgetSync';
import Swal from 'sweetalert2';

export default function AddWidgetModal({
  isOpen,
  onClose,
  items = [],
  totaliteam = 0,
  lowStock = 0,
  outStock = 0,
  tasksCount = 0,
  nominalRevenue = 0,
  nominalBalance = 0
}) {
  const [selectedSize, setSelectedSize] = useState(() => getPreferredWidgetSize() || 'large');
  const [previewTheme, setPreviewTheme] = useState(() => getStoredWidgetTheme() || 'light');
  const [step, setStep] = useState('select'); // 'select' | 'ios-guide' | 'android-success'
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const platform = Capacitor.getPlatform();
  const isIos = platform === 'ios';
  const isAndroid = platform === 'android';

  const total = Number(totaliteam) || (items ? items.length : 89);
  const low = Number(lowStock) || 0;
  const out = Number(outStock) || 0;
  const stocked = Math.max(0, total - low - out);
  const tasks = Number(tasksCount) || 0;
  const balance = Number(nominalBalance) || 26852;
  const revenue = Number(nominalRevenue) || balance;

  const togglePreviewTheme = () => {
    const next = previewTheme === 'dark' ? 'light' : 'dark';
    setPreviewTheme(next);
    setStoredWidgetTheme(next);
    syncStockAndTasksToWidget({
      totalItems: total,
      lowStockCount: low,
      outOfStockCount: out,
      tasksCount: tasks,
      nominalBalance: balance,
      nominalRevenue: revenue,
      widgetTheme: next
    });
  };

  const handleSelectSize = (size) => {
    setSelectedSize(size);
    setPreferredWidgetSize(size);
  };

  const handleAddWidget = async () => {
    setIsSubmitting(true);
    try {
      const res = await requestPinStockWidget(selectedSize);

      if (isAndroid) {
        if (res && res.supported) {
          // Android system dialog opened
          Swal.fire({
            icon: 'success',
            title: 'Adding Widget to Home Screen',
            text: 'Please confirm "Add to Home screen" on the system popup to place your widget!',
            confirmButtonColor: '#2563eb',
            timer: 4000
          });
          onClose();
        } else {
          // Fallback guide if launcher doesn't support requestPinAppWidget
          setStep('android-guide');
        }
      } else if (isIos) {
        // iOS requires user to add from the home screen edit mode
        setStep('ios-guide');
      } else {
        // Web / desktop preview
        Swal.fire({
          icon: 'info',
          title: 'Widget Size Configured!',
          html: `<p>Your preferred size <strong>${selectedSize.toUpperCase()}</strong> has been saved.</p>
                 <p style="font-size:13px; color:#64748b; margin-top:8px;">When installed on your Android (APK) or iPhone (IPA), the widget will default to this layout.</p>`,
          confirmButtonColor: '#2563eb'
        });
        onClose();
      }
    } catch (err) {
      console.warn('Error adding widget:', err);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = previewTheme === 'dark';

  return (
    <div className="add-widget-modal-overlay" onClick={onClose}>
      <div
        className="add-widget-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="add-widget-header">
          <div className="add-widget-header-title">
            <div className="add-widget-icon-pill">
              <i className="fa-solid fa-layer-group"></i>
            </div>
            <div>
              <h3>Add Home Screen Widget</h3>
              <p>Keep live stock alerts, balance &amp; aiming on your phone</p>
            </div>
          </div>
          <button type="button" className="add-widget-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {step === 'select' && (
          <div className="add-widget-body">
            {/* Theme Toggle Bar */}
            <div className="add-widget-theme-row">
              <span className="add-widget-section-label">Choose Widget Size &amp; Layout:</span>
              <button
                type="button"
                className={`add-widget-theme-toggle ${isDark ? 'dark' : 'light'}`}
                onClick={togglePreviewTheme}
                title="Toggle widget preview theme"
              >
                <span>{isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
              </button>
            </div>

            {/* 3 Size Selection Cards */}
            <div className="widget-size-cards">
              {/* Option 1: Small (2x2) */}
              <div
                className={`widget-size-card ${selectedSize === 'small' ? 'selected' : ''}`}
                onClick={() => handleSelectSize('small')}
              >
                <div className="widget-size-card-header">
                  <span className="widget-size-badge">Compact 2×2</span>
                  {selectedSize === 'small' && (
                    <span className="widget-size-check">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  )}
                </div>
                <div className="widget-size-card-title">Small</div>
                <div className="widget-size-card-desc">
                  Circular donut ring with real-time stock alert badges (Low, Out &amp; Tasks).
                </div>
              </div>

              {/* Option 2: Medium (4x2) */}
              <div
                className={`widget-size-card ${selectedSize === 'medium' ? 'selected' : ''}`}
                onClick={() => handleSelectSize('medium')}
              >
                <div className="widget-size-card-header">
                  <span className="widget-size-badge">Standard 4×2</span>
                  {selectedSize === 'medium' && (
                    <span className="widget-size-check">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  )}
                </div>
                <div className="widget-size-card-title">Medium</div>
                <div className="widget-size-card-desc">
                  Two-column view: Donut stock distribution + today's live stock aiming reminder.
                </div>
              </div>

              {/* Option 3: Large (4x4 Long) - Recommended */}
              <div
                className={`widget-size-card ${selectedSize === 'large' ? 'selected' : ''}`}
                onClick={() => handleSelectSize('large')}
              >
                <div className="widget-size-card-header">
                  <span className="widget-size-badge highlight">4×4 • Recommended</span>
                  {selectedSize === 'large' && (
                    <span className="widget-size-check">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                  )}
                </div>
                <div className="widget-size-card-title">Large (Dashboard)</div>
                <div className="widget-size-card-desc">
                  Full dashboard with 4 KPI cards (Balance, Total Stock, Revenue, Tasks) &amp; period tabs.
                </div>
              </div>
            </div>

            {/* Live Visual Widget Mockup Preview */}
            <div className="widget-preview-section">
              <div className="widget-preview-header">
                <span>Interactive Live Preview ({selectedSize.toUpperCase()})</span>
                <span className="widget-preview-platform-pill">
                  {isIos ? 'iOS Widget' : isAndroid ? 'Android Widget' : 'Universal Mobile Widget'}
                </span>
              </div>

              <div className={`widget-preview-canvas ${selectedSize} ${isDark ? 'dark' : 'light'}`}>
                {/* SMALL WIDGET PREVIEW */}
                {selectedSize === 'small' && (
                  <div className="mockup-small-widget">
                    <div className="mockup-header-row">
                      <div className="mockup-dot amber"></div>
                      <span className="mockup-title">Stock Activity</span>
                    </div>
                    <div className="mockup-donut-wrap">
                      <div className="mockup-donut-circle">
                        <span className="mockup-donut-number">{total}</span>
                        <span className="mockup-donut-label">Total</span>
                      </div>
                    </div>
                    <div className="mockup-badges-row">
                      <span className="mockup-badge cyan">{total}</span>
                      <span className="mockup-badge amber">{low}</span>
                      <span className="mockup-badge pink">{out}</span>
                      <span className="mockup-badge emerald">{tasks}T</span>
                    </div>
                  </div>
                )}

                {/* MEDIUM WIDGET PREVIEW */}
                {selectedSize === 'medium' && (
                  <div className="mockup-medium-widget">
                    <div className="mockup-med-left">
                      <div className="mockup-header-row">
                        <div className="mockup-dot amber"></div>
                        <span className="mockup-title">Stock Activity</span>
                      </div>
                      <div className="mockup-donut-wrap small">
                        <div className="mockup-donut-circle small">
                          <span className="mockup-donut-number">{total}</span>
                          <span className="mockup-donut-label">Items</span>
                        </div>
                      </div>
                      <div className="mockup-badges-row">
                        <span className="mockup-badge amber">{low} Low</span>
                        <span className="mockup-badge pink">{out} Out</span>
                      </div>
                    </div>
                    <div className="mockup-med-right">
                      <div className="mockup-aim-header">
                        <i className="fa-solid fa-bullseye"></i>
                        <span>Today's Stock Aim</span>
                      </div>
                      <div className="mockup-aim-card">
                        <p className="mockup-aim-text">
                          {tasks > 0 ? `${tasks} stock aiming tasks scheduled` : 'All stock targets completed!'}
                        </p>
                        <span className="mockup-aim-pill">Auto Synced</span>
                      </div>
                      <div className="mockup-med-kpi-row">
                        <div className="mockup-mini-kpi">
                          <span>Balance</span>
                          <strong>${balance.toLocaleString()}</strong>
                        </div>
                        <div className="mockup-mini-kpi">
                          <span>Revenue</span>
                          <strong>${revenue.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* LARGE WIDGET PREVIEW */}
                {selectedSize === 'large' && (
                  <div className="mockup-large-widget">
                    <div className="mockup-large-header">
                      <div className="mockup-large-brand">
                        <div className="mockup-dot cyan"></div>
                        <span className="mockup-large-title">Stock &amp; Aiming</span>
                        <span className="mockup-live-pill">Live</span>
                      </div>
                      <div className="mockup-theme-indicator">
                        {isDark ? '🌙' : '☀️'}
                      </div>
                    </div>

                    {/* 4 KPI Metric Cards */}
                    <div className="mockup-kpi-grid">
                      <div className="mockup-kpi-card blue">
                        <span className="mockup-kpi-label">Nominal Balance</span>
                        <span className="mockup-kpi-val">${balance.toLocaleString()}</span>
                      </div>
                      <div className="mockup-kpi-card purple">
                        <span className="mockup-kpi-label">Total Stock</span>
                        <span className="mockup-kpi-val">{total} Items</span>
                      </div>
                      <div className="mockup-kpi-card emerald">
                        <span className="mockup-kpi-label">Nominal Revenue</span>
                        <span className="mockup-kpi-val">${revenue.toLocaleString()}</span>
                      </div>
                      <div className="mockup-kpi-card amber">
                        <span className="mockup-kpi-label">Remaining Tasks</span>
                        <span className="mockup-kpi-val">{tasks} Tasks</span>
                      </div>
                    </div>

                    {/* Stock Status Bar */}
                    <div className="mockup-bars-section">
                      <div className="mockup-bar-row">
                        <span>Stocked ({stocked})</span>
                        <div className="mockup-progress-bg">
                          <div
                            className="mockup-progress-fill cyan"
                            style={{ width: `${Math.min(100, (stocked / Math.max(1, total)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="mockup-bar-row">
                        <span>Low / Out Alert ({low + out})</span>
                        <div className="mockup-progress-bg">
                          <div
                            className="mockup-progress-fill pink"
                            style={{ width: `${Math.min(100, ((low + out) / Math.max(1, total)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Period Tabs */}
                    <div className="mockup-tabs-row">
                      <span className="mockup-tab active">Total</span>
                      <span className="mockup-tab">1W</span>
                      <span className="mockup-tab">1M</span>
                      <span className="mockup-tab">1Y</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons: Allow or Not */}
            <div className="add-widget-actions">
              <button
                type="button"
                className="add-widget-btn-cancel"
                onClick={onClose}
              >
                Not Now
              </button>
              <button
                type="button"
                className="add-widget-btn-primary"
                onClick={handleAddWidget}
                disabled={isSubmitting}
              >
                <i className="fa-solid fa-plus"></i>
                <span>Add to Home Screen</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP: iOS STEP-BY-STEP GUIDE */}
        {step === 'ios-guide' && (
          <div className="add-widget-guide-body">
            <div className="ios-guide-badge">
              <i className="fa-brands fa-apple"></i>
              <span>iOS Home Screen Instructions</span>
            </div>
            <h4>Adding the Widget to iPhone / iPad:</h4>
            <div className="ios-guide-steps">
              <div className="ios-guide-step">
                <div className="ios-step-num">1</div>
                <div className="ios-step-text">
                  <strong>Enter Jiggle Mode:</strong>
                  <p>Go to your iPhone Home Screen. Touch and hold any empty area until apps start jiggling.</p>
                </div>
              </div>
              <div className="ios-guide-step">
                <div className="ios-step-num">2</div>
                <div className="ios-step-text">
                  <strong>Tap the "+" Button:</strong>
                  <p>Tap the <strong>+</strong> button in the top left corner to open the iOS Widget Gallery.</p>
                </div>
              </div>
              <div className="ios-guide-step">
                <div className="ios-step-num">3</div>
                <div className="ios-step-text">
                  <strong>Select Your Size &amp; Add:</strong>
                  <p>
                    Search <strong>InventoryApp</strong> (Stock &amp; Task Reminder), swipe to your chosen{' '}
                    <strong>{selectedSize.toUpperCase()}</strong> size, and tap <strong>Add Widget</strong>!
                  </p>
                </div>
              </div>
            </div>

            <div className="add-widget-actions">
              <button
                type="button"
                className="add-widget-btn-primary full-width"
                onClick={onClose}
              >
                <i className="fa-solid fa-check"></i>
                <span>Got It, Take Me Home</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP: Android Guide Fallback */}
        {step === 'android-guide' && (
          <div className="add-widget-guide-body">
            <div className="ios-guide-badge android">
              <i className="fa-brands fa-android"></i>
              <span>Android Home Screen Instructions</span>
            </div>
            <h4>Place Widget Manually:</h4>
            <div className="ios-guide-steps">
              <div className="ios-guide-step">
                <div className="ios-step-num">1</div>
                <div className="ios-step-text">
                  <strong>Long-press Home Screen:</strong>
                  <p>Touch and hold any empty area on your home screen.</p>
                </div>
              </div>
              <div className="ios-guide-step">
                <div className="ios-step-num">2</div>
                <div className="ios-step-text">
                  <strong>Select Widgets:</strong>
                  <p>Tap the <strong>Widgets</strong> icon from the popup menu.</p>
                </div>
              </div>
              <div className="ios-guide-step">
                <div className="ios-step-num">3</div>
                <div className="ios-step-text">
                  <strong>Drag InventoryApp:</strong>
                  <p>
                    Scroll to <strong>InventoryApp</strong> and drag your preferred{' '}
                    <strong>{selectedSize.toUpperCase()}</strong> widget onto your screen!
                  </p>
                </div>
              </div>
            </div>

            <div className="add-widget-actions">
              <button
                type="button"
                className="add-widget-btn-primary full-width"
                onClick={onClose}
              >
                <i className="fa-solid fa-check"></i>
                <span>Done</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
