import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import apiService from '../services/api';
import { 
  Task, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  CreateTaskFromEmailRequest, 
  TaskStatistics, 
  TaskSearchParams, 
  TaskFilters,
  TaskStatus,
  TaskPriority,
  isTaskOverdue,
  isTaskDueSoon
} from '../types/task';

interface TaskState {
  tasks: Task[];
  filteredTasks: Task[];
  statistics: TaskStatistics | null;
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  searchParams: TaskSearchParams;
}

type TaskAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: number }
  | { type: 'SET_STATISTICS'; payload: TaskStatistics }
  | { type: 'SET_FILTERS'; payload: TaskFilters }
  | { type: 'SET_SEARCH_PARAMS'; payload: TaskSearchParams }
  | { type: 'APPLY_FILTERS' };

interface TaskContextType extends TaskState {
  // Task CRUD operations
  createTask: (taskData: CreateTaskRequest) => Promise<Task>;
  createTaskFromEmail: (taskData: CreateTaskFromEmailRequest) => Promise<Task>;
  updateTask: (id: number, taskData: UpdateTaskRequest) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  
  // Task fetching
  fetchTasks: () => Promise<void>;
  fetchTopLevelTasks: () => Promise<void>;
  fetchTasksByStatus: (status: TaskStatus) => Promise<void>;
  fetchTasksByPriority: (priority: TaskPriority) => Promise<void>;
  fetchOverdueTasks: () => Promise<void>;
  fetchTasksDueSoon: (hours?: number) => Promise<void>;
  fetchTaskStatistics: () => Promise<void>;
  
  // Search and filtering
  searchTasks: (searchParams: TaskSearchParams) => Promise<void>;
  applyFilters: (filters: TaskFilters) => void;
  clearFilters: () => void;
  
  // Sub-tasks
  getSubTasks: (parentTaskId: number) => Promise<Task[]>;
  addSubTask: (parentTaskId: number, subTaskData: CreateTaskRequest) => Promise<Task>;
  
  // Dependencies
  addDependency: (taskId: number, dependencyId: number) => Promise<void>;
  removeDependency: (taskId: number, dependencyId: number) => Promise<void>;
  
  // Utility functions
  getTaskById: (id: number) => Task | undefined;
  refreshTasks: () => Promise<void>;
}

const initialState: TaskState = {
  tasks: [],
  filteredTasks: [],
  statistics: null,
  loading: false,
  error: null,
  filters: {},
  searchParams: {}
};

