import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import MessageComponent from './MessageComponent';
import BackendStatus from './BackendStatus';
import './ChatInterface.css';

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onToggleSidebar }) => {
  const {
    currentChat,
    messages,
    availableModels,
    selectedModel,
    isSendingMessage,
    error,
    sendMessage,
    setSelectedModel,
    clearError,
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Small delay to ensure DOM has updated
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

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const getCurrentModelInfo = () => {
    return availableModels?.find(model => model.id === selectedModel);
  };

  const renderWelcomeMessage = () => (
    <div className="welcome-message">
      <div className="welcome-content">
        <div className="welcome-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h2>Welcome to Omni Assistant</h2>
        <p>Your AI-powered task management and chat assistant</p>
        
        <div className="welcome-features">
          <div className="feature-item">
            <div className="feature-icon">🤖</div>
            <div className="feature-text">
              <strong>Multi-Model AI</strong>
              <span>Chat with OpenAI GPT-4o-mini or DeepSeek models</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📋</div>
            <div className="feature-text">
              <strong>Task Management</strong>
              <span>Create, organize, and track tasks through natural conversation</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <div className="feature-text">
              <strong>Function Calling</strong>
              <span>AI can perform actions like creating tasks and retrieving data</span>
            </div>
          </div>
        </div>

        <div className="welcome-examples">
          <h3>Try asking:</h3>
          <div className="example-prompts">
            <button 
              className="example-prompt"
              onClick={() => setInputMessage("Create a task to review the quarterly report")}
            >
              "Create a task to review the quarterly report"
            </button>
            <button 
              className="example-prompt"
              onClick={() => setInputMessage("Show me all my high priority tasks")}
            >
              "Show me all my high priority tasks"
            </button>
            <button 
              className="example-prompt"
              onClick={() => setInputMessage("What tasks are due this week?")}
            >
              "What tasks are due this week?"
            </button>
          </div>
        </div>

        <div className="getting-started">
          <h3>🚀 Getting Started</h3>
          <div className="getting-started-content">
            <p><strong>To use the chat functionality:</strong></p>
            <ol>
              <li>Make sure your backend server is running on <code>http://localhost:8080</code></li>
              <li>Check the connection status indicator in the header</li>
              <li>Select your preferred AI model from the dropdown</li>
              <li>Start chatting or ask AI to create tasks!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChatHeader = () => (
    <div className="chat-header">
      <div className="chat-header-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="chat-title">
          {currentChat ? currentChat.title : 'Select a chat or start a new conversation'}
        </div>
      </div>
      
      <div className="chat-header-right">
        <BackendStatus />
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="messages-container">
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
              <span className="typing-text">
                {getCurrentModelInfo()?.name || 'AI'} is typing...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );

  const renderInputArea = () => (
    <div className="input-area">
      {error && (
        <div className="error-banner">
          <span className="error-message">{error}</span>
          <button className="error-dismiss" onClick={clearError}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      
      <div className="input-container">
        {/* Model selector and input info above the input field */}
          <table width="100%">
              <tr>
                  <div className="input-header">
                      <div className="model-selector">
                          <label htmlFor="model-select">Model:</label>
                          <select
                              id="model-select"
                              value={selectedModel}
                              onChange={(e) => handleModelChange(e.target.value)}
                              className="model-select"
                              disabled={isSendingMessage}
                          >
                              {availableModels && availableModels.map((model) => (
                                  <option key={model.id} value={model.id}>
                                      {model.name} {model.supportsFunctionCalling ? '🔧' : ''}
                                  </option>
                              ))}
                          </select>
                      </div>
                      <div className="input-info">
                          <div className="model-info">
                              Using {getCurrentModelInfo()?.name || 'AI'}
                              {getCurrentModelInfo()?.supportsFunctionCalling && ' with function calling'}
                          </div>
                          <div className="input-hint">
                              Press Enter to send, Shift+Enter for new line
                          </div>
                      </div>
                  </div>
              </tr>
              <tr>
                  <div className="input-field-row">
                      <div className="input-wrapper">
          <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={currentChat ? "Type your message..." : "Start a new conversation..."}
              className="message-input"
              disabled={isSendingMessage}
              rows={1}
              style={{
                  height: 'auto',
                  minHeight: '24px',
                  maxHeight: '120px',
              }}
              onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
          />
                          <button
                              onClick={handleSendMessage}
                              disabled={!inputMessage.trim() || isSendingMessage}
                              className="send-button"
                          >
                              {isSendingMessage ? (
                                  <div className="loading-spinner">
                                      <div className="spinner"></div>
                                  </div>
                              ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="22" y1="2" x2="11" y2="13"></line>
                                      <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                                  </svg>
                              )}
                          </button>
                      </div>
                  </div>
              </tr>
          </table>
      </div>
    </div>
  );

  return (
    <div className="chat-interface">
      {renderChatHeader()}
      {renderMessages()}
      {renderInputArea()}
    </div>
  );
};

export default ChatInterface;
