import React, { useState, useEffect } from 'react';
import '../Css/search.css';
import '../Css/business.css';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchLogic } from '../js/searchjs';
import StockStatusModal from './StockStatusModal';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  sendStockAlertNotification,
  scheduleDailyStockNotification
} from '../js/notificationService';
import Swal from 'sweetalert2';

export default function Search() {
  const navigate = useNavigate();
  const [hasNotificationPerm, setHasNotificationPerm] = useState(true);
  const [hidePermPrompt, setHidePermPrompt] = useState(false);

  const {
    query,
    setQuery,
    activeTab,
    setActiveTab,
    filteredItems,
    filteredBusiness,
    loading,
    showStatusModal,
    setShowStatusModal,
    selectedCompany,
    setSelectedCompany,
    handleQuantityChange
  } = useSearchLogic();

  useEffect(() => {
    async function checkPerm() {
      const granted = await checkNotificationPermission();
      setHasNotificationPerm(granted);
    }
    checkPerm();
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setHasNotificationPerm(granted);
    if (granted) {
      await scheduleDailyStockNotification();
      const outList = filteredItems.filter(i => (Number(i.quantity ?? i.count) < 20 || i.status === 'OUT'));
      const lowList = filteredItems.filter(i => (Number(i.quantity ?? i.count) >= 20 && Number(i.quantity ?? i.count) < 30));
      if (outList.length > 0 || lowList.length > 0) {
        await sendStockAlertNotification(
          outList.length,
          lowList.length,
          outList.map(i => i.name),
          lowList.map(i => i.name)
        );
      }
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'success',
        title: 'Notifications enabled for stock alerts and daily updates!',
        showConfirmButton: false,
        timer: 3000
      });
    } else {
      Swal.fire({
        toast: true,
        position: 'top',
        icon: 'info',
        title: 'Notification permission not granted.',
        showConfirmButton: false,
        timer: 2500
      });
    }
  };

  return (
    <div className="search-page">
      {/* Top Header */}
      <header className="search-header">
        <button className="search-back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left-long"></i> Back
        </button>

        <span className="search-title">Search</span>

        <div className="search-header-icons">
          <i
            className="fa-regular fa-bell"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowStatusModal(true)}
          ></i>
          <Link to="/profile" onClick={() => navigate('/profile')} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-circle-user" style={{ cursor: 'pointer' }}></i>
          </Link>
        </div>
      </header>

      {/* Main Search Input */}
      <div className="search-input-box">
        <i className="fa-solid fa-magnifying-glass search-input-icon"></i>
        <input
          type="text"
          className="search-field"
          placeholder="Search items or companies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="search-clear-btn" onClick={() => setQuery('')}>
            ×
          </button>
        )}
      </div>

      {/* Enable Notification Prompt in Search */}
      {!hasNotificationPerm && !hidePermPrompt && (
        <div className="search-notif-prompt-card">
          <div className="search-notif-prompt-left">
            <i className="fa-solid fa-bell search-notif-prompt-bell"></i>
            <div>
              <strong className="search-notif-prompt-title">Stock & Daily Notifications</strong>
              <p className="search-notif-prompt-desc">
                Get outside-app alerts when items are low/out of stock and daily 9 AM reminders.
              </p>
            </div>
          </div>
          <div className="search-notif-prompt-buttons">
            <button
              type="button"
              className="search-notif-prompt-enable-btn"
              onClick={handleEnableNotifications}
            >
              Enable
            </button>
            <button
              type="button"
              className="search-notif-prompt-later-btn"
              onClick={() => setHidePermPrompt(true)}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="search-tabs">
        <button
          className={`search-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All <span className="tab-badge">{filteredItems.length + filteredBusiness.length}</span>
        </button>
        <button
          className={`search-tab-pill ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items <span className="tab-badge">{filteredItems.length}</span>
        </button>
        <button
          className={`search-tab-pill ${activeTab === 'business' ? 'active' : ''}`}
          onClick={() => setActiveTab('business')}
        >
          Business <span className="tab-badge">{filteredBusiness.length}</span>
        </button>
      </div>

      {/* Results Container */}
      <div className="search-results-container">
        {loading ? (
          <div className="search-empty-state">
            <p className="search-empty-subtitle">Loading inventory records...</p>
          </div>
        ) : (
          <>
            {/* Items Cards Section */}
            {(activeTab === 'all' || activeTab === 'items') && filteredItems.length > 0 && (
              <div className="search-section">
                <div className="search-section-header">
                  <div className="section-heading-left">
                    <i className="fa-solid fa-boxes-stacked"></i>
                    <span>Items</span>
                  </div>
                  <span className="section-counter-badge">{filteredItems.length} found</span>
                </div>

                <div className="search-items-grid">
                  {filteredItems.map((item) => {
                    const qty = Number(item.quantity) || 0;
                    const isOut = qty < 20 || item.status === 'OUT';
                    const isLow = qty >= 20 && qty < 30;

                    return (
                      <div key={item.id} className="search-item-card">
                        <div className="search-item-card-top">
                          <h4 className="search-item-card-title" title={item.name}>{item.name}</h4>
                          <span className={`search-item-badge ${
                            isOut ? 'badge-out-stock' : isLow ? 'badge-low-stock' : 'badge-full-stock'
                          }`}>
                            {isOut ? 'OUT' : isLow ? 'LOW' : 'STOCKED'}
                          </span>
                        </div>

                        <div className="search-item-card-mid">
                          <span className="item-card-category">{item.category || 'General'}</span>
                          <span className="item-card-company">{item.dealer_name || 'ABC company'}</span>
                        </div>

                        <div className="search-item-card-bottom">
                          <span className="search-item-card-price">${item.price || 0}</span>
                          <div className="search-qty-controls">
                            <button
                              type="button"
                              className="search-qty-btn"
                              onClick={() => handleQuantityChange(item.id, -1)}
                              title="Decrease"
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <span className="search-qty-value">{qty}</span>
                            <button
                              type="button"
                              className="search-qty-btn"
                              onClick={() => handleQuantityChange(item.id, 1)}
                              title="Increase"
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Business Grouped Table Section */}
            {(activeTab === 'all' || activeTab === 'business') && filteredBusiness.length > 0 && (
              <div className="search-section">
                <div className="search-section-header">
                  <div className="section-heading-left">
                    <i className="fa-solid fa-building"></i>
                    <span>Business Data</span>
                  </div>
                  <span className="section-counter-badge">{filteredBusiness.length} companies</span>
                </div>

                <div className="btable">
                  <table>
                    <thead>
                      <tr>
                        <th className="th-company-item">Company / Item</th>
                        <th className="th-qty">Quantity</th>
                        <th className="th-cost">Cost</th>
                        <th className="th-details">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusiness.map((company) => (
                        <React.Fragment key={company.id}>
                          {/* Company Group Header */}
                          <tr className="company-group-header">
                            <td className="company-group-title">
                              <i className="fa-solid fa-building company-group-icon"></i>
                              <strong>{company.name}</strong>
                            </td>
                            <td className="company-group-qty">
                              <span className="total-qty-pill">{company.quantity} total</span>
                            </td>
                            <td className="company-group-cost">
                              <strong>{company.cost}</strong>
                            </td>
                            <td className="company-group-action">
                              <button
                                className="more-btn"
                                title="View Company Details"
                                onClick={() => setSelectedCompany(company)}
                              >
                                <i className="fa-solid fa-ellipsis"></i>
                              </button>
                            </td>
                          </tr>

                          {/* Child Item Rows */}
                          {company.itemList && company.itemList.length > 0 && (
                            company.itemList.map((item, idx) => (
                              <tr key={item.id || idx} className="company-child-item-row">
                                <td className="company-child-item-name">
                                  <span className="item-tree-branch">└</span>
                                  <span className="item-name-text">{item.name}</span>
                                  <span className="item-category-tag">{item.category}</span>
                                </td>
                                <td className="company-child-item-qty">
                                  <strong className="child-qty-number">{item.quantity}</strong>
                                </td>
                                <td className="company-child-item-cost">
                                  ${item.total}
                                </td>
                                <td className="company-child-empty"></td>
                              </tr>
                            ))
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredItems.length === 0 && filteredBusiness.length === 0 && (
              <div className="search-empty-state">
                <i className="fa-solid fa-magnifying-glass search-empty-icon"></i>
                <h3 className="search-empty-title">No Results Found</h3>
                <p className="search-empty-subtitle">
                  No matching items or business records found for "{query}".
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Company Details Card Modal */}
      {selectedCompany && (
        <div className="company-modal-overlay">
          <div className="company-card-modal">
            <div className="company-card-header">
              <div className="company-title-area">
                <i className="fa-solid fa-building company-icon"></i>
                <div>
                  <h2 className="company-title-text">{selectedCompany.name}</h2>
                  <p className="company-subtitle-text">{selectedCompany.distinctCount || selectedCompany.itemList?.length || 0} Products Supplied</p>
                </div>
              </div>
              <button className="company-close-btn" onClick={() => setSelectedCompany(null)}>×</button>
            </div>

            <div className="company-stats-grid">
              <div className="company-stat-box">
                <span className="stat-label">Total Qty</span>
                <strong className="stat-val">{selectedCompany.quantity}</strong>
              </div>
              <div className="company-stat-box">
                <span className="stat-label">Total Cost</span>
                <strong className="stat-val stat-cost">{selectedCompany.cost}</strong>
              </div>
              <div className="company-stat-box">
                <span className="stat-label">Items Count</span>
                <strong className="stat-val">{selectedCompany.itemList?.length || 0}</strong>
              </div>
            </div>

            <div className="company-items-section">
              <div className="section-label">All Item Details:</div>
              <div className="company-items-scrollable">
                {selectedCompany.itemList && selectedCompany.itemList.length > 0 ? (
                  selectedCompany.itemList.map((item, idx) => (
                    <div key={item.id || idx} className="company-item-card">
                      <div className="company-item-main">
                        <span className="company-item-name">{item.name}</span>
                        <span className="company-item-category">{item.category}</span>
                      </div>
                      <div className="company-item-details">
                        <div className="item-qty-price">
                          <span>Qty: <strong>{item.quantity}</strong></span>
                          <span>Price: <strong>${item.price}</strong></span>
                          <span>Total: <strong>${item.total}</strong></span>
                        </div>
                        <span className={`stock-badge ${
                          item.quantity < 20 || item.status === 'OUT' ? 'badge-out' :
                          item.quantity < 30 ? 'badge-low' : 'badge-stocked'
                        }`}>
                          {item.quantity < 20 || item.status === 'OUT' ? 'Out of Stock' :
                           item.quantity < 30 ? 'Low Stock' : 'Stocked'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-items-text">No detailed item records found.</p>
                )}
              </div>
            </div>

            <button className="company-card-close-action" onClick={() => setSelectedCompany(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stock Status Notification Modal */}
      <StockStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Bottom Footer */}
      <footer className="footer">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-chart-column"></i><span>Overview</span></button>
        </Link>
        <Link to="/menu" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-bars"></i> Menu </button>
        </Link>
        <Link to="/business" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-briefcase"></i> Business </button>
        </Link>
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <button onClick={() => navigate('/profile')}><i className="fa-solid fa-address-card"></i><span>Profile</span></button>
        </Link>
      </footer>
    </div>
  );
}
