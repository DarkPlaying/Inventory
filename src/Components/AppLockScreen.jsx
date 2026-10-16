import React, { useState, useEffect, useRef } from 'react';
import { getAppSettings, saveAppSettings } from '../js/settingsService';
import { authenticateWithBiometrics, checkBiometricAvailability } from '../js/biometricAuth';
import '../Css/appLock.css';

export default function AppLockScreen({ children }) {
  const [settings, setSettings] = useState(getAppSettings);
  const [isLocked, setIsLocked] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [biometricInfo, setBiometricInfo] = useState(null);

  // Setup mode states (when backupPin is '0' or unset)
  const [setupStep, setSetupStep] = useState(1); // 1 = enter new, 2 = confirm
  const [firstPin, setFirstPin] = useState('');

  const isPromptingRef = useRef(false);

  const isPinZero = !settings.backupPin || settings.backupPin === '0';
  const appLockEnabled = Boolean(settings.appLockEnabled);

  // Sync settings when changed from settings modal
  useEffect(() => {
    function onSettingsChanged(e) {
      const updated = e.detail || getAppSettings();
      setSettings(updated);
      const isZero = !updated.backupPin || updated.backupPin === '0';
      if (isZero) {
        setIsLocked(true);
        setSetupStep(1);
        setFirstPin('');
        setPinInput('');
      } else if (!updated.appLockEnabled) {
        setIsLocked(false);
      }
    }

    window.addEventListener('inventory-settings-changed', onSettingsChanged);
    return () => window.removeEventListener('inventory-settings-changed', onSettingsChanged);
  }, []);

  // Check biometric availability
  useEffect(() => {
    checkBiometricAvailability().then(info => {
      setBiometricInfo(info);
    });
  }, []);

  // Relock when app returns from background
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        const cur = getAppSettings();
        const isZero = !cur.backupPin || cur.backupPin === '0';
        if (isZero || cur.appLockEnabled) {
          setIsLocked(true);
          setPinInput('');
          setPinError('');
          if (isZero) {
            setSetupStep(1);
            setFirstPin('');
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // When locked and PIN is configured, auto-trigger biometric prompt once
  useEffect(() => {
    if (isLocked && !isPinZero && appLockEnabled) {
      triggerBiometricUnlock();
    }
  }, [isLocked, isPinZero, appLockEnabled]);

  async function triggerBiometricUnlock() {
    if (isPromptingRef.current) return;
    isPromptingRef.current = true;
    setStatusMessage('Authenticating with phone lock...');

    try {
      const res = await authenticateWithBiometrics({
        title: 'Unlock Inventory App',
        subtitle: 'Scan fingerprint, face, or enter phone lock to access'
      });

      if (res.success) {
        setIsLocked(false);
        setStatusMessage('');
        setPinError('');
        setPinInput('');
      } else {
        setStatusMessage(res.errorMessage || 'Use PIN keypad to unlock');
      }
    } catch (_) {
      setStatusMessage('Enter your app password to unlock');
    } finally {
      isPromptingRef.current = false;
    }
  }

  function handleDigit(digit) {
    if (pinInput.length >= 4) return;
    const next = pinInput + digit;
    setPinInput(next);
    setPinError('');

    // When 4 digits are completed
    if (next.length === 4) {
      if (isPinZero) {
        // SETUP MODE
        if (setupStep === 1) {
          setFirstPin(next);
          setPinInput('');
          setSetupStep(2);
        } else {
          // Confirm step
          if (next === firstPin) {
            // Save as new app password and activate lock
            saveAppSettings({
              backupPin: next,
              appLockEnabled: true
            });
            setStatusMessage('✅ App password set successfully!');
            setTimeout(() => {
              setIsLocked(false);
              setSetupStep(1);
              setFirstPin('');
              setPinInput('');
              setStatusMessage('');
            }, 600);
          } else {
            setPinError('PINs do not match. Please try again.');
            setTimeout(() => {
              setPinInput('');
              setFirstPin('');
              setSetupStep(1);
            }, 800);
          }
        }
      } else {
        // UNLOCK MODE
        const correct = settings.backupPin;
        if (next === correct) {
          setIsLocked(false);
          setPinInput('');
          setPinError('');
          setStatusMessage('');
        } else {
          setPinError('Incorrect PIN. Please try again.');
          setTimeout(() => {
            setPinInput('');
          }, 500);
        }
      }
    }
  }

  function handleBackspace() {
    setPinInput(prev => prev.slice(0, -1));
    setPinError('');
  }

  // If unlocked and lock not required
  if (!isLocked && !isPinZero && !appLockEnabled) {
    return <>{children}</>;
  }

  if (!isLocked) {
    return <>{children}</>;
  }

  const isApple = biometricInfo?.platform === 'ios';

  return (
    <div className="app-lock-overlay">
      <div className="app-lock-card">
        {/* Shield Icon */}
        <div className="app-lock-shield">
          {isPinZero ? (
            <i className="fa-solid fa-key"></i>
          ) : (
            <i className={isApple ? "fa-solid fa-face-smile" : "fa-solid fa-fingerprint"}></i>
          )}
        </div>

        {/* Dynamic Titles */}
        {isPinZero ? (
          <>
            <h2 className="app-lock-title">
              {setupStep === 1 ? 'Set App Password' : 'Confirm Password'}
            </h2>
            <p className="app-lock-desc">
              {setupStep === 1
                ? 'Backup password is 0. Please create a 4-digit PIN for your app:'
                : 'Re-enter your 4-digit PIN to confirm:'}
            </p>
          </>
        ) : (
          <>
            <h2 className="app-lock-title">Inventory Locked</h2>
            <p className="app-lock-desc">
              Enter your 4-digit app password to unlock:
            </p>
          </>
        )}

        {/* Status / Error Messages */}
        {statusMessage && <p className="app-lock-status">{statusMessage}</p>}
        {pinError && <p className="pin-error-text" style={{ color: '#ef4444', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>{pinError}</p>}

        {/* PIN Dots (4 digits) */}
        <div className="pin-dots" style={{ marginBottom: '16px' }}>
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className={`pin-dot ${pinInput.length > i ? 'filled' : ''}`}
            ></span>
          ))}
        </div>

        {/* Keypad */}
        <div className="pin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key, idx) => {
            if (key === '') return <div key={idx} className="pin-key-empty"></div>;
            if (key === 'back') {
              return (
                <button
                  key={idx}
                  type="button"
                  className="pin-key pin-key-back"
                  onClick={handleBackspace}
                >
                  <i className="fa-solid fa-delete-left"></i>
                </button>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                className="pin-key"
                onClick={() => handleDigit(key)}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Biometric Prompt Option when password already configured */}
        {!isPinZero && (
          <button
            type="button"
            className="app-lock-btn-secondary"
            style={{ marginTop: '14px' }}
            onClick={triggerBiometricUnlock}
          >
            <i className={isApple ? "fa-solid fa-face-smile" : "fa-solid fa-fingerprint"}></i>
            <span>{isApple ? 'Unlock with Face ID' : 'Unlock with Fingerprint'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
