import React from 'react';
import { ChatMessage } from '../../types/chat';
import { formatUtcTime } from '../../utils/dateUtils';
import './MessageComponent.css';

interface MessageComponentProps {
  message: ChatMessage;
}

const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  const renderFunctionCall = () => {
    if (message.role !== 'FUNCTION' || !message.functionName) return null;

    return (
      <div className="function-call">
        <div className="function-header">
          <div className="function-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <div className="function-info">
            <div className="function-name">{message.functionName}</div>
            <div className="function-time">{formatUtcTime(message.createdAt)}</div>
          </div>
        </div>
        
        {message.functionArguments && (
          <div className="function-arguments">
            <div className="function-label">Arguments:</div>
            <pre className="function-args-content">
              {JSON.stringify(JSON.parse(message.functionArguments), null, 2)}
            </pre>
          </div>
        )}
        
        {message.functionResult && (
          <div className="function-result">
            <div className="function-label">Result:</div>
            <div 
              className="function-result-content"
              dangerouslySetInnerHTML={{ __html: formatContent(message.functionResult) }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderUserMessage = () => (
    <div className="message user-message">
      <div className="message-content">
        <div className="message-text">{message.content}</div>
        <div className="message-time">{formatUtcTime(message.createdAt)}</div>
      </div>
      <div className="message-avatar user-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    </div>
  );

  const renderAssistantMessage = () => (
    <div className="message assistant-message">
      <div className="message-avatar assistant-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      </div>
      <div className="message-content">
        <div className="message-header">
          <div className="assistant-name">
            {message.model === 'deepseek' ? 'DeepSeek' : 'OpenAI'}
          </div>
          <div className="message-time">{formatUtcTime(message.createdAt)}</div>
        </div>
        <div 
          className="message-text"
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
      </div>
    </div>
  );

  const renderMessage = () => {
    switch (message.role) {
      case 'USER':
        return renderUserMessage();
      case 'ASSISTANT':
        return renderAssistantMessage();
      case 'FUNCTION':
        return renderFunctionCall();
      default:
        return null;
    }
  };

  return (
    <div className="message-container">
      {renderMessage()}
    </div>
  );
};

export default MessageComponent;