const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, filteredTasks: action.payload };
    
    case 'ADD_TASK':
      const newTasks = [...state.tasks, action.payload];
      return { ...state, tasks: newTasks, filteredTasks: newTasks };
    
    case 'UPDATE_TASK':
      const updatedTasks = state.tasks.map(task => 
        task.id === action.payload.id ? action.payload : task
      );
      return { ...state, tasks: updatedTasks, filteredTasks: updatedTasks };
    
    case 'DELETE_TASK':
      const filteredTasks = state.tasks.filter(task => task.id !== action.payload);
      return { ...state, tasks: filteredTasks, filteredTasks };
    
    case 'SET_STATISTICS':
      return { ...state, statistics: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'SET_SEARCH_PARAMS':
      return { ...state, searchParams: action.payload };
    
    case 'APPLY_FILTERS':
      let filtered = [...state.tasks];
      
      // Apply status filter
      if (state.filters.status && state.filters.status.length > 0) {
        filtered = filtered.filter(task => state.filters.status!.includes(task.status));
      }
      
      // Apply priority filter
      if (state.filters.priority && state.filters.priority.length > 0) {
        filtered = filtered.filter(task => state.filters.priority!.includes(task.priority));
      }
      
      // Apply overdue filter
      if (state.filters.overdue) {
        filtered = filtered.filter(task => isTaskOverdue(task));
      }
      
      // Apply due soon filter
      if (state.filters.dueSoon) {
        filtered = filtered.filter(task => isTaskDueSoon(task));
      }
      
      // Apply search filter
      if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase();
        filtered = filtered.filter(task => 
          task.title.toLowerCase().includes(searchTerm) ||
          (task.description && task.description.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply parent task filter
      if (state.filters.parentTaskId) {
        filtered = filtered.filter(task => task.parentTask?.id === state.filters.parentTaskId);
      }
      
      // Apply email source filter
      if (state.filters.createdFromEmail !== undefined) {
        filtered = filtered.filter(task => task.createdFromEmail === state.filters.createdFromEmail);
      }
      
      return { ...state, filteredTasks: filtered };
    
    default:
      return state;
  }
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // Task CRUD operations
  const createTask = async (taskData: CreateTaskRequest): Promise<Task> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const newTask = await apiService.createTask(taskData);
      dispatch({ type: 'ADD_TASK', payload: newTask });
      
      return newTask;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create task' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createTaskFromEmail = async (taskData: CreateTaskFromEmailRequest): Promise<Task> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const newTask = await apiService.createTaskFromEmail(taskData);
      dispatch({ type: 'ADD_TASK', payload: newTask });
      
      return newTask;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to create task from email' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateTask = async (id: number, taskData: UpdateTaskRequest): Promise<Task> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const updatedTask = await apiService.updateTask(id, taskData);
      dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
      
      return updatedTask;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to update task' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteTask = async (id: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await apiService.deleteTask(id);
      dispatch({ type: 'DELETE_TASK', payload: id });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to delete task' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Task fetching
  const fetchTasks = async (): Promise<void> => {
    try {
      // Check if user is authenticated before making API call
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found, skipping task fetch');
        return;
      }

      console.log('Fetching tasks with token:', token.substring(0, 20) + '...');
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const tasks = await apiService.getTasks();
      console.log('Tasks fetched successfully:', tasks.length, 'tasks');
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response?.data
      });
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch tasks' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchTopLevelTasks = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const tasks = await apiService.getTopLevelTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch top-level tasks' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchTasksByStatus = async (status: TaskStatus): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const tasks = await apiService.getTasksByStatus(status);
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch tasks by status' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchTasksByPriority = async (priority: TaskPriority): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const tasks = await apiService.getTasksByPriority(priority);
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch tasks by priority' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchOverdueTasks = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const tasks = await apiService.getOverdueTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch overdue tasks' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchTasksDueSoon = async (hours: number = 24): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const tasks = await apiService.getTasksDueSoon(hours);
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch tasks due soon' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchTaskStatistics = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const statistics = await apiService.getTaskStatistics();
      dispatch({ type: 'SET_STATISTICS', payload: statistics });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch task statistics' });
      throw error;
    }
  };

  // Search and filtering
  const searchTasks = async (searchParams: TaskSearchParams): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const tasks = await apiService.searchTasks(searchParams);
      dispatch({ type: 'SET_TASKS', payload: tasks });
      dispatch({ type: 'SET_SEARCH_PARAMS', payload: searchParams });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to search tasks' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const applyFilters = (filters: TaskFilters): void => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
    dispatch({ type: 'APPLY_FILTERS' });
  };

  const clearFilters = (): void => {
    dispatch({ type: 'SET_FILTERS', payload: {} });
    dispatch({ type: 'APPLY_FILTERS' });
  };

  // Sub-tasks
  const getSubTasks = async (parentTaskId: number): Promise<Task[]> => {
    try {
      return await apiService.getSubTasks(parentTaskId);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch sub-tasks' });
      throw error;
    }
  };

  const addSubTask = async (parentTaskId: number, subTaskData: CreateTaskRequest): Promise<Task> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const newSubTask = await apiService.addSubTask(parentTaskId, subTaskData);
      
      // Update the parent task in the state
      const updatedTasks = state.tasks.map(task => {
        if (task.id === parentTaskId) {
          return { ...task, subTasks: [...(task.subTasks || []), newSubTask] };
        }
        return task;
      });
      
      dispatch({ type: 'SET_TASKS', payload: updatedTasks });
      
      return newSubTask;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to add sub-task' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Dependencies
  const addDependency = async (taskId: number, dependencyId: number): Promise<void> => {
    try {
      await apiService.addDependency(taskId, dependencyId);
      
      // Update the task in the state
      const updatedTasks = state.tasks.map(task => {
        if (task.id === taskId) {
          const dependency = state.tasks.find(t => t.id === dependencyId);
          if (dependency) {
            return { ...task, dependencies: [...(task.dependencies || []), dependency] };
          }
        }
        return task;
      });
      
      dispatch({ type: 'SET_TASKS', payload: updatedTasks });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to add dependency' });
      throw error;
    }
  };

  const removeDependency = async (taskId: number, dependencyId: number): Promise<void> => {
    try {
      await apiService.removeDependency(taskId, dependencyId);
      
      // Update the task in the state
      const updatedTasks = state.tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            dependencies: task.dependencies?.filter(dep => dep.id !== dependencyId) || []
          };
        }
        return task;
      });
      
      dispatch({ type: 'SET_TASKS', payload: updatedTasks });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to remove dependency' });
      throw error;
    }
  };

  // Utility functions
  const getTaskById = (id: number): Task | undefined => {
    return state.tasks.find(task => task.id === id);
  };

  const refreshTasks = async (): Promise<void> => {
    // Check if user is authenticated before refreshing
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found, skipping task refresh');
      return;
    }
    await fetchTasks();
  };

  // Apply filters whenever filters change
  useEffect(() => {
    dispatch({ type: 'APPLY_FILTERS' });
  }, [
    state.filters.status,
    state.filters.priority,
    state.filters.overdue,
    state.filters.dueSoon,
    state.filters.search,
    state.filters.parentTaskId,
    state.filters.createdFromEmail
  ]);

  const contextValue: TaskContextType = {
    ...state,
    createTask,
    createTaskFromEmail,
    updateTask,
    deleteTask,
    fetchTasks,
    fetchTopLevelTasks,
    fetchTasksByStatus,
    fetchTasksByPriority,
    fetchOverdueTasks,
    fetchTasksDueSoon,
    fetchTaskStatistics,
    searchTasks,
    applyFilters,
    clearFilters,
    getSubTasks,
    addSubTask,
    addDependency,
    removeDependency,
    getTaskById,
    refreshTasks
  };

  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
};
