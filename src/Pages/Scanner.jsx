import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../Css/billing.css';
import useBillingLogic from '../js/billingLogic';
import StockStatusModal from '../Components/StockStatusModal';

export default function Scanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const {
    items,
    loadingItems,
    cart,
    addToCart,
    updateCartCount,
    removeFromCart,
    cartItemsList,
    totalItemsCount,
    grandTotal,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    filteredProducts,
    isScannerOpen,
    setIsScannerOpen,
    isScanning,
    cameraError,
    startCamera,
    stopCamera,
    toggleTorch,
    torchOn,
    torchSupported,
    switchCamera,
    availableCameras,
    handleFileUploadScan,
    showPaymentModal,
    setShowPaymentModal,
    paymentMethod,
    setPaymentMethod,
    isProcessingPayment,
    handleConfirmPaymentAndPlaceOrder,
    paymentSuccessData,
    setPaymentSuccessData,
    toastMsg,
    setToastMsg
  } = useBillingLogic();

  // Manage camera when scanner mode is toggled
  useEffect(() => {
    if (isScannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isScannerOpen]);

  return (
    <div className="billing-page">
      {/* Top Header */}
      <header className="billing-header">
        <button className="billing-back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left-long"></i> Back
        </button>

        <span className="billing-title">
          <i className="fa-solid fa-receipt"></i> Billing & POS
        </span>

        <div className="billing-header-icons">
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

      {/* Static Feedback Toast: Persistent when items are added, removed only if none is added */}
      {toastMsg && (
        <div className={`billing-toast ${toastMsg.type}`}>
          <i className="fa-solid fa-circle-check"></i>
          <span style={{ flex: 1 }}>{toastMsg.text}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              fontSize: '15px',
              padding: '0 4px',
              lineHeight: 1
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Mode Switcher: Cart / Scan Mode Toggle */}
      <div className="billing-mode-switch-card">
        <div className="billing-mode-left">
          <div className="billing-mode-icon-circle">
            <i className={`fa-solid ${isScannerOpen ? 'fa-barcode' : 'fa-cart-shopping'}`}></i>
          </div>
          <div className="billing-mode-titles">
            <h4>{isScannerOpen ? 'Barcode Scan Mode' : 'Products & Cart'}</h4>
            <p>
              {isScannerOpen
                ? 'Scan barcode to add +1 directly to bill'
                : `${totalItemsCount} items selected • $${grandTotal}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`billing-scanner-toggle-btn ${isScannerOpen ? 'btn-active' : ''}`}
          onClick={() => setIsScannerOpen(!isScannerOpen)}
        >
          <i className={`fa-solid ${isScannerOpen ? 'fa-xmark' : 'fa-barcode'}`}></i>
          <span>{isScannerOpen ? 'Close Scan' : 'Scan Product'}</span>
        </button>
      </div>

      {/* Barcode Scanner Viewport (When Scanner Mode is ON) */}
      {isScannerOpen && (
        <div className="billing-scanner-section">
          <div className="billing-viewport-wrapper">
            <div id="billing-scanner-viewfinder"></div>

            {/* Continuous Red Scanning Laser Line Only (No Sample Image) */}
            <div className="billing-laser-box">
              <div className="billing-laser-line"></div>
              {cameraError ? (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <span className="billing-target-hint" style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.45)' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                    {cameraError}
                  </span>
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2563eb',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-rotate-right" style={{ marginRight: '5px' }}></i> Retry Camera
                    </button>
                  </div>
                </div>
              ) : (
                <span className="billing-target-hint">
                  {isScanning ? 'Align barcode inside red laser frame' : 'Activating camera scanner...'}
                </span>
              )}
            </div>
          </div>

          {/* Scanner Controls Toolbar */}
          <div className="billing-scanner-toolbar">
            <button
              type="button"
              className="billing-ctrl-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Scan from Photo or Gallery (Images Only)"
            >
              <i className="fa-solid fa-image"></i>
              <span>Photo / File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUploadScan(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />

            {torchSupported && isScanning && (
              <button
                type="button"
                className={`billing-ctrl-btn ${torchOn ? 'active' : ''}`}
                onClick={toggleTorch}
              >
                <i className="fa-solid fa-bolt"></i>
                <span>{torchOn ? 'Flash Off' : 'Flash'}</span>
              </button>
            )}

            {availableCameras.length > 1 && isScanning && (
              <button
                type="button"
                className="billing-ctrl-btn"
                onClick={switchCamera}
              >
                <i className="fa-solid fa-camera-rotate"></i>
                <span>Flip</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="billing-search-box">
        <i className="fa-solid fa-magnifying-glass" style={{ color: '#64748b' }}></i>
        <input
          type="text"
          placeholder="Search products by name, category or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>

      {/* Category Pills Bar */}
      <div className="billing-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`billing-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products List for Billing & Count Editing */}
      <div className="billing-items-grid">
        {loadingItems ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', color: '#2563eb' }}></i>
            <p style={{ marginTop: '8px', fontSize: '13px' }}>Loading inventory items...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((item) => {
            const currentQtyInCart = cart[item.id] || 0;
            const availableStock = Number(item.quantity) || 0;
            const isOutOfStock = availableStock <= 0;

            return (
              <div key={item.id} className="billing-item-card">
                <div className="billing-item-info">
                  <span className="billing-item-name">{item.name}</span>
                  <div className="billing-item-meta">
                    <span>{item.category || 'General'}</span>
                    <span>•</span>
                    <span className={`billing-stock-tag ${isOutOfStock ? 'out' : ''}`}>
                      {isOutOfStock ? 'OUT OF STOCK' : `${availableStock} in stock`}
                    </span>
                  </div>
                  <span className="billing-item-price-tag">${item.price || 0}</span>
                </div>

                <div className="billing-item-actions">
                  {cart[item.id] !== undefined ? (
                    <div className="billing-stepper-box">
                      <button
                        type="button"
                        className="billing-step-btn"
                        onClick={() => {
                          if ((cart[item.id] || 0) <= 1) {
                            removeFromCart(item.id);
                          } else {
                            addToCart(item, -1);
                          }
                        }}
                        title={cart[item.id] <= 1 ? "Remove from bill" : "Decrease count"}
                      >
                        <i className="fa-solid fa-minus"></i>
                      </button>
                      <input
                        type="number"
                        className="billing-step-qty"
                        value={cart[item.id] === 0 ? '' : cart[item.id]}
                        placeholder="0"
                        min="0"
                        max={availableStock}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateCartCount(item.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="billing-step-btn"
                        onClick={() => addToCart(item, 1)}
                        disabled={(cart[item.id] || 0) >= availableStock}
                        title="Increase count"
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="billing-add-btn"
                      onClick={() => addToCart(item, 1)}
                      disabled={isOutOfStock}
                    >
                      <i className="fa-solid fa-plus"></i>
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            <i className="fa-solid fa-box-open" style={{ fontSize: '32px', marginBottom: '8px' }}></i>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No products found</p>
          </div>
        )}
      </div>

      {/* Floating Checkout / Place Order Bar (Docked when items added) */}
      {cartItemsList.length > 0 && (
        <div className="billing-checkout-bar">
          <div className="billing-checkout-left">
            <span className="billing-checkout-total">${grandTotal}</span>
            <span className="billing-checkout-count">{totalItemsCount} items in bill</span>
          </div>

          <button
            type="button"
            className="billing-place-order-btn"
            onClick={() => setShowPaymentModal(true)}
          >
            <span>Place Order</span>
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      )}

      {/* Payment Modal with Sample QR Code */}
      {showPaymentModal && (
        <div className="billing-modal-overlay">
          <div className="billing-modal-box">
            <div className="billing-modal-header">
              <span className="billing-modal-title">
                <i className="fa-solid fa-qrcode" style={{ color: '#2563eb' }}></i>
                <span>Payment & Order</span>
              </span>
              <button
                type="button"
                className="billing-modal-close"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="billing-pay-tabs">
              <button
                type="button"
                className={`billing-pay-tab ${paymentMethod === 'qr' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('qr')}
              >
                <i className="fa-solid fa-qrcode"></i>
                <span>Scan QR</span>
              </button>
              <button
                type="button"
                className={`billing-pay-tab ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <i className="fa-solid fa-money-bill-wave"></i>
                <span>Cash</span>
              </button>
              <button
                type="button"
                className={`billing-pay-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <i className="fa-solid fa-credit-card"></i>
                <span>Card</span>
              </button>
            </div>

            {/* QR Code Display (Default) */}
            {paymentMethod === 'qr' && (
              <div className="billing-qr-container">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `upi://pay?pa=inventory.store@bank&pn=InventoryStore&am=${grandTotal}&cu=USD`
                  )}`}
                  alt="Sample Payment QR Code"
                  className="billing-qr-img"
                />
                <p className="billing-qr-instruction">Scan with Any Payment App</p>
                <p className="billing-qr-subtext">Payee: Inventory Store POS</p>
                <div className="billing-qr-amount-pill">Total: ${grandTotal}</div>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '14px', marginBottom: '14px' }}>
                <i className="fa-solid fa-money-bill-1-wave" style={{ fontSize: '40px', color: '#10b981', marginBottom: '8px' }}></i>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Cash Payment</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Collect <strong>${grandTotal}</strong> in cash from customer.</p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '14px', marginBottom: '14px' }}>
                <i className="fa-solid fa-credit-card" style={{ fontSize: '40px', color: '#2563eb', marginBottom: '8px' }}></i>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>POS Card Terminal</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Swipe, insert or tap customer card for <strong>${grandTotal}</strong>.</p>
              </div>
            )}

            {/* Order Items Breakdown */}
            <div className="billing-order-breakdown">
              {cartItemsList.map((entry) => (
                <div key={entry.id} className="billing-breakdown-row">
                  <span>
                    {entry.name} <strong>× {entry.quantity}</strong>
                  </span>
                  <span>${entry.total}</span>
                </div>
              ))}
              <div className="billing-breakdown-row total">
                <span>Total Amount:</span>
                <span style={{ color: '#10b981' }}>${grandTotal}</span>
              </div>
            </div>

            {/* Confirm Payment Button */}
            <button
              type="button"
              className="billing-confirm-pay-btn"
              onClick={handleConfirmPaymentAndPlaceOrder}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Processing Order & Updating DB...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  <span>Confirm Payment (${grandTotal})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payment Success Receipt Screen */}
      {paymentSuccessData && (
        <div className="billing-modal-overlay">
          <div className="billing-modal-box">
            <div className="billing-receipt-card">
              <div className="billing-receipt-check">
                <i className="fa-solid fa-check"></i>
              </div>

              <h3>Order Completed! 🎉</h3>
              <p>Payment received and inventory stock deducted in database.</p>

              <div className="billing-receipt-meta">
                <div className="billing-receipt-meta-row">
                  <span>Receipt #:</span>
                  <strong>{paymentSuccessData.receiptId}</strong>
                </div>
                <div className="billing-receipt-meta-row">
                  <span>Date:</span>
                  <span>{paymentSuccessData.date}</span>
                </div>
                <div className="billing-receipt-meta-row">
                  <span>Method:</span>
                  <span>{paymentSuccessData.paymentMethod}</span>
                </div>
                <div className="billing-receipt-meta-row">
                  <span>Items Count:</span>
                  <span>{paymentSuccessData.totalItems} items</span>
                </div>
                <div className="billing-receipt-meta-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '15px' }}>
                  <strong>Amount Paid:</strong>
                  <strong style={{ color: '#10b981' }}>${paymentSuccessData.grandTotal}</strong>
                </div>
              </div>

              <div className="billing-receipt-actions">
                <button
                  type="button"
                  className="billing-btn-goto-menu"
                  onClick={() => {
                    setPaymentSuccessData(null);
                    navigate('/menu');
                  }}
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>Return to Menu</span>
                </button>

                <button
                  type="button"
                  className="billing-btn-new-sale"
                  onClick={() => setPaymentSuccessData(null)}
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>New Sale</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Status Notification Modal */}
      <StockStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Floating Bottom Footer - Universal auto-scaled tabs */}
      <footer className="footer">
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
          <button><i className="fa-solid fa-chart-column"></i><span>Overview</span></button>
        </Link>
        <Link to="/menu" style={{ textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
          <button><i className="fa-solid fa-bars"></i><span>Menu</span></button>
        </Link>
        <Link to="/scanner" style={{ textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
          <button className="active-nav"><i className="fa-solid fa-receipt"></i><span>Billing</span></button>
        </Link>
        <Link to="/business" style={{ textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
          <button><i className="fa-solid fa-briefcase"></i><span>Business</span></button>
        </Link>
        <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
          <button><i className="fa-solid fa-address-card"></i><span>Profile</span></button>
        </Link>
      </footer>
    </div>
  );
}
