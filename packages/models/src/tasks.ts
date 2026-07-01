import { z } from "zod";

export const taskSchema = z.object({
  id: z.string(),
  description: z.string(),
  scheduledAt: z.string().nullable(),
  createdAt: z.string(),
  groupId: z.string().nullable(),
  completedAt: z.string().nullable(),
  isFlagged: z.boolean(),
  isUrgent: z.boolean(),
  order: z.number().int().default(0),
});
export type TaskDto = z.infer<typeof taskSchema>;

export const createTaskSchema = z.object({
  description: z.string().min(1),
  scheduledAt: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  isFlagged: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  order: z.number().int().optional(),
});
export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  description: z.string().min(1).optional(),
  scheduledAt: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  isFlagged: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  order: z.number().int().optional(),
});
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

export const taskGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  order: z.number().int().default(0),
  createdAt: z.string(),
});
export type TaskGroupDto = z.infer<typeof taskGroupSchema>;

export const createTaskGroupSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional(),
});
export type CreateTaskGroupDto = z.infer<typeof createTaskGroupSchema>;

export const updateTaskGroupSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});
export type UpdateTaskGroupDto = z.infer<typeof updateTaskGroupSchema>;

export const reorderGroupsSchema = z.object({
  groupIds: z.array(z.string()),
});
export type ReorderGroupsDto = z.infer<typeof reorderGroupsSchema>;

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.string()),
});
export type ReorderTasksDto = z.infer<typeof reorderTasksSchema>;
