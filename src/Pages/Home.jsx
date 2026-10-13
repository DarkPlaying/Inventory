import React from 'react'
import '../home.css'
import dashboardImg from '../assets/dashboard.png'
import { Link, useNavigate } from 'react-router-dom'
import { useHomeLogic } from '../js/homejs'
import StockStatusModal from '../Components/StockStatusModal'

const Home = () => {
  const navigate = useNavigate()
  const {
    open, setOpen,
    showGraphModal, setShowGraphModal,
    showStatusModal, setShowStatusModal,
    totalf, totaliteam, outstock, sales,
    toast, setToast,
    totalQuantity, conicGradient, pieSlices,
    downloadPieChart
  } = useHomeLogic()

  return (
    <div className="home-page">
      {/* Stock Alert Card UI */}
      {toast && (
        <div className="stock-alert-overlay">
          <div className="stock-alert-card">
            <div className="stock-alert-header">
              <div className="stock-alert-title">
                <i className={`fa-solid ${toast.type === 'error' ? 'fa-triangle-exclamation' :
                  toast.type === 'warning' ? 'fa-circle-exclamation' :
                    'fa-circle-check'
                  }`}></i>
                <span>{toast.type === 'error' ? 'Out of Stock Alert' : toast.type === 'warning' ? 'Low Stock Alert' : 'Stock Notification'}</span>
              </div>
              <button className="stock-alert-close" onClick={() => setToast(null)} title="Close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="stock-alert-body">
              <p className="stock-alert-main-msg">{toast.message}</p>
              <p className="stock-alert-desc">
                {toast.type === 'error'
                  ? 'These items are completely out of stock. Immediate replenishment is advised. Head over to the Menu section to review stock counts or place new orders.'
                  : toast.type === 'warning'
                    ? 'These items have dropped below 20 units. Please check inventory in the Menu section.'
                    : 'All inventory items are currently fully stocked.'}
              </p>
            </div>

            <div className="stock-alert-actions">
              <Link to="/menu" className="stock-btn-goto" onClick={() => setToast(null)}>
                <span>Go to Menu</span>
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
              <button className="stock-btn-cancel" onClick={() => setToast(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)}>
          <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header">
              <span>Navigation</span>
              <i className="fa-solid fa-xmark" onClick={() => setOpen(false)}></i>
            </div>
            <Link to="/" onClick={() => setOpen(false)}>
              <i className="fa-solid fa-chart-column"></i>
              <span>Overview</span>
            </Link>
            <Link to="/menu" onClick={() => setOpen(false)}>
              <i className="fa-solid fa-bars"></i>
              <span>Menu</span>
            </Link>
            <Link to="/business" onClick={() => setOpen(false)}>
              <i className="fa-solid fa-briefcase"></i>
              <span>Business</span>
            </Link>
            <Link to="/profile" onClick={() => setOpen(false)}>
              <i className="fa-solid fa-address-card"></i>
              <span>Profile</span>
            </Link>
          </aside>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="navi">
        <button><i className="fa-solid fa-bars" onClick={() => setOpen(!open)}></i></button>
        <span>Inventory</span>
        <input
          type="text"
          placeholder="search"
          onClick={() => navigate('/search')}
          readOnly
        />
        <i className="fa-regular fa-bell" style={{ cursor: 'pointer' }} onClick={() => setShowStatusModal(true)}></i>
        <Link to="/profile" >
          <i className="fa-solid fa-circle-user"></i></Link>
      </nav>

      {/* Main Content */}
      <main>
        <div className="user"><p>Hello, User! <i className="fa-solid fa-hands-clapping"></i></p></div>
        <div className="title"><h1>Inventory Dashboard :</h1></div>
        <div className="imglogo"><img src={dashboardImg} alt="Inventory Dashboard" /></div>

        <div className="iteamtotal">
          <div className="iteam"> Total Revenue : ${totalf}</div>
        </div>

        <div className="iteams">
          <div className="iteam" style={{ color: "purple" }}>total Items: {totaliteam}</div>
          <div className="iteam" style={{ color: "purple" }}>Out of Stocks: {outstock}</div>
          <div className="iteam" style={{ color: "purple" }}>Total Quantity: {sales}</div>
        </div>

        {/* Graph Card */}
        <div className="graph">
          <h1>Graph</h1>
          <button id="btn" onClick={() => setShowGraphModal(true)}>view</button>
          <button onClick={downloadPieChart}>download</button>
          <i className="fa-solid fa-circle-chevron-left"></i>
          <i className="fa-solid fa-chart-line" onClick={() => setShowGraphModal(true)} style={{ cursor: 'pointer' }}></i>
          <i className="fa-solid fa-circle-chevron-right"></i>
        </div>
      </main>

      {/* Pie Chart Modal based on items table */}
      {showGraphModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-pie">
            <div className="modal-header">
              <span><i className="fa-solid fa-chart-pie pie-icon-header"></i> Stock Pie Chart</span>
              <button className="modal-close" onClick={() => setShowGraphModal(false)}>×</button>
            </div>

            {/* Donut Pie Chart */}
            <div className="pie-chart-wrapper">
              <div
                className="pie-chart-circle"
                style={{ background: `conic-gradient(${conicGradient})` }}
              >
                <div className="pie-chart-center">
                  <strong>{totalQuantity}</strong>
                  <span>Total Qty</span>
                </div>
              </div>
            </div>

            {/* Legend List */}
            <div className="pie-legend-list">
              {pieSlices.map(slice => (
                <div key={slice.id} className="pie-legend-item">
                  <div className="pie-legend-info">
                    <span className="pie-legend-dot" style={{ background: slice.color }}></span>
                    <span>{slice.name}</span>
                  </div>
                  <strong>{slice.quantity} ({slice.percentage}%)</strong>
                </div>
              ))}
            </div>

            <div className="pie-modal-buttons">
              <button type="button" className="pie-download-btn" onClick={downloadPieChart}>
                <i className="fa-solid fa-download"></i> Download Chart
              </button>
              <button type="button" className="modal-btn-submit" onClick={() => setShowGraphModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Status Notification Modal (Bell Icon) */}
      <StockStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Footer Navigation */}
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

export default Home
