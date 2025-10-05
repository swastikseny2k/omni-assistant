import { isOverdue as isOverdueUtc, isDueSoon as isDueSoonUtc } from '../utils/dateUtils';

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdFromEmail: boolean;
  emailSourceId?: string;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  parentTask?: Task;
  subTasks?: Task[];
  dependencies?: Task[];
  dependentTasks?: Task[];
}


export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  parentTaskId?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface CreateTaskFromEmailRequest {
  title: string;
  description?: string;
  emailSourceId: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface TaskStatistics {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  highPriorityTasks: number;
  urgentTasks: number;
  overdueTasks: number;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  overdue?: boolean;
  dueSoon?: boolean;
  search?: string;
  parentTaskId?: number;
  createdFromEmail?: boolean;
}

export interface TaskSearchParams {
  query?: string;
  type?: 'title' | 'description';
  status?: TaskStatus;
  priority?: TaskPriority;
  overdue?: boolean;
  dueSoon?: number; // hours
}

// Helper functions for task status and priority
export const getTaskStatusDisplayName = (status: TaskStatus): string => {
  const statusNames: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'To Do',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.COMPLETED]: 'Completed',
    [TaskStatus.CANCELLED]: 'Cancelled',
    [TaskStatus.ON_HOLD]: 'On Hold'
  };
  return statusNames[status];
};

export const getTaskPriorityDisplayName = (priority: TaskPriority): string => {
  const priorityNames: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: 'Low',
    [TaskPriority.MEDIUM]: 'Medium',
    [TaskPriority.HIGH]: 'High',
    [TaskPriority.URGENT]: 'Urgent'
  };
  return priorityNames[priority];
};

export const getTaskPriorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: '#28a745',
    [TaskPriority.MEDIUM]: '#ffc107',
    [TaskPriority.HIGH]: '#fd7e14',
    [TaskPriority.URGENT]: '#dc3545'
  };
  return colors[priority];
};

export const getTaskStatusColor = (status: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: '#6c757d',
    [TaskStatus.IN_PROGRESS]: '#007bff',
    [TaskStatus.COMPLETED]: '#28a745',
    [TaskStatus.CANCELLED]: '#dc3545',
    [TaskStatus.ON_HOLD]: '#ffc107'
  };
  return colors[status];
};

export const isTaskOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === TaskStatus.COMPLETED) {
    return false;
  }
  return isOverdueUtc(task.dueDate);
};

export const isTaskDueSoon = (task: Task, hours: number = 24): boolean => {
  if (!task.dueDate || task.status === TaskStatus.COMPLETED) {
    return false;
  }
  return isDueSoonUtc(task.dueDate, hours);
};
