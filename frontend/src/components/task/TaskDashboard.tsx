import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { TaskFilters, Task } from '../../types/task';
import TaskList from './TaskList';
import TaskFiltersComponent from './TaskFilters';
import TaskStats from './TaskStats';
import NotificationCenter from './NotificationCenter';
import './TaskDashboard.css';

const TaskDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    tasks, 
    filteredTasks, 
    fetchTasks, 
    fetchOverdueTasks, 
    fetchTasksDueSoon, 
    applyFilters,
    refreshTasks
  } = useTask();

  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<'all' | 'overdue' | 'dueSoon' | 'topLevel'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});

  // Removed automatic loading - user must manually refresh

  const handleViewChange = async (view: 'all' | 'overdue' | 'dueSoon' | 'topLevel') => {
    setActiveView(view);
    
    try {
      switch (view) {
        case 'overdue':
          await fetchOverdueTasks();
          break;
        case 'dueSoon':
          await fetchTasksDueSoon(24);
          break;
        case 'topLevel':
          // Filter to show only top-level tasks
          applyFilters({ ...filters, parentTaskId: undefined });
          break;
        default:
          await fetchTasks();
          break;
      }
    } catch (error: any) {
      console.error('Failed to change view:', error.message || error);
    }
  };

  const handleFiltersChange = (newFilters: TaskFilters) => {
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    applyFilters({});
  };

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

  const getViewTitle = () => {
    switch (activeView) {
      case 'overdue':
        return 'Overdue Tasks';
      case 'dueSoon':
        return 'Tasks Due Soon';
      case 'topLevel':
        return 'Top-Level Tasks';
      default:
        return 'All Tasks';
    }
  };

  const getViewDescription = () => {
    switch (activeView) {
      case 'overdue':
        return 'Tasks that are past their due date';
      case 'dueSoon':
        return 'Tasks due within the next 24 hours';
      case 'topLevel':
        return 'Main tasks without parent tasks';
      default:
        return 'All your tasks organized in one place';
    }
  };

  const overdueCount = tasks.filter(task => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  }).length;

  const dueSoonCount = tasks.filter(task => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const hoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return dueDate >= now && dueDate <= hoursFromNow;
  }).length;

  return (
    <div className="task-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">Task Management</h1>
            <div className="view-info">
              <h2 className="view-title">{getViewTitle()}</h2>
              <p className="view-description">{getViewDescription()}</p>
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
                onClick={handleNavigateToChat}
                className="nav-button chat-button"
              >
                💬 Chat
              </button>
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

      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => handleViewChange('all')}
          >
            📋 All Tasks
            <span className="tab-count">{tasks.length}</span>
          </button>
          
          <button
            className={`nav-tab ${activeView === 'topLevel' ? 'active' : ''}`}
            onClick={() => handleViewChange('topLevel')}
          >
            🎯 Top Level
            <span className="tab-count">
              {tasks.filter(task => !task.parentTask).length}
            </span>
          </button>
          
          <button
            className={`nav-tab ${activeView === 'dueSoon' ? 'active' : ''}`}
            onClick={() => handleViewChange('dueSoon')}
          >
            ⏰ Due Soon
            <span className="tab-count">{dueSoonCount}</span>
          </button>
          
          <button
            className={`nav-tab ${activeView === 'overdue' ? 'active' : ''}`}
            onClick={() => handleViewChange('overdue')}
          >
            ⚠️ Overdue
            <span className="tab-count">{overdueCount}</span>
          </button>
        </div>
        
        <div className="nav-actions">
          <button
            className="refresh-btn"
            onClick={async () => {
              try {
                await refreshTasks();
              } catch (error: any) {
                console.error('Failed to refresh tasks:', error.message || error);
              }
            }}
            title="Refresh tasks"
          >
            🔄 Refresh
          </button>
          <button
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 Filters
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-layout">
          {/* Sidebar with Statistics */}
          <aside className="dashboard-sidebar">
            <TaskStats />
            
            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button
                  className="action-button primary"
                  onClick={() => {
                    // This would trigger the TaskList's create task functionality
                    const createButton = document.querySelector('.task-list .btn-primary') as HTMLButtonElement;
                    if (createButton) createButton.click();
                  }}
                >
                  + New Task
                </button>
                <button
                  className="action-button secondary"
                  onClick={() => handleViewChange('overdue')}
                >
                  View Overdue
                </button>
                <button
                  className="action-button secondary"
                  onClick={() => handleViewChange('dueSoon')}
                >
                  View Due Soon
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="dashboard-content">
            {/* Filters */}
            {showFilters && (
              <div className="filters-section">
                <TaskFiltersComponent
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  availableTasks={tasks}
                />
              </div>
            )}

            {/* Task List */}
            <div className="task-list-section">
              <TaskList
                showOnlyTopLevel={activeView === 'topLevel'}
                showFilters={false} // We handle filters separately
                showActions={true}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>&copy; 2024 Omni Assistant. All rights reserved.</p>
          <div className="footer-links">
            <button onClick={() => navigate('/')} className="footer-link">
              Home
            </button>
            <button onClick={handleNavigateToChat} className="footer-link">
              Chat
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TaskDashboard;
