import React from 'react';
import { useStockStatus } from '../js/useStockStatus';

export default function StockStatusModal({ isOpen, onClose }) {
  const { total, out, low, stocked } = useStockStatus();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-status">
        <div className="modal-header">
          <span><i className="fa-regular fa-bell status-bell-icon"></i> Stock Status</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="status-summary-list">
          <div className="status-summary-item">
            <span>Total Items:</span>
            <strong>{total}</strong>
          </div>
          <div className="status-summary-item status-item-out">
            <span>Out of Stock (&lt; 20):</span>
            <strong>{out}</strong>
          </div>
          <div className="status-summary-item status-item-low">
            <span>Low Stock (20-29):</span>
            <strong>{low}</strong>
          </div>
          <div className="status-summary-item status-item-stocked">
            <span>Fully Stocked (30+):</span>
            <strong>{stocked}</strong>
          </div>
        </div>

        {out === 0 && low === 0 ? (
          <p className="status-msg-green">
            🟢 All stocks fully loaded! Everything is in green.
          </p>
        ) : (
          <p className="status-msg-sub">
            Review out-of-stock items and restock them from dealers.
          </p>
        )}

        <button className="modal-btn-submit" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
