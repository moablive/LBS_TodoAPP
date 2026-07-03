import pg from 'pg';
import crypto from 'crypto';
import type { Task, TaskGroup } from '../models/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const botApi = {
  getAllBotUsers: async (): Promise<{ id: string, telegramId: string }[]> => {
    const result = await pool.query('SELECT DISTINCT user_id FROM tasks');
    return result.rows.map(row => ({ id: row.user_id, telegramId: row.user_id }));
  },

  createGroup: async (userId: string, name: string): Promise<TaskGroup> => {
    const id = crypto.randomUUID().slice(0, 8);
    const createdAt = new Date().toISOString();
    
    await pool.query(
      'INSERT INTO task_groups (id, user_id, name, created_at) VALUES ($1, $2, $3, $4)',
      [id, userId, name, new Date(createdAt)]
    );

    return { id, userId, name, createdAt };
  },

  listGroups: async (userId: string): Promise<TaskGroup[]> => {
    const result = await pool.query('SELECT id, user_id, name, created_at FROM task_groups WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: row.created_at.toISOString()
    }));
  },

  deleteGroup: async (userId: string, groupId: string): Promise<void> => {
    await pool.query('DELETE FROM task_groups WHERE user_id = $1 AND id = $2', [userId, groupId]);
  },

  addTask: async (userId: string, description: string, scheduledAt?: string, groupId?: string): Promise<Task> => {
    const id = crypto.randomUUID().slice(0, 8);
    const createdAt = new Date().toISOString();
    
    await pool.query(
      'INSERT INTO tasks (id, user_id, description, scheduled_at, created_at, group_id, is_flagged, is_urgent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, userId, description, scheduledAt ? new Date(scheduledAt) : null, new Date(createdAt), groupId || null, false, false]
    );

    return {
      id,
      description,
      scheduledAt: scheduledAt || null,
      createdAt,
      groupId
    };
  },

  listTasks: async (userId: string): Promise<Task[]> => {
    const result = await pool.query(`
      SELECT t.id, t.description, t.scheduled_at, t.created_at, t.group_id, g.name as group_name, t.is_flagged, t.is_urgent, t.recurrence
      FROM tasks t
      LEFT JOIN task_groups g ON t.group_id = g.id
      WHERE t.user_id = $1 AND t.completed_at IS NULL
      ORDER BY t.created_at ASC
    `, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      description: row.description,
      scheduledAt: row.scheduled_at ? row.scheduled_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      groupId: row.group_id || undefined,
      groupName: row.group_name || undefined,
      isFlagged: row.is_flagged,
      isUrgent: row.is_urgent,
      priority: row.is_urgent ? 'alto' : (row.is_flagged ? 'médio' : 'baixo'),
      recurrence: row.recurrence || null
    }));
  },

  removeTask: async (userId: string, taskId: string): Promise<void> => {
    await pool.query('DELETE FROM tasks WHERE user_id = $1 AND id = $2', [userId, taskId]);
  },
  
  completeTask: async (userId: string, taskId: string): Promise<void> => {
    await pool.query('UPDATE tasks SET completed_at = NOW() WHERE user_id = $1 AND id = $2', [userId, taskId]);
  },

  // Usuário já vinculou o Telegram? (login via bot, padrão MoneyAPP)
  getUserByTelegramId: async (telegramId: string): Promise<{ loginhubId: number } | null> => {
    const result = await pool.query(
      'SELECT loginhub_id FROM user_settings WHERE telegram_id = $1 LIMIT 1',
      [telegramId]
    );
    const row = result.rows[0];
    return row ? { loginhubId: row.loginhub_id } : null;
  },

  // Vincula o telegramId ao usuário do LoginHub e migra o namespace provisório
  // (dados criados na web antes do vínculo ficam sob String(loginhubId)).
  linkTelegram: async (loginhubId: number, telegramId: string): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_settings (loginhub_id, telegram_id) VALUES ($1, $2)
         ON CONFLICT (loginhub_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id`,
        [loginhubId, telegramId]
      );
      const provisional = String(loginhubId);
      if (provisional !== telegramId) {
        for (const table of ['tasks', 'task_groups', 'push_subscriptions']) {
          await client.query(`UPDATE ${table} SET user_id = $1 WHERE user_id = $2`, [telegramId, provisional]);
        }
        // user_id é PK aqui — só migra se o destino ainda não tiver configuração.
        await client.query(
          `UPDATE reminder_settings SET user_id = $1
           WHERE user_id = $2 AND NOT EXISTS (SELECT 1 FROM reminder_settings WHERE user_id = $1)`,
          [telegramId, provisional]
        );
        await client.query('DELETE FROM reminder_settings WHERE user_id = $1', [provisional]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getReminderSettings: async (userId: string): Promise<ReminderSettings> => {
    const result = await pool.query(
      `SELECT remind_at_time, remind_before_enabled, remind_before_minutes,
              remind_days_enabled, remind_days_before, notify_push, notify_telegram
       FROM reminder_settings WHERE user_id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row) return { ...defaultReminderSettings };
    return {
      remindAtTime: row.remind_at_time,
      remindBeforeEnabled: row.remind_before_enabled,
      remindBeforeMinutes: row.remind_before_minutes,
      remindDaysEnabled: row.remind_days_enabled,
      remindDaysBefore: row.remind_days_before,
      notifyPush: row.notify_push,
      notifyTelegram: row.notify_telegram,
    };
  },

  getPushSubscriptions: async (userId: string): Promise<PushSubscriptionRow[]> => {
    const result = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  },

  deletePushSubscription: async (endpoint: string): Promise<void> => {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  }
};

export interface ReminderSettings {
  remindAtTime: boolean;
  remindBeforeEnabled: boolean;
  remindBeforeMinutes: number;
  remindDaysEnabled: boolean;
  remindDaysBefore: number;
  notifyPush: boolean;
  notifyTelegram: boolean;
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export const defaultReminderSettings: ReminderSettings = {
  remindAtTime: true,
  remindBeforeEnabled: true,
  remindBeforeMinutes: 30,
  remindDaysEnabled: true,
  remindDaysBefore: 7,
  notifyPush: true,
  notifyTelegram: true,
};
