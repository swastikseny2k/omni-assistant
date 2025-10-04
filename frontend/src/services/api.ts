import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '../types/api';
import { 
  LoginRequest, 
  RegisterRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest, 
  AuthResponse 
} from '../types/auth';
import { 
  Task, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  CreateTaskFromEmailRequest, 
  TaskStatistics, 
  TaskSearchParams, 
  TaskStatus, 
  TaskPriority 
} from '../types/task';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          status: error.response?.status,
          code: error.code,
        };

        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }

        return Promise.reject(apiError);
      }
    );
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async forgotPassword(email: ForgotPasswordRequest): Promise<ApiResponse> {
    try {
      const response = await this.api.post<ApiResponse>('/auth/forgot-password', email);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    try {
      const response = await this.api.post<ApiResponse>('/auth/reset-password', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async validateToken(): Promise<AuthResponse> {
    try {
      const response = await this.api.get<AuthResponse>('/auth/validate');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.api.post<ApiResponse>('/auth/logout');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const response = await this.api.get<AuthResponse>('/auth/user');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Task Management endpoints
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    try {
      const response = await this.api.post<Task>('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createTaskFromEmail(taskData: CreateTaskFromEmailRequest): Promise<Task> {
    try {
      const response = await this.api.post<Task>('/tasks/from-email', taskData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>('/tasks');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTopLevelTasks(): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>('/tasks/top-level');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTask(id: number): Promise<Task> {
    try {
      const response = await this.api.get<Task>(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateTask(id: number, taskData: UpdateTaskRequest): Promise<Task> {
    try {
      const response = await this.api.put<Task>(`/tasks/${id}`, taskData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      await this.api.delete(`/tasks/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>(`/tasks/status/${status}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTasksByPriority(priority: TaskPriority): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>(`/tasks/priority/${priority}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSubTasks(parentTaskId: number): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>(`/tasks/${parentTaskId}/subtasks`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addSubTask(parentTaskId: number, subTaskData: CreateTaskRequest): Promise<Task> {
    try {
      const response = await this.api.post<Task>(`/tasks/${parentTaskId}/subtasks`, subTaskData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addDependency(taskId: number, dependencyId: number): Promise<void> {
    try {
      await this.api.post(`/tasks/${taskId}/dependencies`, { dependencyId });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeDependency(taskId: number, dependencyId: number): Promise<void> {
    try {
      await this.api.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getOverdueTasks(): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>('/tasks/overdue');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTasksDueSoon(hours: number = 24): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>(`/tasks/due-soon?hours=${hours}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchTasks(searchParams: TaskSearchParams): Promise<Task[]> {
    try {
      const params = new URLSearchParams();
      if (searchParams.query) params.append('query', searchParams.query);
      if (searchParams.type) params.append('type', searchParams.type);
      
      const response = await this.api.get<Task[]>(`/tasks/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTasksFromEmail(): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>('/tasks/from-email');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTaskStatistics(): Promise<TaskStatistics> {
    try {
      const response = await this.api.get<TaskStatistics>('/tasks/statistics');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ApiError {
    if (error.response?.data?.message) {
      return {
        message: error.response.data.message,
        status: error.response.status,
        code: error.response.data.code,
      };
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return {
        message: 'Network error. Please check your connection and try again.',
        status: 0,
        code: 'NETWORK_ERROR',
      };
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Request timeout. Please try again.',
        status: 0,
        code: 'TIMEOUT',
      };
    }
    
    // Handle other errors
    return {
      message: error.message || 'An unexpected error occurred',
      status: error.response?.status || 0,
      code: error.code || 'UNKNOWN_ERROR',
    };
  }
}

export default new ApiService();
