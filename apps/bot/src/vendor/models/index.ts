export interface TaskGroup {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  description: string;
  scheduledAt: string | null;
  createdAt: string;
  groupId?: string;
  groupName?: string;
  isFlagged?: boolean;
  isUrgent?: boolean;
  priority?: 'alto' | 'médio' | 'baixo';
}
