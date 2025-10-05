import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChatProvider } from '../../contexts/ChatContext';
import { useMobileRedirect } from '../../hooks/useMobileRedirect';
import ChatSidebar from './ChatSidebar';
import ChatInterface from './ChatInterface';
import TaskSidebar from './TaskSidebar';
import NotificationCenter from '../task/NotificationCenter';
import './ChatPage.css';

const ChatPageContent: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Mobile redirect hook
  const {
    deviceType,
    userPreference,
    isRedirecting,
    shouldUseMobile,
    setUserPreference,
    redirectToMobile,
    redirectToDesktop
  } = useMobileRedirect({
    mobilePath: '/mobile-chat',
    desktopPath: '/chat',
    enableAutoRedirect: true,
    enableUserPreference: true
  });

  // Show loading while redirecting
  if (isRedirecting) {
    return (
      <div className="redirect-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Redirecting to {shouldUseMobile ? 'mobile' : 'desktop'} view...</p>
      </div>
    );
  }

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
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button className="sidebar-toggle-mobile" onClick={handleToggleSidebar}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="dashboard-title">Omni Assistant</h1>
            <div className="view-info">
              <h2 className="view-title">Chat Assistant</h2>
              <p className="view-description">AI-powered conversation and task management</p>
            </div>
          </div>
          
          <div className="header-right">
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
            
            <div className="header-actions">
              <NotificationCenter />
              <button 
                onClick={() => navigate('/tasks')}
                className="nav-button tasks-button"
              >
                📋 Tasks
              </button>
              {deviceType === 'desktop' && (
                <button 
                  onClick={redirectToMobile}
                  className="nav-button mobile-toggle-button"
                  title="Switch to mobile view"
                >
                  📱 Mobile
                </button>
              )}
              <button 
                onClick={handleLogout} 
                className="nav-button logout-button"
              >
                Logout
              </button>
            </div>
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
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  );
};

export default ChatPage;
