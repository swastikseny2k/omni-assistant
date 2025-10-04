import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigateToChat = () => {
    navigate('/chat');
  };

  const handleNavigateToTasks = () => {
    navigate('/tasks');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">Omni Assistant</h1>
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
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Welcome back, {user?.name}!</h2>
          <p>Your AI-powered task management and chat assistant is ready to help you.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card clickable" onClick={handleNavigateToChat}>
            <div className="feature-icon">💬</div>
            <h3>AI Chat</h3>
            <p>Chat with AI assistants powered by OpenAI and DeepSeek models</p>
            <div className="feature-action">Start Chatting →</div>
          </div>

          <div className="feature-card clickable" onClick={handleNavigateToTasks}>
            <div className="feature-icon">📋</div>
            <h3>Task Management</h3>
            <p>Create, organize, and track your tasks with intelligent features</p>
            <div className="feature-action">Manage Tasks →</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h3>Function Calling</h3>
            <p>AI can create and manage tasks through natural conversation</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics</h3>
            <p>Track your productivity with detailed task statistics</p>
          </div>
        </div>

        <div className="coming-soon">
          <h3>🚀 More Features Coming Soon</h3>
          <p>We're working on bringing you even more powerful features to enhance your productivity.</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
