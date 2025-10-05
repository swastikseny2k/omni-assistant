import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTask } from '../../contexts/TaskContext';
import { isTaskOverdue, isTaskDueSoon } from '../../types/task';
import './TaskDrawer.css';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TaskDrawer: React.FC<TaskDrawerProps> = ({ isOpen, onClose }) => {
  const { tasks, loading, error } = useTask();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'due' | 'overdue' | 'all'>('overdue');

  const getFilteredTasks = () => {
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
    
    switch (activeTab) {
      case 'overdue':
        return tasks.filter(task => isTaskOverdue(task));
      case 'due':
        return tasks.filter(task => isTaskDueSoon(task, 24) && !isTaskOverdue(task));
      case 'all':
        return tasks.slice(0, 10); // Show first 10 tasks for performance
      default:
        return [];
    }
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444';
      case 'MEDIUM':
        return '#f59e0b';
      case 'LOW':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#10b981';
      case 'IN_PROGRESS':
        return '#3b82f6';
      case 'TODO':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const handleTaskClick = (taskId: number) => {
    onClose();
    navigate('/tasks');
  };

  const handleCreateTask = () => {
    onClose();
    navigate('/tasks');
  };

  const filteredTasks = getFilteredTasks();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="task-drawer-overlay" onClick={onClose} />
      )}

      {/* Drawer */}
      <div className={`task-drawer ${isOpen ? 'task-drawer-open' : ''}`}>
        <div className="task-drawer-header">
          <h3>Tasks</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="task-drawer-tabs">
          <button
            className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
            onClick={() => setActiveTab('overdue')}
          >
            Overdue ({tasks?.filter(isTaskOverdue).length || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === 'due' ? 'active' : ''}`}
            onClick={() => setActiveTab('due')}
          >
            Due Soon ({tasks?.filter(task => isTaskDueSoon(task, 24) && !isTaskOverdue(task)).length || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({tasks?.length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="task-drawer-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
              <p>Loading tasks...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>Error loading tasks: {error}</p>
              <p className="error-hint">Please try refreshing the page or check your connection.</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {activeTab === 'overdue' ? '✅' : activeTab === 'due' ? '⏰' : '📋'}
              </div>
              <p>
                {activeTab === 'overdue' 
                  ? 'No overdue tasks!' 
                  : activeTab === 'due' 
                  ? 'No tasks due soon!' 
                  : 'No tasks yet'
                }
              </p>
              <button onClick={handleCreateTask} className="create-task-btn">
                Create Task
              </button>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-item"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    {task.description && (
                      <div className="task-description">
                        {task.description.length > 60 
                          ? `${task.description.substring(0, 60)}...` 
                          : task.description
                        }
                      </div>
                    )}
                    <div className="task-meta">
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                      <span 
                        className="status-badge"
                        style={{ color: getStatusColor(task.status) }}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.dueDate && (
                        <span className="due-date">
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="task-drawer-footer">
          <button onClick={handleCreateTask} className="create-task-btn-footer">
            + New Task
          </button>
          <button onClick={() => navigate('/tasks')} className="view-all-btn">
            View All Tasks
          </button>
        </div>
      </div>
    </>
  );
};

export default TaskDrawer;
