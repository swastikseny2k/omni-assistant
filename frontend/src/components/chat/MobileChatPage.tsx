import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChat, ChatProvider } from '../../contexts/ChatContext';
import { useTask } from '../../contexts/TaskContext';
import { isTaskOverdue } from '../../types/task';
import MessageComponent from './MessageComponent';
import BackendStatus from './BackendStatus';
import TaskDrawer from './TaskDrawer';
import { Chat } from '../../types/chat';
import { getRelativeTime } from '../../utils/dateUtils';
import './MobileChatPage.css';

const MobileChatPageContent: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const {
    chats,
    currentChat,
    messages,
    availableModels,
    selectedModel,
    isSendingMessage,
    error,
    sendMessage,
    clearError,
    createNewChat,
    selectChat,
    deleteChat,
    updateChatTitle,
    isLoading
  } = useChat();

  const { tasks, fetchTasks } = useTask();

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch tasks when component mounts (only once)
  useEffect(() => {
    if (fetchTasks && tasks.length === 0) {
      fetchTasks();
    }
  }, []); // Empty dependency array to run only once on mount

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Focus input when chat changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentChat]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSendingMessage) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateNewChat = async () => {
    try {
      await createNewChat();
      setShowChatList(false);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    if (chat.id !== currentChat?.id) {
      try {
        await selectChat(chat.id);
        setShowChatList(false);
      } catch (error) {
        console.error('Failed to select chat:', error);
      }
    }
  };

  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat?')) {
      try {
        await deleteChat(chatId);
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
    }
  };

  const handleStartEdit = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = async () => {
    if (editingChatId && editTitle.trim()) {
      try {
        await updateChatTitle(editingChatId, editTitle.trim());
        setEditingChatId(null);
        setEditTitle('');
      } catch (error) {
        console.error('Failed to update chat title:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleKeyPressEdit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getCurrentModelInfo = () => {
    return availableModels?.find(model => model.id === selectedModel);
  };

  const renderWelcomeMessage = () => (
    <div className="mobile-welcome">
      <div className="welcome-icon">🤖</div>
      <h2>Welcome!</h2>
      <p>Start a conversation with AI</p>
      
      <div className="quick-actions">
        <button 
          className="quick-action-btn"
          onClick={() => setInputMessage("Create a task to review the quarterly report")}
        >
          📋 Create Task
        </button>
        <button 
          className="quick-action-btn"
          onClick={() => setInputMessage("Show me my tasks")}
        >
          📊 View Tasks
        </button>
      </div>
    </div>
  );

  const renderChatList = () => (
    <div className="mobile-chat-list">
      <div className="chat-list-header">
        <h3>Chats</h3>
        <button className="close-chat-list" onClick={() => setShowChatList(false)}>
          ✕
        </button>
      </div>
      
      <button className="new-chat-btn" onClick={handleCreateNewChat}>
        + New Chat
      </button>
      
      <div className="chats-container">
        {isLoading ? (
          <div className="loading">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="no-chats">No chats yet</div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => handleSelectChat(chat)}
            >
              {editingChatId === chat.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyPressEdit}
                  className="chat-title-input"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="chat-content">
                  <div 
                    className="chat-title"
                    onClick={(e) => handleStartEdit(chat, e)}
                  >
                    {chat.title}
                  </div>
                  <div className="chat-meta">
                    {getRelativeTime(chat.updatedAt)} • {chat.messageCount} msgs
                  </div>
                </div>
              )}
              
              <div className="chat-actions">
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="mobile-messages">
      {!messages || messages.length === 0 ? (
        renderWelcomeMessage()
      ) : (
        <>
          {messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>{getCurrentModelInfo()?.name || 'AI'} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );

  const renderInputArea = () => (
    <div className="mobile-input-area">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError}>✕</button>
        </div>
      )}
      
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={currentChat ? "Message..." : "Start chatting..."}
          className="message-input"
          disabled={isSendingMessage}
          rows={1}
          style={{
            height: 'auto',
            minHeight: '20px',
            maxHeight: '100px',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 100) + 'px';
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isSendingMessage}
          className="send-btn"
        >
          {isSendingMessage ? '⏳' : '➤'}
        </button>
      </div>
      
      <div className="model-info">
        {getCurrentModelInfo()?.name || 'AI'}
        {getCurrentModelInfo()?.supportsFunctionCalling && ' 🔧'}
      </div>
    </div>
  );

  return (
    <div className="mobile-chat-page">
      {/* Header */}
      <header className="mobile-header">
        <div className="header-left">
          <button 
            className="menu-btn"
            onClick={() => setShowChatList(!showChatList)}
          >
            ☰
          </button>
          <div className="chat-title">
            {currentChat ? currentChat.title : 'Chat'}
          </div>
        </div>
        
        <div className="header-right">
          <BackendStatus />
          <button className="desktop-btn" onClick={() => navigate('/chat')} title="Desktop view">
            💻
          </button>
          <button className="tasks-btn" onClick={() => setShowTaskDrawer(true)} title="Tasks">
            📋
            {tasks.filter(isTaskOverdue).length > 0 && (
              <span className="task-badge">{tasks.filter(isTaskOverdue).length}</span>
            )}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            ⚙️
          </button>
        </div>
      </header>

      {/* Chat List Overlay */}
      {showChatList && (
        <div className="chat-list-overlay" onClick={() => setShowChatList(false)}>
          <div className="chat-list-content" onClick={(e) => e.stopPropagation()}>
            {renderChatList()}
          </div>
        </div>
      )}

      {/* Task Drawer */}
      <TaskDrawer 
        isOpen={showTaskDrawer} 
        onClose={() => setShowTaskDrawer(false)} 
      />

      {/* Main Content */}
      <div className="mobile-content">
        {renderMessages()}
      </div>

      {/* Input Area */}
      {renderInputArea()}
    </div>
  );
};

const MobileChatPage: React.FC = () => {
  return (
    <ChatProvider>
      <MobileChatPageContent />
    </ChatProvider>
  );
};

export default MobileChatPage;
