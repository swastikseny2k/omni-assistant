export interface ChatMessage {
  id: number;
  content: string;
  role: 'USER' | 'ASSISTANT' | 'FUNCTION';
  createdAt: string;
  model?: string;
  functionName?: string;
  functionArguments?: string;
  functionResult?: string;
}

export interface Chat {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  messages: ChatMessage[];
  messageCount: number;
}

export interface ChatRequest {
  message: string;
  model: 'openai' | 'deepseek';
  chatId?: number;
  chatTitle?: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model: string;
  chatId: number;
  chatTitle: string;
  message?: string;
}

export interface AvailableModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  supportsFunctionCalling: boolean;
}

export interface ChatSession {
  currentChatId: number | null;
  availableModels: AvailableModel[];
  selectedModel: string;
  isLoading: boolean;
  error: string | null;
}

export interface FunctionCall {
  name: string;
  arguments: string;
  result: string;
}

export interface TaskCreationRequest {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
}

export interface TaskFilterRequest {
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  searchTerm?: string;
  overdue?: boolean;
  dueSoon?: number;
}
