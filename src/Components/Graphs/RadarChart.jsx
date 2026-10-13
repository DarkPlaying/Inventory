import React, { useState } from 'react'

const CategoryRadarChart = ({
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

  const maxRevenue = Math.max(1, ...products.map(p => Number(p.revenue) || 0))
  const center = { x: 130, y: 75 }
  const radius = 48
  const angles = products.length > 0
    ? products.map((_, i) => (360 / products.length) * i)
    : [0, 60, 120, 180, 240, 300]

  const points = products.map((prod, i) => {
    const rad = (angles[i] - 90) * (Math.PI / 180)
    const ratio = Math.max(0.35, Math.min(1, (Number(prod.revenue) || 0) / maxRevenue))
    return {
      ...prod,
      x: center.x + radius * ratio * Math.cos(rad),
      y: center.y + radius * ratio * Math.sin(rad),
      lx: center.x + (radius + 16) * Math.cos(rad),
      ly: center.y + (radius + 14) * Math.sin(rad),
      ax: center.x + radius * Math.cos(rad),
      ay: center.y + radius * Math.sin(rad),
      shortName: prod.name.length > 8 ? `${prod.name.slice(0, 7)}..` : prod.name
    }
  })

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ')

  const handleProductClick = (prod) => {
    // Toggle: clicking the same product deselects it
    setSelectedProduct(prev => prev?.name === prod.name ? null : prod)
  }

  return (
    <div className={`radar-chart-root ${isExpanded ? 'radar-expanded' : 'radar-compact'}`}>
      {/* Selected Data Details ONLY or "None is selected" message */}
      <div className="product-details-display-bar">
        {selectedProduct ? (
          <div className="radar-selected-details-card">
            <div className="details-card-top">
              <div className="details-title-group">
                <span className="details-rank-badge">Selected Product</span>
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
                <span className="stat-cell-label">Stock Units</span>
                <span className="stat-cell-value val-purple">{selectedProduct.quantity || 0} units</span>
              </div>
              <div className="details-stat-cell">
                <span className="stat-cell-label">Unit Price</span>
                <span className="stat-cell-value">${selectedProduct.price || 0}</span>
              </div>
              <div className="details-stat-cell">
                <span className="stat-cell-label">Category</span>
                <span className="stat-cell-value">{selectedProduct.category || 'General'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="line-none-selected-bar">
            <i className="fa-solid fa-arrow-pointer"></i>
            <span>None is selected — click any vertex point or product pill below</span>
          </div>
        )}
      </div>

      {/* Dynamic Radar Polygon */}
      {products.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isExpanded ? 190 : 140, color: '#94a3b8', fontSize: '13px' }}>
          No products available in database
        </div>
      ) : (
        <div className="radar-svg-container" style={{ width: '100%', height: isExpanded ? 190 : 140 }}>
          <svg viewBox="0 0 260 150" className="radar-chart-svg">
          {/* Concentric spider web hexagons */}
          {[1, 0.68, 0.38].map((scale, sIdx) => {
            const hexPoints = angles.map(deg => {
              const rad = (deg - 90) * (Math.PI / 180)
              const hx = center.x + radius * scale * Math.cos(rad)
              const hy = center.y + radius * scale * Math.sin(rad)
              return `${hx},${hy}`
            }).join(' ')
            return (
              <polygon
                key={sIdx}
                points={hexPoints}
                fill="none"
                stroke="rgba(0,0,0,0.07)"
                strokeWidth="1"
              />
            )
          })}

          {/* Axes from center */}
          {points.map((p, i) => (
            <line
              key={i}
              x1={center.x}
              y1={center.y}
              x2={p.ax}
              y2={p.ay}
              stroke="rgba(0,0,0,0.07)"
              strokeDasharray="2,2"
            />
          ))}

          {/* Radar Polygon Fill */}
          <polygon
            points={polygonPath}
            fill="rgba(139, 92, 246, 0.22)"
            stroke="#8b5cf6"
            strokeWidth="2.5"
          />

          {/* Vertex Dots */}
          {points.map((p, idx) => {
            const isSel = selectedProduct?.name === p.name
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={isSel ? 6.5 : 4}
                fill={isSel ? "#8b5cf6" : "#ffffff"}
                stroke="#8b5cf6"
                strokeWidth={isSel ? 3 : 2}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleProductClick(p)
                }}
              />
            )
          })}

          {/* Labels */}
          {points.map((p, idx) => {
            const isSel = selectedProduct?.name === p.name
            return (
              <text
                key={idx}
                x={p.lx}
                y={p.ly}
                textAnchor="middle"
                fontSize={isSel ? "10.5" : "9"}
                fontWeight={isSel ? "800" : "600"}
                fill={isSel ? "#8b5cf6" : "#64748b"}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleProductClick(p)
                }}
              >
                {p.shortName}
              </text>
            )
          })}
        </svg>
      </div>
      )}

      {/* Top 6 Product Pills Selector */}
      <div className="top6-product-pills">
        {products.map((p, idx) => {
          const isSel = selectedProduct?.name === p.name
          return (
            <button
              key={p.name + idx}
              type="button"
              className={`product-pill ${isSel ? 'pill-active-purple' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                handleProductClick(p)
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

export default CategoryRadarChart
