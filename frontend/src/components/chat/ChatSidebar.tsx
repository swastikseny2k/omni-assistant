import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { Chat } from '../../types/chat';
import { getRelativeTime } from '../../utils/dateUtils';
import './ChatSidebar.css';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const { 
    chats, 
    currentChat, 
    isLoading, 
    createNewChat, 
    selectChat, 
    deleteChat,
    updateChatTitle 
  } = useChat();
  
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleCreateNewChat = async () => {
    try {
      await createNewChat();
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    if (chat.id !== currentChat?.id) {
      try {
        await selectChat(chat.id);
      } catch (error) {
        console.error('Failed to select chat:', error);
      }
    }
  };

  const handleDeleteChat = async (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onToggle} />
      )}
      
      {/* Sidebar */}
      <div className={`chat-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-button" onClick={handleCreateNewChat}>
            <svg className="plus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Chat
          </button>
          
          <button className="close-sidebar-button" onClick={onToggle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          {isLoading ? (
            <div className="loading-chats">
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
              <p>Loading chats...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="empty-chats">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <p>No chats yet</p>
              <p className="empty-subtitle">Start a conversation to see your chats here</p>
            </div>
          ) : (
            <div className="chat-list">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-item ${currentChat?.id === chat.id ? 'chat-item-active' : ''}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="chat-item-content">
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyPress}
                        className="chat-title-input"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="chat-title" onClick={(e) => handleStartEdit(chat, e)}>
                        {chat.title}
                      </div>
                    )}
                    <div className="chat-meta">
                      <span className="chat-date">{getRelativeTime(chat.updatedAt)}</span>
                      <span className="chat-message-count">{chat.messageCount} messages</span>
                    </div>
                  </div>
                  
                  <div className="chat-actions">
                    <button
                      className="edit-button"
                      onClick={(e) => handleStartEdit(chat, e)}
                      title="Edit title"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="delete-button"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      title="Delete chat"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
