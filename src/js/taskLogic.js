import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../supabase';
import { syncStockAndTasksToWidget } from './widgetSync';
import { checkNotificationPermission, requestNotificationPermission, ensureNotificationChannel, STOCK_CHANNEL_ID } from './notificationService';

export const TASKS_STORAGE_KEY = 'inventory_stock_tasks';
export const DB_STATUS_KEY = 'stock_tasks_db_available';

export const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

export const getTomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const isDateToday = (dateStr) => dateStr === getTodayDateString();
export const isDateTomorrow = (dateStr) => dateStr === getTomorrowDateString();

/**
 * Format database record into UI task model
 */
function mapFromDbRecord(record, itemsList = []) {
  const matchedItem = itemsList.find(it => String(it.id) === String(record.stock_item_id) || it.name?.toLowerCase() === record.stock_item_name?.toLowerCase());
  const liveQty = matchedItem ? Number(matchedItem.quantity) : Number(record.current_stock) || 0;

  return {
    id: record.id,
    title: record.title || `Aim ${record.target_aim} for ${record.stock_item_name}`,
    stockItemId: record.stock_item_id,
    stockItemName: record.stock_item_name || 'Stock Item',
    currentStock: liveQty,
    targetAim: Number(record.target_aim) || 50,
    dueDate: record.due_date ? String(record.due_date).slice(0, 10) : getTodayDateString(),
    dueTime: record.due_time || '09:00',
    type: record.type || 'restock',
    priority: record.priority || 'high',
    status: record.status || 'pending',
    notes: record.notes || '',
    createdAt: record.created_at || new Date().toISOString()
  };
}

/**
 * Format UI task into Supabase DB record
 */
function mapToDbRecord(task) {
  return {
    title: task.title,
    stock_item_id: task.stockItemId ? Number(task.stockItemId) : null,
    stock_item_name: task.stockItemName,
    current_stock: Number(task.currentStock) || 0,
    target_aim: Number(task.targetAim) || 50,
    due_date: task.dueDate || getTodayDateString(),
    due_time: task.dueTime || '09:00',
    type: task.type || 'restock',
    priority: task.priority || 'high',
    status: task.status || 'pending',
    notes: task.notes || ''
  };
}

/**
 * Get locally cached tasks (NO fake sample data - returns empty array if none)
 */
