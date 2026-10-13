import React from 'react'
import '../Css/business.css'
import { Link, useNavigate } from 'react-router-dom'
import { useBusinessLogic } from '../js/businessjs'
import StockStatusModal from '../Components/StockStatusModal'

export default function Business() {
  const navigate = useNavigate()
  const {
    businessData,
    search,
    setSearch,
    loading,
    showStatusModal,
    setShowStatusModal,
    selectedCompany,
    setSelectedCompany
  } = useBusinessLogic()

  return (
    <div className="menu-page">
      <header className="menu-header">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="back-btn">
            <i className="fa-solid fa-arrow-left-long"></i> Back
          </button>
        </Link>

        <span className="menu-title">Business Menu</span>
        <div className="menu-icons">
          <i
            className="fa-regular fa-bell"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowStatusModal(true)}
          ></i>
          <Link to="/profile" style={{ color: 'inherit', textDecoration: 'none' }}>
            <i className="fa-solid fa-circle-user" style={{ cursor: 'pointer' }}></i>
          </Link>
        </div>
      </header>

      <div className="search">
        <input
          type="text"
          placeholder="search companies or items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClick={() => navigate('/search')}
        />
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
            {loading ? (
              <tr>
                <td colSpan="4" className="table-loading-text">Loading companies...</td>
              </tr>
            ) : businessData.length > 0 ? (
              businessData.map((company) => (
                <React.Fragment key={company.id}>
                  {/* Company Group Header Row */}
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

                  {/* Individual Items under Company */}
                  {company.itemList && company.itemList.length > 0 ? (
                    company.itemList.map((item, itemIdx) => (
                      <tr key={item.id || itemIdx} className="company-child-item-row">
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
                  ) : (
                    <tr className="company-child-item-row">
                      <td colSpan="4" className="no-subitems-text">No items listed</td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="table-empty-text">No company records found</td>
              </tr>
            )}
          </tbody>
        </table>
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

            {/* Summary statistics row */}
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

            {/* Scrollable Items Container */}
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

      <footer className="footer">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-chart-column"></i><span>Overview</span></button>
        </Link>
        <Link to="/menu" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-bars"></i><span>Menu</span></button>
        </Link>
        <Link to="/business" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-briefcase"></i><span>Business</span></button>
        </Link>
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-address-card"></i><span>Profile</span></button>
        </Link>
      </footer>
    </div>
  )
}