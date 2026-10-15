import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../Css/scanner.css';
import useScannerLogic from '../js/scannerLogic';
import StockStatusModal from '../Components/StockStatusModal';

export default function Scanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [filterLinkQuery, setFilterLinkQuery] = useState('');

  const {
    items,
    loadingItems,
    activeItem,
    setActiveItem,
    scanMode,
    setScanMode,
    isScanning,
    cameraError,
    manualCode,
    setManualCode,
    unrecognizedBarcode,
    setUnrecognizedBarcode,
    showStatusModal,
    setShowStatusModal,
    recentScans,
    editQty,
    setEditQty,
    isUpdatingDb,
    scanFeedbackMsg,
    availableCameras,
    torchOn,
    torchSupported,
    startCamera,
    stopCamera,
    toggleTorch,
    switchCamera,
    handleFileUploadScan,
    handleBarcodeDecoded,
    linkBarcodeToItem,
    updateInventoryInDb
  } = useScannerLogic();

  // Automatically start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Handle manual input submit
  const handleManualSubmit = (e) => {
    e?.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDecoded(manualCode.trim());
    setManualCode('');
  };

  // Handle manual stepper delta
  const handleDelta = (delta) => {
    setEditQty(prev => Math.max(0, (Number(prev) || 0) + delta));
  };

  // Save modified count directly to Supabase
  const handleSaveCount = async () => {
    if (!activeItem) return;
    await updateInventoryInDb(activeItem, editQty);
  };

  // Filter items for unrecognized barcode linking modal
  const filteredLinkItems = items.filter(i => {
    if (!filterLinkQuery.trim()) return true;
    const q = filterLinkQuery.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      String(i.id).includes(q)
    );
  });

  return (
    <div className="scanner-page">
      {/* Top Header */}
      <header className="scanner-header">
        <button className="scanner-back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left-long"></i> Back
        </button>

        <span className="scanner-title">
          <i className="fa-solid fa-barcode"></i> Product Scanner
        </span>

        <div className="scanner-header-icons">
          <i
            className="fa-regular fa-bell"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowStatusModal(true)}
            title="Stock Notifications"
          ></i>
          <Link to="/profile" style={{ color: 'inherit', textDecoration: 'none' }}>
            <i className="fa-solid fa-circle-user" style={{ cursor: 'pointer' }}></i>
          </Link>
        </div>
      </header>

      {/* Real-time Feedback Banner */}
      {scanFeedbackMsg && (
        <div className={`scanner-feedback-banner ${scanFeedbackMsg.type}`}>
          <i className={`fa-solid ${
            scanFeedbackMsg.type === 'success' ? 'fa-circle-check' :
            scanFeedbackMsg.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'
          }`}></i>
          <span>{scanFeedbackMsg.text}</span>
        </div>
      )}

      {/* Compact Scan Mode Selector (No Clipping) */}
      <div className="scanner-mode-bar">
        <button
          type="button"
          className={`scanner-mode-btn ${scanMode === 'inspect' ? 'active' : ''}`}
          onClick={() => setScanMode('inspect')}
        >
          <i className="fa-solid fa-sliders"></i>
          <span>Adjust</span>
        </button>
        <button
          type="button"
          className={`scanner-mode-btn mode-increment ${scanMode === 'increment' ? 'active' : ''}`}
          onClick={() => setScanMode('increment')}
        >
          <i className="fa-solid fa-plus"></i>
          <span>+1 Stock</span>
        </button>
        <button
          type="button"
          className={`scanner-mode-btn mode-decrement ${scanMode === 'decrement' ? 'active' : ''}`}
          onClick={() => setScanMode('decrement')}
        >
          <i className="fa-solid fa-minus"></i>
          <span>-1 Stock</span>
        </button>
      </div>

      {/* Camera Viewfinder Card */}
      <div className="scanner-card">
        <div className="scanner-viewport-wrapper">
          <div
            id="scanner-viewfinder"
            style={{ display: isScanning ? 'block' : 'none' }}
          ></div>

          {isScanning && (
            <div className="scanner-laser-box">
              <div className="scanner-laser-line"></div>
              <span className="scanner-target-hint">Align barcode inside frame</span>
            </div>
          )}

          {!isScanning && (
            <div className="scanner-inactive-prompt">
              <div className="scanner-cam-icon-circle">
                <i className="fa-solid fa-camera"></i>
              </div>
              <h3 className="scanner-prompt-title">Barcode Scanner</h3>
              <p className="scanner-prompt-desc">
                {cameraError ? 'Camera access needed to scan barcodes.' : 'Point camera at product barcode or QR code.'}
              </p>
              {cameraError && (
                <div className="scanner-perm-badge">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>Permission required</span>
                </div>
              )}
              <button
                type="button"
                className="scanner-start-cam-btn"
                onClick={() => startCamera()}
              >
                <i className="fa-solid fa-play"></i>
                <span>Start Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Camera Control Toolbar */}
        <div className="scanner-controls-toolbar">
          <button
            type="button"
            className="scanner-ctrl-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Scan from Photo or Gallery"
          >
            <i className="fa-solid fa-image"></i>
            <span>Photo / File</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUploadScan(e.target.files[0]);
              }
            }}
          />

          {torchSupported && isScanning && (
            <button
              type="button"
              className={`scanner-ctrl-btn ${torchOn ? 'active' : ''}`}
              onClick={toggleTorch}
              title="Toggle Flashlight"
            >
              <i className="fa-solid fa-bolt"></i>
              <span>{torchOn ? 'Flash Off' : 'Flash'}</span>
            </button>
          )}

          {availableCameras.length > 1 && isScanning && (
            <button
              type="button"
              className="scanner-ctrl-btn"
              onClick={switchCamera}
              title="Switch Camera Lens"
            >
              <i className="fa-solid fa-camera-rotate"></i>
              <span>Flip</span>
            </button>
          )}

          {isScanning ? (
            <button
              type="button"
              className="scanner-ctrl-btn btn-stop"
              onClick={stopCamera}
              title="Pause Camera"
            >
              <i className="fa-solid fa-pause"></i>
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              className="scanner-ctrl-btn btn-resume"
              onClick={() => startCamera()}
              title="Resume Camera"
            >
              <i className="fa-solid fa-play"></i>
              <span>Resume</span>
            </button>
          )}
        </div>

        {/* Clean Manual Barcode Search Row */}
        <div className="scanner-manual-box">
          <form className="scanner-manual-input-row" onSubmit={handleManualSubmit}>
            <div className="scanner-search-field-box">
              <i className="fa-solid fa-magnifying-glass scanner-search-lead-icon"></i>
              <input
                type="text"
                className="scanner-manual-input"
                placeholder="Search name, ID or barcode..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              {manualCode && (
                <button
                  type="button"
                  className="scanner-clear-input-btn"
                  onClick={() => setManualCode('')}
                >
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="scanner-manual-submit-btn">
              <span>Find</span>
            </button>
          </form>

          {/* Quick Demo Test Barcodes */}
          {items.length > 0 && (
            <div className="scanner-quick-test-section">
              <span className="scanner-quick-test-label">Demo Quick Scan:</span>
              <div className="scanner-quick-chips">
                {items.slice(0, 4).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="scanner-test-chip"
                    onClick={() => handleBarcodeDecoded(String(item.id))}
                    title={`Test scan #${item.id} ${item.name}`}
                  >
                    #{item.id} {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Scanned Product & Stock Count Modifier */}
      {activeItem && (
        <div className="scanner-product-card">
          <div className="scanner-product-card-top">
            <div className="scanner-product-identity">
              <h3>{activeItem.name}</h3>
              <div className="scanner-product-meta">
                <span><i className="fa-solid fa-tag"></i> {activeItem.category || 'General'}</span>
                <span>•</span>
                <span><i className="fa-solid fa-building"></i> {activeItem.dealer_name || 'ABC company'}</span>
                <span>•</span>
                <span>ID: #{activeItem.id}</span>
              </div>
            </div>

            <span className={`scanner-status-badge ${
              Number(activeItem.quantity) < 20 || activeItem.status === 'OUT'
                ? 'badge-out'
                : Number(activeItem.quantity) < 30
                  ? 'badge-low'
                  : 'badge-stocked'
            }`}>
              {Number(activeItem.quantity) < 20 || activeItem.status === 'OUT'
                ? 'OUT OF STOCK'
                : Number(activeItem.quantity) < 30
                  ? 'LOW STOCK'
                  : 'STOCKED'}
            </span>
          </div>

          <div className="scanner-product-pricing-row">
            <div className="scanner-price-box">
              <span className="scanner-price-label">Unit Price</span>
              <span className="scanner-price-val">${activeItem.price || 0}</span>
            </div>
            <div className="scanner-price-box">
              <span className="scanner-price-label">Current Stock</span>
              <span className="scanner-price-val">{activeItem.quantity} units</span>
            </div>
            <div className="scanner-price-box">
              <span className="scanner-price-label">Stock Value</span>
              <span className="scanner-price-val">
                ${(Number(activeItem.quantity) || 0) * (Number(activeItem.price) || 0)}
              </span>
            </div>
          </div>

          {/* Quantity Stepper & Direct Input */}
          <div className="scanner-qty-edit-box">
            <div className="scanner-qty-edit-label">
              <span>Modify Inventory Count:</span>
              <span className="scanner-db-live-tag">
                <span className="scanner-db-live-dot"></span> Connected to DB
              </span>
            </div>

            <div className="scanner-stepper-row">
              <button
                type="button"
                className="scanner-step-btn btn-minus"
                onClick={() => handleDelta(-1)}
                title="Decrease 1"
              >
                <i className="fa-solid fa-minus"></i>
              </button>

              <input
                type="number"
                className="scanner-qty-input"
                min="0"
                value={editQty}
                onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />

              <button
                type="button"
                className="scanner-step-btn btn-plus"
                onClick={() => handleDelta(1)}
                title="Increase 1"
              >
                <i className="fa-solid fa-plus"></i>
              </button>
            </div>

            {/* Quick Adjustment Pills */}
            <div className="scanner-quick-deltas">
              <button type="button" className="scanner-delta-pill pill-minus" onClick={() => handleDelta(-10)}>-10</button>
              <button type="button" className="scanner-delta-pill pill-minus" onClick={() => handleDelta(-5)}>-5</button>
              <button type="button" className="scanner-delta-pill pill-minus" onClick={() => handleDelta(-1)}>-1</button>
              <button type="button" className="scanner-delta-pill pill-plus" onClick={() => handleDelta(1)}>+1</button>
              <button type="button" className="scanner-delta-pill pill-plus" onClick={() => handleDelta(5)}>+5</button>
              <button type="button" className="scanner-delta-pill pill-plus" onClick={() => handleDelta(10)}>+10</button>
            </div>

            <div className="scanner-card-actions">
              <button
                type="button"
                className="scanner-save-db-btn"
                onClick={handleSaveCount}
                disabled={isUpdatingDb}
              >
                {isUpdatingDb ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Saving to DB...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span>Update DB Count</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="scanner-close-item-btn"
                onClick={() => setActiveItem(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Session Modifications */}
      {recentScans.length > 0 && (
        <div className="scanner-history-card">
          <div className="scanner-history-header">
            <span className="scanner-history-title">
              <i className="fa-solid fa-clock-rotate-left"></i> Session History
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{recentScans.length} scans</span>
          </div>

          <div className="scanner-history-list">
            {recentScans.map((scan) => (
              <div key={scan.id} className="scanner-history-item">
                <div className="scanner-hist-left">
                  <span className="scanner-hist-name">{scan.name}</span>
                  <span className="scanner-hist-time">{scan.timestamp} • {scan.oldQty} ➔ {scan.newQty}</span>
                </div>
                <div className="scanner-hist-right">
                  <span className={`scanner-hist-diff ${scan.deltaText?.startsWith('+') ? 'diff-plus' : 'diff-minus'}`}>
                    {scan.deltaText}
                  </span>
                  <span className="scanner-hist-qty">{scan.newQty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unrecognized Barcode Link Modal */}
      {unrecognizedBarcode && (
        <div className="scanner-modal-overlay">
          <div className="scanner-link-modal">
            <div className="scanner-link-modal-header">
              <div className="scanner-link-modal-title">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>Link Unrecognized Barcode</span>
              </div>
              <button
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                onClick={() => setUnrecognizedBarcode(null)}
              >
                ×
              </button>
            </div>

            <p style={{ margin: '4px 0 10px 0', fontSize: '13px', color: '#475569' }}>
              Scanned code: <span className="scanner-barcode-pill">{unrecognizedBarcode}</span>
            </p>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b' }}>
              Select which item from your database corresponds to this barcode. It will be remembered automatically:
            </p>

            <input
              type="text"
              className="scanner-manual-input"
              placeholder="Filter products..."
              value={filterLinkQuery}
              onChange={(e) => setFilterLinkQuery(e.target.value)}
              style={{ marginBottom: '10px' }}
            />

            <div className="scanner-link-items-list">
              {filteredLinkItems.map(item => (
                <div
                  key={item.id}
                  className="scanner-link-item-row"
                  onClick={() => linkBarcodeToItem(item.id)}
                >
                  <div className="scanner-link-item-info">
                    <strong>{item.name}</strong>
                    <span>{item.category} • Current stock: {item.quantity}</span>
                  </div>
                  <span className="scanner-link-action-tag">Link Item</span>
                </div>
              ))}
              {filteredLinkItems.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '16px' }}>
                  No matching database items found.
                </p>
              )}
            </div>

            <button
              className="scanner-close-item-btn"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => setUnrecognizedBarcode(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stock Status Modal */}
      <StockStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Floating Bottom Footer - Perfectly matching Menu / Business / Profile */}
      <footer className="footer">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-chart-column"></i><span>Overview</span></button>
        </Link>
        <Link to="/menu" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-bars"></i><span>Menu</span></button>
        </Link>
        <Link to="/scanner" style={{ textDecoration: 'none' }}>
          <button className="active-nav"><i className="fa-solid fa-barcode"></i><span>Scanner</span></button>
        </Link>
        <Link to="/business" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-briefcase"></i><span>Business</span></button>
        </Link>
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-address-card"></i><span>Profile</span></button>
        </Link>
      </footer>
    </div>
  );
}
