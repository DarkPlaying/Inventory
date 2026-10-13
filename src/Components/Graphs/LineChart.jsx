import React, { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="line-chart-custom-tooltip">
        <div className="tooltip-title">{label}</div>
        {payload.map((entry, idx) => (
          <div key={idx} className="tooltip-row">
            <span className="tooltip-dot" style={{ backgroundColor: entry.color }}></span>
            <span className="tooltip-label">{entry.name}:</span>
            <strong className="tooltip-value">${Number(entry.value).toLocaleString()}</strong>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const LineChart = ({
  totalRevenue = 0,
  highProduct = null,
  top6Products = [],
  isExpanded = false
}) => {
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Top products list directly from DB items prop
  const products = React.useMemo(() => {
    if (top6Products && top6Products.length > 0) {
      return top6Products.slice(0, 6)
    }
    return []
  }, [top6Products])

  const totalTopRevenue = products.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0) || totalRevenue || 1

  // Chart data: 6 points representing the top 6 products
  const chartData = React.useMemo(() => {
    return products.map((p, idx) => ({
      index: idx + 1,
      rank: `#${idx + 1}`,
      name: p.name,
      shortName: p.name.length > 7 ? `${p.name.slice(0, 6)}..` : p.name,
      revenue: Number(p.revenue) || 0,
      quantity: Number(p.quantity) || 0,
      price: Number(p.price) || 0,
      category: p.category || 'General',
      fullProduct: p
    }))
  }, [products])

  const handleProductSelect = (prod) => {
    // Toggle: clicking the same product deselects it
    setSelectedProduct(prev => prev?.name === prod.name ? null : prod)
  }

  return (
    <div className={`line-chart-root ${isExpanded ? 'line-expanded' : 'line-compact'}`}>
      {/* Selected Product Details ONLY or "None is selected" message */}
      <div className="product-details-display-bar">
        {selectedProduct ? (
          <div className="line-selected-details-card">
            <div className="details-card-top">
              <div className="details-title-group">
                <span className="details-rank-badge">Top Product</span>
                <strong className="details-card-name" title={selectedProduct.name}>{selectedProduct.name}</strong>
              </div>
              <div className="details-top-right-actions">
                <span className="details-share-badge">
                  ${Number(selectedProduct.revenue).toLocaleString()}
                </span>
                <button
                  type="button"
                  className="details-deselect-action"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedProduct(null)
                  }}
                  title="Deselect"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="details-card-stats-grid">
              <div className="details-stat-cell">
                <span className="stat-cell-label">Revenue</span>
                <span className="stat-cell-value val-purple">${Number(selectedProduct.revenue).toLocaleString()}</span>
              </div>
              <div className="details-stat-cell">
                <span className="stat-cell-label">Stock Units</span>
                <span className="stat-cell-value">{selectedProduct.quantity || 0} units</span>
              </div>
              <div className="details-stat-cell">
                <span className="stat-cell-label">Unit Price</span>
                <span className="stat-cell-value">${selectedProduct.price || 0}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="line-none-selected-bar">
            <i className="fa-solid fa-arrow-pointer"></i>
            <span>None is selected — click any product point or pill below</span>
          </div>
        )}
      </div>

      {/* Recharts Line Curve connecting top products */}
      {products.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isExpanded ? 180 : 135, color: '#94a3b8', fontSize: '13px' }}>
          No products available in database
        </div>
      ) : (
        <div className="line-recharts-container" style={{ width: '100%', height: isExpanded ? 180 : 135 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLine
              data={chartData}
              margin={{ top: 12, right: 16, left: -16, bottom: 0 }}
              onClick={(state) => {
                if (state && state.activePayload && state.activePayload.length) {
                  handleProductSelect(state.activePayload[0].payload.fullProduct)
                }
              }}
            >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.05)" vertical={false} />
            <XAxis
              dataKey="shortName"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
              tickMargin={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9.5, fill: '#94a3b8' }}
              tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              tickMargin={4}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={(props) => {
                const isSel = selectedProduct?.name === props.payload.name
                return (
                  <circle
                    key={props.index}
                    cx={props.cx}
                    cy={props.cy}
                    r={isSel ? 6 : 4}
                    fill={isSel ? "#4f46e5" : "#ffffff"}
                    stroke="#4f46e5"
                    strokeWidth={isSel ? 3 : 2}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProductSelect(props.payload.fullProduct)
                    }}
                  />
                )
              }}
              activeDot={{
                r: 7,
                fill: '#4f46e5',
                stroke: '#ffffff',
                strokeWidth: 3
              }}
            />
          </RechartsLine>
        </ResponsiveContainer>
      </div>
      )}

      {/* Top 6 Products Clickable Pills */}
      <div className="top6-product-pills">
        {products.map((p, idx) => {
          const isSel = selectedProduct?.name === p.name
          return (
            <button
              key={p.name + idx}
              type="button"
              className={`product-pill ${isSel ? 'pill-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                handleProductSelect(p)
              }}
              title={p.name}
            >
              <span className="pill-rank">#{idx + 1}</span>
              <span className="pill-name">{p.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LineChart
