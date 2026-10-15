import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  fetchTasksFromDB,
  createTaskInDB,
  toggleTaskStatusInDB,
  deleteTaskFromDB,
  getTodayDateString,
  getTomorrowDateString,
  triggerInstantTaskNotification
} from '../js/taskLogic';
import { syncStockAndTasksToWidget, getStoredWidgetTheme, setStoredWidgetTheme } from '../js/widgetSync';

export default function StockTasksModal({ isOpen, onClose, items = [], totaliteam = 0, lowStock = 0, outStock = 0 }) {
  const [tasks, setTasks] = useState([]);
  const [widgetTheme, setWidgetTheme] = useState(() => getStoredWidgetTheme());
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [filterTab, setFilterTab] = useState('today'); // 'today' | 'tomorrow' | 'all' | 'completed'
  const [isCreating, setIsCreating] = useState(false);
  const [showWidgetGuide, setShowWidgetGuide] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customStockName, setCustomStockName] = useState('');
  const [targetAim, setTargetAim] = useState(50);
  const [taskTitle, setTaskTitle] = useState('');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [priority, setPriority] = useState('high');
  const [taskType, setTaskType] = useState('restock');
  const [notes, setNotes] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Load real tasks from Supabase DB on open
  useEffect(() => {
    if (isOpen) {
      loadDbTasks();
    }
  }, [isOpen, items]);

  const loadDbTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetchTasksFromDB(items);
      setTasks(res.tasks || []);
      setIsDbConnected(res.isDbConnected);
    } finally {
      setIsLoading(false);
    }
  };

  // When selecting an item from the real inventory items, autofill name & suggested target
  const handleItemSelect = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    if (id) {
      const found = items.find(it => String(it.id) === String(id));
      if (found) {
        const currentQty = Number(found.quantity) || 0;
        const suggestedAim = Math.max(currentQty + 20, 50);
        setCustomStockName(found.name);
        setTargetAim(suggestedAim);
        setTaskTitle(`Restock ${found.name} to aim ${suggestedAim} units`);
      }
    }
  };

  // Create Task in DB
  const handleCreateTask = async (e) => {
    e.preventDefault();
    const stockName = (customStockName || '').trim();
    if (!stockName && !taskTitle.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Details',
        text: 'Please select an item or specify a stock name.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    const matchedItem = items.find(it => String(it.id) === String(selectedItemId) || it.name?.toLowerCase() === stockName.toLowerCase());
    const currentQty = matchedItem ? Number(matchedItem.quantity) || 0 : 0;

    const taskInput = {
      title: taskTitle.trim() || `Aim ${targetAim} units for ${stockName}`,
      stockItemId: matchedItem?.id || null,
      stockItemName: stockName || matchedItem?.name || 'Stock Item',
      currentStock: currentQty,
      targetAim: Number(targetAim) || 50,
      dueDate: dueDate || getTodayDateString(),
      dueTime: '09:00',
      type: taskType,
      priority,
      status: 'pending',
      notes: notes.trim()
    };

    const { task, isDb } = await createTaskInDB(taskInput, items);
    setTasks(prev => [task, ...prev]);

    // Reset Form
    setIsCreating(false);
    setSelectedItemId('');
    setCustomStockName('');
    setTargetAim(50);
    setTaskTitle('');
    setNotes('');

    Swal.fire({
      icon: 'success',
      title: isDb ? 'Saved to Database!' : 'Task Saved!',
      text: `Daily reminder configured for ${task.dueDate === getTodayDateString() ? 'Today' : 'Tomorrow'}.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Toggle Task Completion in DB
  const handleToggleComplete = async (task) => {
    const updated = await toggleTaskStatusInDB(task.id, task.status, items);
    setTasks(updated);
  };

  // Delete Task from DB
  const handleDeleteTask = (task) => {
    Swal.fire({
      title: 'Delete Task?',
      text: `Remove "${task.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updated = await deleteTaskFromDB(task.id, items);
        setTasks(updated);
      }
    });
  };

  // Test Instant Notification
  const handleTestNotification = async () => {
    setIsSendingNotif(true);
    try {
      const ok = await triggerInstantTaskNotification(tasks);
      Swal.fire({
        icon: ok ? 'success' : 'info',
        title: ok ? 'Notification Sent!' : 'Notification Triggered',
        text: 'Check your phone notification drawer or lock screen for today and tomorrow stock tasks.',
        timer: 3000,
        showConfirmButton: true
      });
    } finally {
      setIsSendingNotif(false);
    }
  };

  // Change Widget Theme (Light or Dark)
  const handleWidgetThemeChange = async (theme) => {
    setWidgetTheme(theme);
    setStoredWidgetTheme(theme);
    await syncStockAndTasksToWidget({
      totalItems: items.length || totaliteam,
      lowStockCount: lowStock,
      outOfStockCount: outStock,
      tasks,
      widgetTheme: theme
    });
    Swal.fire({
      icon: 'success',
      title: 'Widget Theme Updated!',
      text: `Switched widget to ${theme === 'dark' ? 'Black / Dark' : 'White / Light'} theme. Check your home screen!`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const copySqlToClipboard = () => {
    const sql = `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.stock_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    stock_item_id BIGINT REFERENCES public.items(id) ON DELETE SET NULL,
    stock_item_name TEXT NOT NULL,
    current_stock NUMERIC DEFAULT 0,
    target_aim NUMERIC NOT NULL DEFAULT 50,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TEXT DEFAULT '09:00',
    type TEXT DEFAULT 'restock',
    priority TEXT DEFAULT 'high',
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all stock_tasks" ON public.stock_tasks FOR ALL USING (true);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS target_aim NUMERIC DEFAULT 50;`;

    navigator.clipboard.writeText(sql);
    Swal.fire({
      icon: 'success',
      title: 'SQL Copied!',
      text: 'Paste and run in your Supabase SQL Editor.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Counts for tabs
  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  const todayCount = tasks.filter(t => t.dueDate === todayStr && t.status !== 'completed').length;
  const tomorrowCount = tasks.filter(t => t.dueDate === tomorrowStr && t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const filteredTasks = useMemo(() => {
    if (filterTab === 'today') {
      return tasks.filter(t => t.dueDate === todayStr && t.status !== 'completed');
    }
    if (filterTab === 'tomorrow') {
      return tasks.filter(t => t.dueDate === tomorrowStr && t.status !== 'completed');
    }
    if (filterTab === 'completed') {
      return tasks.filter(t => t.status === 'completed');
    }
    return tasks; // 'all'
  }, [tasks, filterTab, todayStr, tomorrowStr]);

  if (!isOpen) return null;

  return (
    <div className="stock-task-modal-overlay" onClick={onClose}>
      <div className="stock-task-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="stock-task-header">
          {/* Top Row: Title, DB Badge, and Close Button */}
          <div className="stock-task-header-top">
            <div className="stock-task-title-group">
              <div className="stock-task-icon-badge">
                <i className="fa-solid fa-bullseye"></i>
              </div>
              <div className="stock-task-title-text">
                <h2 className="stock-task-main-title">Stock Tasks &amp; Aiming</h2>
                <span className={`db-status-pill ${isDbConnected ? 'connected' : 'offline'}`} title={isDbConnected ? 'Connected to Supabase DB' : 'Using Local Storage'}>
                  <i className={`fa-solid ${isDbConnected ? 'fa-database' : 'fa-hard-drive'}`}></i>
                  {isDbConnected ? 'DB Live' : 'Storage'}
                </span>
              </div>
            </div>
            <button type="button" className="stock-task-close-btn" onClick={onClose} title="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Subtitle & Quick Tools Row */}
          <div className="stock-task-header-tools">
            <span className="stock-task-subtitle">Daily notification &amp; home widget reminder</span>
            <div className="stock-task-header-btns">
              <button
                type="button"
                className="stock-task-btn-action"
                onClick={handleTestNotification}
                disabled={isSendingNotif}
                title="Test notification for Today & Tomorrow tasks right now"
              >
                <i className="fa-solid fa-bell"></i>
                <span>{isSendingNotif ? 'Sending...' : 'Test Notif'}</span>
              </button>
              <button
                type="button"
                className="stock-task-btn-action widget-guide-btn"
                onClick={() => setShowWidgetGuide(!showWidgetGuide)}
                title="View instructions to add Widget on Home Screen"
              >
                <i className="fa-solid fa-table-columns"></i>
                <span>Widget</span>
              </button>
            </div>
          </div>
        </div>

        {/* Database SQL Setup Banner (if table not in DB yet) */}
        {!isDbConnected && (
          <div className="stock-db-banner">
            <i className="fa-solid fa-circle-info"></i>
            <span>Supabase <code>stock_tasks</code> table not yet detected. Using persistent local storage.</span>
            <button type="button" className="db-sql-btn" onClick={() => setShowSqlModal(true)}>
              <i className="fa-solid fa-code"></i> View SQL
            </button>
          </div>
        )}

        {/* SQL Modal */}
        {showSqlModal && (
          <div className="stock-widget-guide-card" style={{ marginBottom: '12px' }}>
            <div className="guide-header">
              <i className="fa-solid fa-database"></i>
              <strong>Supabase SQL Script</strong>
              <button type="button" onClick={() => setShowSqlModal(false)}>×</button>
            </div>
            <div className="guide-body">
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b' }}>
                Run this in your Supabase SQL Editor to enable direct cloud database sync for tasks:
              </p>
              <pre style={{
                background: '#0f172a',
                color: '#38bdf8',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '11px',
                overflowX: 'auto',
                maxHeight: '130px'
              }}>
{`CREATE TABLE IF NOT EXISTS public.stock_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    stock_item_id BIGINT REFERENCES public.items(id) ON DELETE SET NULL,
    stock_item_name TEXT NOT NULL,
    current_stock NUMERIC DEFAULT 0,
    target_aim NUMERIC NOT NULL DEFAULT 50,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TEXT DEFAULT '09:00',
    type TEXT DEFAULT 'restock',
    priority TEXT DEFAULT 'high',
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.stock_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all stock_tasks" ON public.stock_tasks FOR ALL USING (true);
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS target_aim NUMERIC DEFAULT 50;`}
              </pre>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="form-submit-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={copySqlToClipboard}>
                  <i className="fa-solid fa-copy"></i> Copy SQL Query
                </button>
                <button type="button" className="form-cancel-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={loadDbTasks}>
                  <i className="fa-solid fa-rotate-right"></i> Check Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Widget Installation Guide & Theme Settings Banner */}
        {showWidgetGuide && (
          <div className="stock-widget-guide-card">
            <div className="guide-header">
              <i className="fa-solid fa-mobile-screen-button"></i>
              <strong>Home Screen Widget &amp; Theme Settings</strong>
              <button type="button" onClick={() => setShowWidgetGuide(false)}>×</button>
            </div>
            <div className="guide-body">
              {/* Theme Selector */}
              <div className="widget-theme-selector-box">
                <div className="theme-selector-label">
                  <i className="fa-solid fa-palette"></i>
                  <span>Widget Color Theme:</span>
                </div>
                <div className="theme-toggle-chips">
                  <button
                    type="button"
                    className={`theme-chip light ${widgetTheme === 'light' ? 'active' : ''}`}
                    onClick={() => handleWidgetThemeChange('light')}
                  >
                    <span className="chip-dot light-dot"></span>
                    <span>⚪ Light (White)</span>
                  </button>
                  <button
                    type="button"
                    className={`theme-chip dark ${widgetTheme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleWidgetThemeChange('dark')}
                  >
                    <span className="chip-dot dark-dot"></span>
                    <span>⚫ Black Theme</span>
                  </button>
                </div>
              </div>

              <div className="guide-step">
                <span className="step-num">Android (APK)</span>
                <p>Long-press an empty space on your Android Home screen ➔ tap <strong>Widgets</strong> ➔ find <strong>InventoryApp</strong> ➔ drag the <strong>Stock &amp; Tasks Reminder</strong> widget to your screen! (You can also tap the <strong>🌓 Theme</strong> button directly on the widget to switch colors anytime).</p>
              </div>
              <div className="guide-step">
                <span className="step-num">iOS (IPA)</span>
                <p>Long-press the <strong>InventoryApp</strong> icon on your iPhone home screen to view Quick Action Widget shortcuts, and receive daily 9:00 AM lock-screen task summaries.</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar: Create Task Button + Filter Tabs */}
        <div className="stock-task-actions-row">
          <button
            type="button"
            className="stock-task-create-btn"
            onClick={() => setIsCreating(!isCreating)}
          >
            <i className={`fa-solid ${isCreating ? 'fa-minus' : 'fa-plus'}`}></i>
            <span>{isCreating ? 'Cancel' : 'New Stock Aim Task'}</span>
          </button>

          <div className="stock-task-filter-tabs">
            <button
              type="button"
              className={`filter-tab ${filterTab === 'today' ? 'active' : ''}`}
              onClick={() => setFilterTab('today')}
            >
              Today <span className="tab-pill">{todayCount}</span>
            </button>
            <button
              type="button"
              className={`filter-tab ${filterTab === 'tomorrow' ? 'active' : ''}`}
              onClick={() => setFilterTab('tomorrow')}
            >
              Tomorrow <span className="tab-pill">{tomorrowCount}</span>
            </button>
            <button
              type="button"
              className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All <span className="tab-pill">{tasks.length}</span>
            </button>
            <button
              type="button"
              className={`filter-tab ${filterTab === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterTab('completed')}
            >
              Done <span className="tab-pill">{completedCount}</span>
            </button>
          </div>
        </div>

        {/* Create Task Form (Collapsible) */}
        {isCreating && (
          <form className="stock-task-create-form" onSubmit={handleCreateTask}>
            <div className="form-section-title">
              <i className="fa-solid fa-bullseye"></i> Set New Stock Aim &amp; Daily Task
            </div>

            <div className="form-row">
              <div className="form-col">
                <label>Select Inventory Item (from DB)</label>
                <select value={selectedItemId} onChange={handleItemSelect} className="form-select">
                  <option value="">-- Choose from inventory items --</option>
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.name} (Stock: {it.quantity ?? 0} {it.status ? `• ${it.status}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-col">
                <label>Stock / Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cotton T-Shirt, Denim Jeans..."
                  value={customStockName}
                  onChange={(e) => setCustomStockName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <label>Aiming Target Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={targetAim}
                  onChange={(e) => setTargetAim(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-col">
                <label>Task Type</label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="form-select">
                  <option value="restock">Restock Aim Target</option>
                  <option value="aim">Target Stock Audit</option>
                  <option value="supplier">Order from Supplier</option>
                  <option value="check">Quality &amp; Expiry Check</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <label>Task Title / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Restock 50 units before weekend"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-col">
                <label>Due Date (Daily Reminder)</label>
                <div className="date-quick-picker">
                  <button
                    type="button"
                    className={`date-chip ${dueDate === todayStr ? 'selected' : ''}`}
                    onClick={() => setDueDate(todayStr)}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`date-chip ${dueDate === tomorrowStr ? 'selected' : ''}`}
                    onClick={() => setDueDate(tomorrowStr)}
                  >
                    Tomorrow
                  </button>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="date-input-field"
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="form-select">
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🔵 Normal Priority</option>
                </select>
              </div>

              <div className="form-col">
                <label>Notes / Instructions (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Call supplier if delayed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-footer">
              <button type="submit" className="form-submit-btn">
                <i className="fa-solid fa-check"></i> Save Task &amp; Update Widget
              </button>
              <button type="button" className="form-cancel-btn" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Tasks List Container */}
        <div className="stock-tasks-list-scroll">
          {isLoading ? (
            <div className="stock-tasks-empty">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <h4>Loading stock tasks...</h4>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="stock-tasks-empty">
              <i className="fa-solid fa-clipboard-check"></i>
              <h4>No tasks for this filter</h4>
              <p>
                {filterTab === 'today'
                  ? 'All stock aiming tasks for today are clear!'
                  : filterTab === 'tomorrow'
                    ? 'No pending tasks scheduled for tomorrow.'
                    : 'Click "+ New Stock Aim Task" to create one.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((t) => {
              // Cross-reference live stock count from items
              const matchedLive = items.find(it => String(it.id) === String(t.stockItemId) || it.name?.toLowerCase() === t.stockItemName?.toLowerCase());
              const current = matchedLive ? Number(matchedLive.quantity) || 0 : Number(t.currentStock) || 0;
              const aim = Number(t.targetAim) || 1;
              const progressPct = Math.min(100, Math.round((current / aim) * 100));
              const neededUnits = Math.max(0, aim - current);
              const isToday = t.dueDate === todayStr;
              const isTomorrow = t.dueDate === tomorrowStr;

              return (
                <div
                  key={t.id}
                  className={`stock-task-card ${t.status === 'completed' ? 'completed' : ''} priority-${t.priority}`}
                >
                  <div className="task-card-main">
                    <button
                      type="button"
                      className={`task-checkbox ${t.status === 'completed' ? 'checked' : ''}`}
                      onClick={() => handleToggleComplete(t)}
                      title={t.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}
                    >
                      {t.status === 'completed' && <i className="fa-solid fa-check"></i>}
                    </button>

                    <div className="task-info">
                      <div className="task-title-row">
                        <span className="task-name">{t.title}</span>
                        <div className="task-badges">
                          {isToday && <span className="task-badge badge-today">Today</span>}
                          {isTomorrow && <span className="task-badge badge-tomorrow">Tomorrow</span>}
                          {!isToday && !isTomorrow && <span className="task-badge badge-date">{t.dueDate}</span>}
                          <span className={`task-badge badge-${t.priority}`}>{t.priority}</span>
                          <span className="task-badge badge-type">{t.type}</span>
                        </div>
                      </div>

                      {/* Stock Aim Target Progress Bar */}
                      {t.targetAim > 0 && (
                        <div className="task-aim-container">
                          <div className="task-aim-labels">
                            <span className="aim-target-label">
                              <i className="fa-solid fa-bullseye"></i> Stock Aim: <strong>{t.targetAim}</strong>
                            </span>
                            <span className="aim-current-label">
                              Current Stock: <strong>{current}</strong> ({progressPct}%)
                            </span>
                            <span className={`aim-status-label ${neededUnits === 0 ? 'met' : 'needed'}`}>
                              {neededUnits === 0 ? 'Target Reached! 🎉' : `Need +${neededUnits}`}
                            </span>
                          </div>
                          <div className="task-aim-progress-bg">
                            <div
                              className={`task-aim-progress-bar ${neededUnits === 0 ? 'bar-success' : 'bar-active'}`}
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {t.notes && <div className="task-notes"><i className="fa-regular fa-note-sticky"></i> {t.notes}</div>}
                    </div>
                  </div>

                  <div className="task-card-actions">
                    <button
                      type="button"
                      className="task-delete-btn"
                      onClick={() => handleDeleteTask(t)}
                      title="Delete Task"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="stock-task-modal-footer">
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span>
            Daily reminder scheduled at 09:00 AM with Today &amp; Tomorrow stock tasks on your lock screen, notification drawer &amp; home widget.
          </span>
        </div>
      </div>
    </div>
  );
}
