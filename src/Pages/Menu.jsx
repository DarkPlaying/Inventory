import React from 'react'
import '../Css/menu.css'
import { Link, useNavigate } from 'react-router-dom'
import { useMenuLogic } from '../js/Menujs.jsx'
import StockStatusModal from '../Components/StockStatusModal'

export default function Menu() {
  const navigate = useNavigate()
  const {
    filter, setFilter,
    searchQuery, setSearchQuery,
    availableCategories,
    categoryOptions,
    displayedItems,
    outItems,
    showAddModal, setShowAddModal,
    showExcelModal, setShowExcelModal,
    showStatusModal, setShowStatusModal,
    form, setForm,
    isCustomCategory, setIsCustomCategory,
    customCategoryInput, setCustomCategoryInput,
    handleAddItem,
    handleExcelUpload,
    downloadSampleExcel,
    handleDeleteItem,
    updateCount,
    toast, setToast
  } = useMenuLogic()

  return (
    <div className="menu-page">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span className="toast-msg">{toast.message}</span>
            <button className="toast-close" onClick={() => setToast(null)}>×</button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="menu-header">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="back-btn"><i className="fa-solid fa-arrow-left-long"></i> Back</button>
        </Link>
        <span className="menu-title">Stocks Menu</span>
        <div className="menu-icons">
          <i className="fa-regular fa-bell" style={{ cursor: 'pointer' }} onClick={() => setShowStatusModal(true)}></i>
          <Link to="/profile" style={{ color: 'inherit', textDecoration: 'none' }}>
            <i className="fa-solid fa-circle-user" style={{ cursor: 'pointer' }}></i>
          </Link>
        </div>
      </header>

      {/* Search, Excel & Add Items Buttons */}
      <div className="search">
        <input
          type="text"
          placeholder="search iteams"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={() => navigate('/search')}
        />
        <button className="search-btn-excel" onClick={() => setShowExcelModal(true)}>
          <i className="fa-solid fa-file-excel"></i> Excel
        </button>
        <button className="search-btn-add" onClick={() => setShowAddModal(true)}>
          <i className="fa-solid fa-plus"></i> Add
        </button>
      </div>

      <main>
        {/* Categories Bar - Showing only available categories */}
        <div className="category">
          {availableCategories.map(cat => (
            <button
              key={cat}
              className={filter === cat ? 'active' : ''}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Out of Stock Banner */}
        {outItems.length > 0 && (
          <div className="outstock">
            <span><i className="fa-solid fa-triangle-exclamation"></i></span>
            <div className="about">
              <h1>Out of Stocks Iteams!</h1>
              <p>{filter === 'OUT' ? 'Showing out of stock items.' : 'Click arrow to filter out of stock.'}</p>
            </div>
            <button onClick={() => setFilter(filter === 'OUT' ? 'All' : 'OUT')}>
              <i className={`fa-solid ${filter === 'OUT' ? 'fa-xmark' : 'fa-circle-arrow-right'}`}></i>
            </button>
          </div>
        )}

        {/* Items Grid */}
        <div className="items-grid">
          {displayedItems.length > 0 ? (
            displayedItems.map(item => (
              <div key={item.id} className="item-card">
                <div className="item-top">
                  <h3 className="item-name">{item.name}</h3>
                  <button
                    className="item-delete"
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    title="Delete item"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
                <div className={`item-badge badge-${item.status.toLowerCase()}`}>
                  <span>{item.status}</span>
                </div>
                <div className="item-stepper">
                  <button className="step-btn" onClick={() => updateCount(item.id, -1)} title="Decrease">
                    <i className="fa-solid fa-minus"></i>
                  </button>
                  <span className="step-count">{item.count}</span>
                  <button className="step-btn" onClick={() => updateCount(item.id, 1)} title="Increase">
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: 'white', textAlign: 'center', gridColumn: '1 / -1' }}>No items found</p>
          )}
        </div>
      </main>

      {/* Excel Upload Modal with Format Preview & Sample Download */}
      {showExcelModal && (
        <div className="modal-overlay">
          <div className="modal-box modal-box-excel">
            <div className="modal-header">
              <span><i className="fa-solid fa-file-excel" style={{ color: '#10b981', marginRight: '6px' }}></i> Excel Import</span>
              <button className="modal-close" onClick={() => setShowExcelModal(false)}>×</button>
            </div>

            <p className="excel-format-title">Expected File Format (.xlsx, .xls, .csv):</p>
            <div className="excel-table-preview">
              <table>
                <thead>
                  <tr>
                    <th>name</th>
                    <th>quantity</th>
                    <th>price</th>
                    <th>dealer_name</th>
                    <th>category</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cotton T-Shirt</td>
                    <td>50</td>
                    <td>19</td>
                    <td>ABC company</td>
                    <td>Clothes</td>
                  </tr>
                  <tr>
                    <td>Slim Fit Jeans</td>
                    <td>35</td>
                    <td>49</td>
                    <td>Denim Co</td>
                    <td>Clothes</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="excel-note">
              * Headers must match the table above. Download the sample Excel template below for testing.
            </p>

            <div className="excel-actions-wrapper">
              <button
                type="button"
                className="excel-sample-download-btn"
                onClick={downloadSampleExcel}
              >
                <i className="fa-solid fa-file-arrow-down"></i> Download Sample Excel
              </button>

              <div className="excel-upload-action">
                <input
                  type="file"
                  id="excel-modal-file-input"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && handleExcelUpload(e.target.files[0])}
                />
                <label htmlFor="excel-modal-file-input" className="excel-upload-action-btn">
                  <i className="fa-solid fa-cloud-arrow-up"></i> Choose & Upload Excel
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal Form (Manual Add Only) */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <span>Add Items</span>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddItem} className="modal-form">
              <label>Name:
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jeans" />
              </label>
              <label>Quantity:
                <input type="number" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 25" />
              </label>
              <label>Price:
                <input type="number" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 30" />
              </label>
              <label>Dealer Name:
                <input value={form.dealer_name} onChange={e => setForm({ ...form, dealer_name: e.target.value })} />
              </label>
              <label>Category:
                <div className="category-select-wrapper">
                  {!isCustomCategory ? (
                    <select
                      className="category-dropdown-select"
                      value={form.category}
                      onChange={e => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategory(true);
                          setCustomCategoryInput('');
                        } else {
                          setForm({ ...form, category: e.target.value });
                        }
                      }}
                    >
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__custom__">➕ + Custom Category</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="custom-category-input"
                      autoFocus
                      required
                      placeholder="Type custom category..."
                      value={customCategoryInput}
                      onChange={e => setCustomCategoryInput(e.target.value)}
                    />
                  )}

                  <button
                    type="button"
                    className={`custom-category-toggle-btn ${isCustomCategory ? 'active' : ''}`}
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      if (isCustomCategory) {
                        setCustomCategoryInput('');
                      }
                    }}
                    title={isCustomCategory ? "Switch to list" : "Enter custom category"}
                  >
                    {isCustomCategory ? (
                      <>
                        <i className="fa-solid fa-list-ul"></i> List
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-plus"></i> Custom
                      </>
                    )}
                  </button>
                </div>
              </label>
              <button type="submit" className="modal-btn-submit">Add Item</button>
            </form>
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