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
      SELECT t.id, t.description, t.scheduled_at, t.created_at, t.group_id, g.name as group_name, t.is_flagged, t.is_urgent 
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
      priority: row.is_urgent ? 'alto' : (row.is_flagged ? 'médio' : 'baixo')
    }));
  },

  removeTask: async (userId: string, taskId: string): Promise<void> => {
    await pool.query('DELETE FROM tasks WHERE user_id = $1 AND id = $2', [userId, taskId]);
  },
  
  completeTask: async (userId: string, taskId: string): Promise<void> => {
    await pool.query('UPDATE tasks SET completed_at = NOW() WHERE user_id = $1 AND id = $2', [userId, taskId]);
  }
};
