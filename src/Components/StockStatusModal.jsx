import React, { useState, useEffect } from 'react';
import { useStockStatus } from '../js/useStockStatus';

export default function StockStatusModal({ isOpen, onClose, initialFilter = 'all' }) {
  const { total, out, low, stocked, outItems = [], lowItems = [], limits } = useStockStatus();
  const [selectedCategory, setSelectedCategory] = useState(initialFilter);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialFilter || 'all');
    }
  }, [isOpen, initialFilter]);

  if (!isOpen) return null;

  const outLimit = limits?.outLimit ?? 20;
  const lowLimit = limits?.lowLimit ?? 30;
  const stockedLimit = limits?.stockedLimit ?? 30;

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-status" style={{ maxWidth: '420px', width: '92%' }}>
        <div className="modal-header">
          <span><i className="fa-regular fa-bell status-bell-icon"></i> Stock Status</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Interactive Category Selector Pills / Rows */}
        <div className="status-summary-list">
          <div
            className={`status-summary-item ${selectedCategory === 'all' || selectedCategory === 'total' ? 'selected-category' : ''}`}
            onClick={() => setSelectedCategory('total')}
            style={{
              cursor: 'pointer',
              border: selectedCategory === 'all' || selectedCategory === 'total' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px 14px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Total Items:</span>
            <strong>{total}</strong>
          </div>

          <div
            className={`status-summary-item status-item-out ${selectedCategory === 'out' ? 'selected-category' : ''}`}
            onClick={() => setSelectedCategory('out')}
            style={{
              cursor: 'pointer',
              border: selectedCategory === 'out' ? '2px solid #ef4444' : '1px solid #fee2e2',
              borderRadius: '12px',
              padding: '10px 14px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Out of Stock (&lt; {outLimit}):</span>
            <strong style={{ color: '#ef4444' }}>{out}</strong>
          </div>

          <div
            className={`status-summary-item status-item-low ${selectedCategory === 'low' ? 'selected-category' : ''}`}
            onClick={() => setSelectedCategory('low')}
            style={{
              cursor: 'pointer',
              border: selectedCategory === 'low' ? '2px solid #f59e0b' : '1px solid #fef3c7',
              borderRadius: '12px',
              padding: '10px 14px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Low Stock ({outLimit}-{lowLimit - 1}):</span>
            <strong style={{ color: '#d97706' }}>{low}</strong>
          </div>

          <div
            className={`status-summary-item status-item-stocked ${selectedCategory === 'stocked' ? 'selected-category' : ''}`}
            onClick={() => setSelectedCategory('stocked')}
            style={{
              cursor: 'pointer',
              border: selectedCategory === 'stocked' ? '2px solid #10b981' : '1px solid #d1fae5',
              borderRadius: '12px',
              padding: '10px 14px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Fully Stocked ({stockedLimit}+):</span>
            <strong style={{ color: '#059669' }}>{stocked}</strong>
          </div>
        </div>

        {/* Selected Category Details View */}
        <div style={{ marginTop: '14px', padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          {selectedCategory === 'out' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#dc2626', marginBottom: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Out of Stock Products ({outItems.length})
              </div>
              {outItems.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {outItems.map((name, i) => (
                    <span key={i} style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12.5px', color: '#16a34a' }}>
                  🟢 Great! No products currently out of stock.
                </p>
              )}
            </div>
          )}

          {selectedCategory === 'low' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#d97706', marginBottom: '8px' }}>
                <i className="fa-solid fa-circle-exclamation"></i> Low Stock Products ({lowItems.length})
              </div>
              {lowItems.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {lowItems.map((name, i) => (
                    <span key={i} style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12.5px', color: '#16a34a' }}>
                  🟢 All products have sufficient quantity above threshold.
                </p>
              )}
            </div>
          )}

          {(selectedCategory === 'all' || selectedCategory === 'total') && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#2563eb', marginBottom: '4px' }}>
                <i className="fa-solid fa-boxes-stacked"></i> Total Stock Overview ({total} Items)
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Tap "Out of Stock" or "Low Stock" above to view individual item lists.
              </p>
            </div>
          )}

          {selectedCategory === 'stocked' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#059669', marginBottom: '4px' }}>
                <i className="fa-solid fa-check-double"></i> Fully Stocked Items ({stocked})
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#059669' }}>
                These items have {stockedLimit}+ units and are ready for sale.
              </p>
            </div>
          )}
        </div>

        <button className="modal-btn-submit" style={{ marginTop: '14px' }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
