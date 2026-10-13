import React, { useState, useEffect } from 'react'

const PieChart = ({
  totalQuantity = 0,
  pieSlices = [],
  size = 145,
  thickness = 22,
  isExpanded = false,
  onSelect = null
}) => {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Full data: map all slices from Supabase items table
  const segments = React.useMemo(() => {
    if (pieSlices && pieSlices.length > 0) {
      return pieSlices.map((s, idx) => ({
        label: s.name,
        value: Number(s.quantity) || 0,
        color: s.color || '#3b82f6',
        glowColor: s.color || '#3b82f6',
        id: s.id || idx,
        percentage: s.percentage
      }))
    }
    return [
      { label: 'Kurtis', value: 103, color: '#8b5cf6', glowColor: '#8b5cf6' },
      { label: 'Jeans top', value: 85, color: '#10b981', glowColor: '#10b981' },
      { label: 'Crop top', value: 70, color: '#f59e0b', glowColor: '#f59e0b' },
      { label: 'T-Shirt', value: 45, color: '#3b82f6', glowColor: '#3b82f6' }
    ]
  }, [pieSlices])

  const total = segments.reduce((sum, s) => sum + s.value, 0) || totalQuantity || 1
  const chartSize = isExpanded ? 210 : size
  const centerX = chartSize / 2
  const centerY = chartSize / 2

  const outerMargin = 6
  const outerRingOuter = chartSize / 2 - outerMargin
  const outerRingInner = outerRingOuter - (isExpanded ? 28 : thickness)
  const segmentGap = segments.length > 1 ? 0.035 : 0

  const getArcPath = (startAngle, endAngle, outerR, innerR) => {
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    const x1 = centerX + outerR * Math.cos(startAngle)
    const y1 = centerY + outerR * Math.sin(startAngle)
    const x2 = centerX + outerR * Math.cos(endAngle)
    const y2 = centerY + outerR * Math.sin(endAngle)
    const x3 = centerX + innerR * Math.cos(endAngle)
    const y3 = centerY + innerR * Math.sin(endAngle)
    const x4 = centerX + innerR * Math.cos(startAngle)
    const y4 = centerY + innerR * Math.sin(startAngle)
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`
  }

  let cumulative = -Math.PI / 2
  const arcs = segments.map((seg, i) => {
    const angle = total > 0 ? (seg.value / total) * 2 * Math.PI : 0
    const startAngle = cumulative + segmentGap / 2
    const endAngle = cumulative + angle - segmentGap / 2
    cumulative += angle

    const isSelected = selectedIndex === i
    const isAnySelected = selectedIndex !== null
    const expand = isSelected ? 5 : 0

    return {
      ...seg,
      index: i,
      startAngle,
      endAngle,
      path: getArcPath(startAngle, endAngle, outerRingOuter + expand, outerRingInner - expand / 2),
      isSelected,
      opacity: isAnySelected && !isSelected ? 0.28 : 1,
      pct: total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0'
    }
  })

  // Toggle selection: clicking the same slice deselects cleanly
  const handleSliceClick = (index) => {
    const next = selectedIndex === index ? null : index
    setSelectedIndex(next)
    if (onSelect) {
      onSelect(next !== null ? segments[next] : null, total)
    }
  }

  const activeSegment = selectedIndex !== null ? segments[selectedIndex] : null
  const activePct = activeSegment && total > 0 ? ((activeSegment.value / total) * 100).toFixed(1) : null

  // Top 6 items sorted by value for quick pills (like Line and Radar)
  const top6Segments = React.useMemo(() => {
    return segments
      .map((s, idx) => ({ ...s, index: idx }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [segments])

  return (
    <div className={`pie-chart-root ${isExpanded ? 'expanded-layout' : 'compact-layout'}`}>
      {/* Selected Data Details ONLY or "None is selected" message (Top Bar like Line and Radar) */}
      <div className="product-details-display-bar">
        {activeSegment ? (
          <div className="pie-selected-details-card" style={{ borderLeftColor: activeSegment.color }}>
            <div className="details-card-top">
              <div className="details-title-group">
                <span className="details-color-pill" style={{ backgroundColor: activeSegment.color }}></span>
                <strong className="details-card-name" title={activeSegment.label}>{activeSegment.label}</strong>
              </div>
              <div className="details-top-right-actions">
                <span className="details-share-badge">{activePct}%</span>
                <button
                  type="button"
                  className="details-deselect-action"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSliceClick(selectedIndex)
                  }}
                  title="Deselect"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="details-card-stats-grid">
              <div className="details-stat-cell">
                <span className="stat-cell-label">Stock Quantity</span>
                <span className="stat-cell-value val-emerald">{activeSegment.value} units</span>
              </div>
              <div className="details-stat-cell">
                <span className="stat-cell-label">Total Inventory</span>
                <span className="stat-cell-value">{total} units</span>
              </div>
              <div className="details-stat-cell">
                <span className="stat-cell-label">Share</span>
                <span className="stat-cell-value val-purple">{activePct}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="line-none-selected-bar">
            <i className="fa-solid fa-arrow-pointer"></i>
            <span>None is selected — click any pie slice below</span>
          </div>
        )}
      </div>

      {/* SVG Donut Circle - Centered below details */}
      <div className="pie-stage-container">
        <div className="pie-svg-stage" style={{ width: chartSize, height: chartSize }}>
          <svg
            width={chartSize}
            height={chartSize}
            style={{
              transform: mounted ? 'scale(1) rotate(0deg)' : 'scale(0.85) rotate(-15deg)',
              transition: 'transform 0.4s cubic-bezier(0.2, 1, 0.3, 1)',
              overflow: 'visible'
            }}
          >
            <defs>
              <linearGradient id="pieSheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {arcs.map(arc => (
              <g key={arc.label + arc.index}>
                <path
                  d={arc.path}
                  fill={arc.color}
                  opacity={arc.opacity}
                  className="pie-arc-slice"
                  style={{
                    cursor: 'pointer',
                    filter: arc.isSelected ? `drop-shadow(0 0 10px ${arc.color}99)` : 'drop-shadow(0 1px 3px rgba(0,0,0,0.06))',
                    transition: 'all 0.22s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSliceClick(arc.index)
                  }}
                />
                <path
                  d={arc.path}
                  fill="url(#pieSheenGrad)"
                  opacity={arc.opacity * 0.4}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}
          </svg>

          {/* Center Badge */}
          <div className="pie-center-overlay" style={{ pointerEvents: 'none' }}>
            {activeSegment ? (
              <div className="pie-center-active">
                <span className="pie-center-pct">{activePct}%</span>
                <span className="pie-center-name" title={activeSegment.label}>{activeSegment.label}</span>
                <span className="pie-center-units">{activeSegment.value} units</span>
              </div>
            ) : (
              <div className="pie-center-default">
                <span className="pie-center-qty">{total}</span>
                <span className="pie-center-sub">TOTAL QTY</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 6 Items Quick-Select Pills (like Line and Radar) */}
      <div className="top6-product-pills">
        {top6Segments.map((seg, idx) => {
          const isSelected = selectedIndex === seg.index
          return (
            <button
              key={seg.label + idx}
              type="button"
              className={`product-pill ${isSelected ? 'pill-active-emerald' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                handleSliceClick(seg.index)
              }}
              title={seg.label}
            >
              <span className="pill-rank">#{idx + 1}</span>
              <span className="pill-name">{seg.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PieChart
