import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Chat, ChatMessage, AvailableModel, ChatRequest, ChatResponse } from '../types/chat';
import { ApiError } from '../types/api';
import chatService from '../services/chatService';
import { nowUtc } from '../utils/dateUtils';

interface ChatContextType {
  // State
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  availableModels: AvailableModel[];
  selectedModel: string;
  isLoading: boolean;
  isSendingMessage: boolean;
  error: string | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  createNewChat: (title?: string) => Promise<void>;
  selectChat: (chatId: number) => Promise<void>;
  updateChatTitle: (chatId: number, title: string) => Promise<void>;
  deleteChat: (chatId: number) => Promise<void>;
  setSelectedModel: (model: string) => void;
  clearError: () => void;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SENDING_MESSAGE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_AVAILABLE_MODELS'; payload: AvailableModel[] }
  | { type: 'SET_SELECTED_MODEL'; payload: string }
  | { type: 'UPDATE_CHAT_IN_LIST'; payload: Chat }
  | { type: 'REMOVE_CHAT_FROM_LIST'; payload: number };

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  availableModels: AvailableModel[];
  selectedModel: string;
  isLoading: boolean;
  isSendingMessage: boolean;
  error: string | null;
}

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  messages: [],
  availableModels: [],
  selectedModel: 'openai',
  isLoading: false,
  isSendingMessage: false,
  error: null,
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SENDING_MESSAGE':
      return { ...state, isSendingMessage: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? action.payload : msg
        ),
      };
    case 'SET_AVAILABLE_MODELS':
      return { ...state, availableModels: action.payload };
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload };
    case 'UPDATE_CHAT_IN_LIST':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.id ? action.payload : chat
        ),
      };
    case 'REMOVE_CHAT_FROM_LIST':
      return {
        ...state,
        chats: state.chats.filter(chat => chat.id !== action.payload),
      };
    default:
      return state;
  }
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [models, chats] = await Promise.all([
        chatService.getAvailableModels(),
        chatService.getUserChats(),
      ]);
      
      dispatch({ type: 'SET_AVAILABLE_MODELS', payload: models });
      dispatch({ type: 'SET_CHATS', payload: chats });
      
      // Set default model if available
      if (models.length > 0) {
        const defaultModel = models.find(m => m.id === 'openai') || models[0];
        dispatch({ type: 'SET_SELECTED_MODEL', payload: defaultModel.id });
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // Provide fallback models if backend is not available
      const fallbackModels: AvailableModel[] = [
        {
          id: 'openai',
          name: 'OpenAI GPT-4o-mini',
          description: 'Advanced AI model with function calling capabilities',
          provider: 'OpenAI',
          supportsFunctionCalling: true,
        },
        {
          id: 'deepseek',
          name: 'DeepSeek',
          description: 'Alternative AI model for general conversations',
          provider: 'DeepSeek',
          supportsFunctionCalling: false,
        },
      ];
      
      dispatch({ type: 'SET_AVAILABLE_MODELS', payload: fallbackModels });
      dispatch({ type: 'SET_SELECTED_MODEL', payload: 'openai' });
      dispatch({ type: 'SET_CHATS', payload: [] });
      
      // Don't show error if it's just a network issue - show warning instead
      const errorMessage = (error as ApiError).message;
      if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
        dispatch({ type: 'SET_ERROR', payload: 'Backend server is not running. Please start the backend server to use chat functionality.' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendMessage = async (message: string): Promise<void> => {
    if (!message.trim() || state.isSendingMessage) return;

    dispatch({ type: 'SET_SENDING_MESSAGE', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Add user message to current chat immediately
      const userMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        content: message,
        role: 'USER',
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      const request: ChatRequest = {
        message,
        model: state.selectedModel as 'openai' | 'deepseek',
        chatId: state.currentChat?.id,
        chatTitle: state.currentChat?.title,
      };

      const response: ChatResponse = await chatService.sendMessage(request);

      // Update current chat with new ID if it was created
      if (response.chatId && (!state.currentChat || state.currentChat.id !== response.chatId)) {
        const chat = await chatService.getChat(response.chatId);
        dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
        dispatch({ type: 'SET_MESSAGES', payload: chat.messages || [] });
        dispatch({ type: 'UPDATE_CHAT_IN_LIST', payload: chat });
      } else {
        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: Date.now() + 1, // Temporary ID
          content: response.response,
          role: 'ASSISTANT',
          createdAt: nowUtc(),
          model: response.model,
        };
        dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
      }

      // Refresh chats to get updated list
      await refreshChats();
    } catch (error) {
      console.error('Failed to send message:', error);
      const apiError = error as ApiError;
      let errorMessage = apiError.message;
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to the backend server. Please make sure the server is running on http://localhost:8080';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      // Remove the user message if sending failed
      dispatch({ type: 'SET_MESSAGES', payload: state.messages.slice(0, -1) });
    } finally {
      dispatch({ type: 'SET_SENDING_MESSAGE', payload: false });
    }
  };

  const createNewChat = async (title?: string): Promise<void> => {
    try {
      const chatTitle = title || `New Chat ${new Date().toLocaleString()}`;
      const newChat = await chatService.createChat(chatTitle);
      dispatch({ type: 'SET_CURRENT_CHAT', payload: newChat });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_CHATS', payload: [newChat, ...state.chats] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as ApiError).message });
    }
  };

  const selectChat = async (chatId: number): Promise<void> => {
    try {
      const chat = await chatService.getChat(chatId);
      dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
      dispatch({ type: 'SET_MESSAGES', payload: chat.messages || [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as ApiError).message });
    }
  };

  const updateChatTitle = async (chatId: number, title: string): Promise<void> => {
    try {
      const updatedChat = await chatService.updateChatTitle(chatId, title);
      dispatch({ type: 'UPDATE_CHAT_IN_LIST', payload: updatedChat });
      if (state.currentChat?.id === chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: updatedChat });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as ApiError).message });
    }
  };

  const deleteChat = async (chatId: number): Promise<void> => {
    try {
      await chatService.deleteChat(chatId);
      dispatch({ type: 'REMOVE_CHAT_FROM_LIST', payload: chatId });
      
      // If deleted chat was current, clear current chat
      if (state.currentChat?.id === chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
        dispatch({ type: 'SET_MESSAGES', payload: [] });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as ApiError).message });
    }
  };

  const setSelectedModel = (model: string) => {
    dispatch({ type: 'SET_SELECTED_MODEL', payload: model });
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null } as ChatAction);
  };

  const refreshChats = async (): Promise<void> => {
    try {
      const chats = await chatService.getUserChats();
      dispatch({ type: 'SET_CHATS', payload: chats } as ChatAction);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as ApiError).message } as ChatAction);
    }
  };

  const value: ChatContextType = {
    ...state,
    sendMessage,
    createNewChat,
    selectChat,
    updateChatTitle,
    deleteChat,
    setSelectedModel,
    clearError,
    refreshChats,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
