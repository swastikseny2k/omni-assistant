import axios, { AxiosResponse } from 'axios';
import { ChatResponse, Chat, AvailableModel, ChatRequest } from '../types/chat';
import { ApiError } from '../types/api';

class ChatService {
  private api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    timeout: 30000, // 30 seconds for chat requests
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
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
      (error) => {
        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          status: error.response?.status,
          code: error.code,
        };

        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }

        return Promise.reject(apiError);
      }
    );
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await this.api.post<ChatResponse>('/chat/message', request);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAvailableModels(): Promise<AvailableModel[]> {
    try {
      const response = await this.api.get<{ success: boolean; models: string[] }>('/chat/models');
      const modelStrings = response.data.models || [];
      
      // Transform string array to AvailableModel objects
      const modelMap: Record<string, Omit<AvailableModel, 'id'>> = {
        'openai': {
          name: 'OpenAI GPT-4o-mini',
          description: 'Advanced AI model with function calling capabilities',
          provider: 'OpenAI',
          supportsFunctionCalling: true,
        },
        'deepseek': {
          name: 'DeepSeek',
          description: 'Alternative AI model for general conversations',
          provider: 'DeepSeek',
          supportsFunctionCalling: false,
        },
      };
      
      return modelStrings.map(modelId => ({
        id: modelId,
        ...modelMap[modelId] || {
          name: modelId.charAt(0).toUpperCase() + modelId.slice(1),
          description: `AI model: ${modelId}`,
          provider: modelId,
          supportsFunctionCalling: false,
        }
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserChats(): Promise<Chat[]> {
    try {
      const response = await this.api.get<{ success: boolean; chats: Chat[] }>('/chat/chats');
      return response.data.chats || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getChat(chatId: number): Promise<Chat> {
    try {
      const response = await this.api.get<{ success: boolean; chat: Chat; messages: any[] }>(`/chat/chats/${chatId}`);
      return response.data.chat;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createChat(title: string): Promise<Chat> {
    try {
      const response = await this.api.post<{ success: boolean; chat: Chat }>('/chat/chats', { title });
      return response.data.chat;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateChatTitle(chatId: number, title: string): Promise<Chat> {
    try {
      const response = await this.api.put<{ success: boolean; chat: Chat }>(`/chat/chats/${chatId}/title`, { title });
      return response.data.chat;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteChat(chatId: number): Promise<void> {
    try {
      await this.api.delete<{ success: boolean }>(`/chat/chats/${chatId}`);
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
    return error;
  }
}

export default new ChatService();