export function getStoredTasks() {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

export function saveStoredTasks(tasks) {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (_) {}
}

/**
 * Fetch real tasks from Supabase DB, cross-referencing with latest items stock
 */
export async function fetchTasksFromDB(itemsList = []) {
  try {
    const { data, error } = await supabase
      .from('stock_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table does not exist in Supabase yet, note it and use local cache
      console.warn('Supabase stock_tasks notice:', error.message);
      localStorage.setItem(DB_STATUS_KEY, 'false');
      return {
        tasks: getStoredTasks(),
        isDbConnected: false,
        error: error.message
      };
    }

    localStorage.setItem(DB_STATUS_KEY, 'true');
    const mapped = (data || []).map(r => mapFromDbRecord(r, itemsList));
    saveStoredTasks(mapped);

    // Sync to Android widget and local snapshot
    syncStockAndTasksToWidget({
      totalItems: itemsList.length,
      tasks: mapped
    });

    return {
      tasks: mapped,
      isDbConnected: true,
      error: null
    };
  } catch (err) {
    console.warn('Error fetching tasks from DB:', err);
    return {
      tasks: getStoredTasks(),
      isDbConnected: false,
      error: err.message
    };
  }
}

/**
 * Create a new task in Supabase DB (and update local cache & widget)
 */
export async function createTaskInDB(taskInput, itemsList = []) {
  const isDbAvailable = localStorage.getItem(DB_STATUS_KEY) === 'true';
  const payload = mapToDbRecord(taskInput);

  if (isDbAvailable) {
    try {
      const { data, error } = await supabase
        .from('stock_tasks')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        const created = mapFromDbRecord(data, itemsList);
        const currentTasks = getStoredTasks();
        const updated = [created, ...currentTasks.filter(t => t.id !== created.id)];
        saveStoredTasks(updated);
        await scheduleDailyTasksNotification(updated);
        syncStockAndTasksToWidget({ totalItems: itemsList.length, tasks: updated });
        return { task: created, isDb: true };
      }
    } catch (err) {
      console.warn('Error inserting into DB, saving locally:', err);
    }
  }

  // Local fallback if DB table not yet created
  const fallbackTask = {
    ...taskInput,
    id: `local_task_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
  const current = getStoredTasks();
  const updated = [fallbackTask, ...current];
  saveStoredTasks(updated);
  await scheduleDailyTasksNotification(updated);
  syncStockAndTasksToWidget({ totalItems: itemsList.length, tasks: updated });
  return { task: fallbackTask, isDb: false };
}

/**
 * Toggle task completion status in DB
 */
export async function toggleTaskStatusInDB(taskId, currentStatus, itemsList = []) {
  const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  const isDbAvailable = localStorage.getItem(DB_STATUS_KEY) === 'true';

  if (isDbAvailable && !String(taskId).startsWith('local_')) {
    try {
      await supabase
        .from('stock_tasks')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);
    } catch (err) {
      console.warn('Error updating status in DB:', err);
    }
  }

  const current = getStoredTasks();
  const updated = current.map(t => t.id === taskId ? { ...t, status: nextStatus } : t);
  saveStoredTasks(updated);
  await scheduleDailyTasksNotification(updated);
  syncStockAndTasksToWidget({ totalItems: itemsList.length, tasks: updated });
  return updated;
}

/**
 * Delete a task from DB
 */
export async function deleteTaskFromDB(taskId, itemsList = []) {
  const isDbAvailable = localStorage.getItem(DB_STATUS_KEY) === 'true';

  if (isDbAvailable && !String(taskId).startsWith('local_')) {
    try {
      await supabase
        .from('stock_tasks')
        .delete()
        .eq('id', taskId);
    } catch (err) {
      console.warn('Error deleting from DB:', err);
    }
  }

  const current = getStoredTasks();
  const updated = current.filter(t => t.id !== taskId);
  saveStoredTasks(updated);
  await scheduleDailyTasksNotification(updated);
  syncStockAndTasksToWidget({ totalItems: itemsList.length, tasks: updated });
  return updated;
}

/**
 * Format notification body string combining today and tomorrow tasks
 */
export function buildTodayTomorrowNotificationText(tasks) {
  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  const todayTasks = (tasks || []).filter(t => t.dueDate === todayStr && t.status !== 'completed');
  const tomorrowTasks = (tasks || []).filter(t => t.dueDate === tomorrowStr && t.status !== 'completed');

  if (todayTasks.length === 0 && tomorrowTasks.length === 0) {
    return {
      title: '🎯 Daily Stock Tasks Update',
      body: 'All stock aiming tasks for today and tomorrow are completed! Inventory is in good shape.'
    };
  }

  const todayParts = todayTasks.map(t => {
    if (t.targetAim && t.stockItemName) {
      const needed = Math.max(0, (t.targetAim || 0) - (Number(t.currentStock) || 0));
      return `${t.stockItemName} (Aim: ${t.targetAim}${needed > 0 ? `, need +${needed}` : ''})`;
    }
    return t.title || t.stockItemName;
  });

  const tomorrowParts = tomorrowTasks.map(t => {
    if (t.targetAim && t.stockItemName) {
      return `${t.stockItemName} (Aim: ${t.targetAim})`;
    }
    return t.title || t.stockItemName;
  });

  const sections = [];
  if (todayTasks.length > 0) {
    sections.push(`📋 Today (${todayTasks.length}): ${todayParts.slice(0, 2).join(', ')}${todayParts.length > 2 ? ` +${todayParts.length - 2} more` : ''}`);
  } else {
    sections.push('📋 Today: No pending stock tasks.');
  }

  if (tomorrowTasks.length > 0) {
    sections.push(`⏳ Tomorrow (${tomorrowTasks.length}): ${tomorrowParts.slice(0, 2).join(', ')}${tomorrowParts.length > 2 ? ` +${tomorrowParts.length - 2} more` : ''}`);
  } else {
    sections.push('⏳ Tomorrow: All clear.');
  }

  return {
    title: `📋 Stock Tasks (${todayTasks.length} Today, ${tomorrowTasks.length} Tomorrow)`,
    body: sections.join(' | ')
  };
}

/**
 * Schedule repeating daily notification for Today & Tomorrow tasks (fires every day at 09:00 AM)
 */
export async function scheduleDailyTasksNotification(tasks) {
  try {
    await ensureNotificationChannel();
    const hasPerm = await checkNotificationPermission();
    if (!hasPerm) {
      await requestNotificationPermission();
    }

    const { title, body } = buildTodayTomorrowNotificationText(tasks);

    // Cancel existing task schedule
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 8888 }] });
    } catch (_) {}

    // Next 9:00 AM
    const scheduledTime = new Date();
    scheduledTime.setHours(9, 0, 0, 0);
    if (scheduledTime <= new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 8888,
          title,
          body,
          channelId: STOCK_CHANNEL_ID,
          smallIcon: 'ic_launcher',
          schedule: {
            at: scheduledTime,
            every: 'day'
          },
          sound: 'default'
        }
      ]
    });

    localStorage.setItem('daily_tasks_scheduled', 'true');
  } catch (err) {
    console.warn('scheduleDailyTasksNotification fallback/notice:', err);
  }
}

/**
 * Send an immediate notification for Today & Tomorrow tasks (allows instant testing on lock screen)
 */
export async function triggerInstantTaskNotification(tasks) {
  try {
    await ensureNotificationChannel();
    let hasPerm = await checkNotificationPermission();
    if (!hasPerm) {
      hasPerm = await requestNotificationPermission();
    }

    const { title, body } = buildTodayTomorrowNotificationText(tasks);

    if (hasPerm) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() / 1000) % 90000 + 1000,
            title,
            body,
            channelId: STOCK_CHANNEL_ID,
            smallIcon: 'ic_launcher',
            sound: 'default'
          }
        ]
      });
      return true;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/dashboard.png' });
        return true;
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body, icon: '/dashboard.png' });
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('triggerInstantTaskNotification fallback:', err);
  }
  return false;
}
