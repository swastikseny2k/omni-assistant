import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChatProvider } from '../../contexts/ChatContext';
import { TaskProvider } from '../../contexts/TaskContext';
import ChatSidebar from './ChatSidebar';
import ChatInterface from './ChatInterface';
import TaskSidebar from './TaskSidebar';
import './ChatPage.css';

const ChatPageContent: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="chat-page">
      <header className="chat-page-header">
        <div className="header-content">
          <div className="header-left">
            <button className="sidebar-toggle-mobile" onClick={handleToggleSidebar}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="app-title">Omni Assistant</h1>
          </div>
          
          <div className="header-right">
            <button 
              onClick={() => navigate('/tasks')}
              className="nav-button tasks-nav-button"
              title="Go to Tasks"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"></path>
                <polyline points="9,11 9,7 12,4 15,7 15,11"></polyline>
              </svg>
              <span>Tasks</span>
            </button>
            <div className="user-info">
              <div className="user-details">
                <span className="user-name">{user?.name}</span>
                <span className="user-email">{user?.email}</span>
              </div>
              {user?.picture && (
                <img 
                  src={user.picture} 
                  alt="Profile" 
                  className="user-avatar"
                />
              )}
            </div>
            <button onClick={handleLogout} className="logout-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="chat-page-content">
        <ChatSidebar 
          isOpen={sidebarOpen} 
          onToggle={handleToggleSidebar}
        />
        <ChatInterface onToggleSidebar={handleToggleSidebar} />
        <TaskSidebar />
      </div>
    </div>
  );
};

const ChatPage: React.FC = () => {
  return (
    <TaskProvider>
      <ChatProvider>
        <ChatPageContent />
      </ChatProvider>
    </TaskProvider>
  );
};

export default ChatPage;
