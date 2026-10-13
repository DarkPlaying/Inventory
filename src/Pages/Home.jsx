import React from 'react'
import '../home.css'
import dashboardImg from '../assets/dashboard.png'
import { Link, useNavigate } from 'react-router-dom'
import { useHomeLogic } from '../js/homejs'
import StockStatusModal from '../Components/StockStatusModal'
import { PieChart, LineChart, RadarChart } from '../Components/Graphs'

const Home = () => {
  const navigate = useNavigate()
  // Line Chart is default graph at index 0
  const [activeGraphIndex, setActiveGraphIndex] = React.useState(0)
  const [revenueFilter, setRevenueFilter] = React.useState('Weekly')

  const {
    open, setOpen,
    showGraphModal, setShowGraphModal,
    showStatusModal, setShowStatusModal,
    totalf, totaliteam, outstock, sales,
    items,
    toast, setToast,
    totalQuantity, conicGradient, pieSlices,
    downloadPieChart
  } = useHomeLogic()

  // 3 Graphs: Line (Default), Pie, Radar
  const graphTitles = ['Revenue Line Chart', 'Stock Pie Chart', 'Category Radar Chart']

  const nextGraph = (e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    setActiveGraphIndex(prev => (prev + 1) % 3)
  }

  const prevGraph = (e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    setActiveGraphIndex(prev => (prev - 1 + 3) % 3)
  }

  const totalClients = React.useMemo(() => {
    if (!items || items.length === 0) return 263
    const count = new Set(items.map(x => x.dealer_name?.trim()).filter(Boolean)).size
    return count > 0 ? count : 263
  }, [items])

  const top6Products = React.useMemo(() => {
    if (!items || items.length === 0) {
      return [
        { name: 'Kurtis', revenue: 28450, quantity: 103, price: 276, category: 'Kurtis' },
        { name: 'Jeans top', revenue: 19550, quantity: 85, price: 230, category: 'Jeans' },
        { name: 'Crop top', revenue: 16100, quantity: 70, price: 230, category: 'Tops' },
        { name: 'T-Shirt', revenue: 10350, quantity: 45, price: 230, category: 'T-Shirts' },
        { name: 'Shoes', revenue: 8500, quantity: 34, price: 250, category: 'Footwear' },
        { name: 'Hoodies', revenue: 7200, quantity: 24, price: 300, category: 'Hoodies' },
      ]
    }
    const mapped = items.map((it, idx) => {
      const p = Number(it.price) || 0
      const q = Number(it.quantity || it.count) || 0
      const rev = Number(it.total_price) > 0 ? Number(it.total_price) : (p * q)
      return {
        id: it.id || idx,
        name: it.name || `Product ${idx + 1}`,
        revenue: rev,
        quantity: q,
        price: p,
        category: it.category || it.name || 'General'
      }
    })
    mapped.sort((a, b) => b.revenue - a.revenue)
    return mapped.slice(0, 6)
  }, [items])

  const highProduct = React.useMemo(() => {
    if (top6Products.length > 0) {
      return top6Products[0]
    }
    return { name: 'Kurtis', revenue: 28450 }
  }, [top6Products])


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
          placeholder={"search items"}
          onClick={() => navigate('/search')}
          readOnly
        />
        <i className="fa-regular fa-bell" style={{ cursor: 'pointer' }} onClick={() => setShowStatusModal(true)}></i>
        <Link to="/profile" >
          <i className="fa-solid fa-circle-user"></i></Link>
      </nav>

      {/* Main Content - Modern Analytics Dashboard UI */}
      <main className="dashboard-main">
        {/* 2x2 Metric Cards Grid */}
        <div className="metrics-grid">
          {/* Card 1: Total Menus */}
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon-box icon-blue">
                <i className="fa-solid fa-table-cells-large"></i>
              </div>
              <span className="metric-label">Total Menus</span>
            </div>
            <div className="metric-value">{totaliteam || 140}</div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon-box icon-purple">
                <i className="fa-solid fa-bag-shopping"></i>
              </div>
              <span className="metric-label">Total Orders</span>
            </div>
            <div className="metric-value">{sales || 175}</div>
          </div>

          {/* Card 3: Total Clients */}
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon-box icon-cyan">
                <i className="fa-solid fa-users"></i>
              </div>
              <span className="metric-label">Total Clients</span>
            </div>
            <div className="metric-value">{totalClients}</div>
          </div>

          {/* Card 4: Total Revenue */}
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon-box icon-emerald">
                <i className="fa-solid fa-dollar-sign"></i>
              </div>
              <span className="metric-label">Total Revenue</span>
            </div>
            <div className="metric-value">${Number(totalf || 81934).toLocaleString()}</div>
          </div>
        </div>

        {/* Graph Card with Carousel: Pie (Default), Line, Radar */}
        <div className="revenue-card">
          <div className="revenue-card-header">
            <h2 className="revenue-title">
              {activeGraphIndex === 0 && <i className="fa-solid fa-chart-line" style={{ color: '#4f46e5' }}></i>}
              {activeGraphIndex === 1 && <i className="fa-solid fa-chart-pie" style={{ color: '#10b981' }}></i>}
              {activeGraphIndex === 2 && <i className="fa-solid fa-dharmachakra" style={{ color: '#8b5cf6' }}></i>}
              <span>{graphTitles[activeGraphIndex]}</span>
            </h2>

            <div
              className="revenue-filter-badge"
              onClick={() => setRevenueFilter(f => f === 'Weekly' ? 'Monthly' : 'Weekly')}
            >
              <span>{revenueFilter}</span>
              <i className="fa-solid fa-chevron-down"></i>
            </div>
          </div>

          {/* Contextual Stats Row */}
          <div className="revenue-stats-row">
            {activeGraphIndex === 0 && (
              <>
                <div className="revenue-stat-item">
                  <div className="revenue-stat-header-label">
                    <span className="stat-legend-dot dot-purple"></span>
                    <span className="revenue-stat-desc">Total Revenue</span>
                  </div>
                  <div className="revenue-stat-number">${Number(totalf || 81934).toLocaleString()}</div>
                </div>
                <div className="revenue-stat-item">
                  <div className="revenue-stat-header-label">
                    <span className="stat-legend-dot dot-cyan"></span>
                    <span className="revenue-stat-desc">High Product</span>
                  </div>
                  <div className="revenue-stat-number stat-cyan">${Number(highProduct.revenue).toLocaleString()}</div>
                </div>
              </>
            )}

            {activeGraphIndex === 1 && (
              <>
                <div className="revenue-stat-item">
                  <div className="revenue-stat-header-label">
                    <span className="stat-legend-dot dot-cyan"></span>
                    <span className="revenue-stat-desc">Total Menus</span>
                  </div>
                  <div className="revenue-stat-number">{totaliteam || 11}</div>
                </div>
                <div className="revenue-stat-item">
                  <div className="revenue-stat-header-label">
                    <span className="stat-legend-dot dot-purple"></span>
                    <span className="revenue-stat-desc">Total Quantity</span>
                  </div>
                  <div className="revenue-stat-number stat-cyan">{sales || totalQuantity}</div>
                </div>
              </>
            )}

            {activeGraphIndex === 2 && (
              <>
                <div className="revenue-stat-item">
                  <div className="revenue-stat-header-label">
                    <span className="stat-legend-dot dot-cyan"></span>
                    <span className="revenue-stat-desc">Categories</span>
                  </div>
                  <div className="revenue-stat-number">5</div>
                </div>
                <div className="revenue-stat-item">
                  <div className="revenue-stat-header-label">
                    <span className="stat-legend-dot dot-purple"></span>
                    <span className="revenue-stat-desc">Top Category</span>
                  </div>
                  <div className="revenue-stat-number stat-cyan">Clothes</div>
                </div>
              </>
            )}

            <div className="revenue-quick-actions">
              <button
                type="button"
                className="chart-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowGraphModal(true)
                }}
                title="Expand Current Graph"
              >
                <i className="fa-solid fa-expand"></i>
              </button>
              {activeGraphIndex === 1 && (
                <button
                  type="button"
                  className="chart-action-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadPieChart()
                  }}
                  title="Download Chart"
                >
                  <i className="fa-solid fa-download"></i>
                </button>
              )}
            </div>
          </div>

          {/* Carousel Stage with Side Arrows (Left & Right) */}
          <div className="chart-carousel-stage">
            <button
              type="button"
              className="chart-side-arrow-btn side-arrow-left"
              onClick={prevGraph}
              title="Previous Graph"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            <div className="chart-active-display">
              {/* Graph 0: Line Chart (Default - Top 6 Products) */}
              {activeGraphIndex === 0 && (
                <LineChart
                  totalRevenue={totalf}
                  highProduct={highProduct}
                  top6Products={top6Products}
                />
              )}

              {/* Graph 1: Pie Chart (Stock Distribution - Full Data) */}
              {activeGraphIndex === 1 && (
                <PieChart
                  totalQuantity={totalQuantity}
                  pieSlices={pieSlices}
                  conicGradient={conicGradient}
                />
              )}

              {/* Graph 2: Radar Chart (Top 6 Products) */}
              {activeGraphIndex === 2 && (
                <RadarChart
                  top6Products={top6Products}
                />
              )}
            </div>

            <button
              type="button"
              className="chart-side-arrow-btn side-arrow-right"
              onClick={nextGraph}
              title="Next Graph"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {/* Dots Indicator (3 Graphs) */}
          <div className="chart-dots-container">
            {[0, 1, 2].map(idx => (
              <span
                key={idx}
                className={`chart-dot ${activeGraphIndex === idx ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveGraphIndex(idx)
                }}
              ></span>
            ))}
          </div>
        </div>
      </main>

      {/* Respective Graph Modal: Shows the clicked/active graph ONLY when clicking the expand icon */}
      {showGraphModal && (
        <div className="modal-overlay" onClick={() => setShowGraphModal(false)}>
          <div className="modal-box modal-box-dynamic" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-header-title">
                {activeGraphIndex === 0 && <><i className="fa-solid fa-chart-line" style={{ color: '#4f46e5' }}></i> Top 6 Products Revenue Trend</>}
                {activeGraphIndex === 1 && <><i className="fa-solid fa-chart-pie" style={{ color: '#10b981' }}></i> Stock Pie Chart</>}
                {activeGraphIndex === 2 && <><i className="fa-solid fa-dharmachakra" style={{ color: '#8b5cf6' }}></i> Top 6 Products Analysis</>}
              </span>
              <button className="modal-close" onClick={() => setShowGraphModal(false)}>×</button>
            </div>

            {/* Modal Body: Respective Graph Content Only */}
            <div className="modal-graph-body">
              {/* Respective Graph 0: Line Chart */}
              {activeGraphIndex === 0 && (
                <LineChart
                  totalRevenue={totalf}
                  highProduct={highProduct}
                  top6Products={top6Products}
                  isExpanded={true}
                />
              )}

              {/* Respective Graph 1: Pie Chart */}
              {activeGraphIndex === 1 && (
                <PieChart
                  totalQuantity={totalQuantity}
                  pieSlices={pieSlices}
                  conicGradient={conicGradient}
                  isExpanded={true}
                />
              )}

              {/* Respective Graph 2: Radar Chart */}
              {activeGraphIndex === 2 && (
                <RadarChart
                  top6Products={top6Products}
                  isExpanded={true}
                />
              )}
            </div>

            <div className="pie-modal-buttons">
              {activeGraphIndex === 1 && (
                <button type="button" className="pie-download-btn" onClick={downloadPieChart}>
                  <i className="fa-solid fa-download"></i> Download Chart
                </button>
              )}
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
