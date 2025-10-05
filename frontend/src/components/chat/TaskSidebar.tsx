import React, { useState, useEffect } from 'react';
import { useTask } from '../../contexts/TaskContext';
import { Task, TaskPriority, TaskStatus, getTaskPriorityColor, getTaskStatusDisplayName, getTaskPriorityDisplayName, isTaskOverdue, isTaskDueSoon } from '../../types/task';
import { formatDueDate, utcToLocal } from '../../utils/dateUtils';
import './TaskSidebar.css';

interface TaskSidebarProps {
  className?: string;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({ className = '' }) => {
  const { tasks, fetchTasks, fetchOverdueTasks, fetchTasksDueSoon, refreshTasks } = useTask();
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [dueSoonTasks, setDueSoonTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overdue' | 'dueSoon'>('overdue');

  useEffect(() => {
    const initializeTasks = async () => {
      try {
        // First, ensure tasks are loaded in the context
        if (tasks.length === 0) {
          await fetchTasks();
        }
        // Then load the filtered tasks for the sidebar
        loadTasks();
      } catch (error) {
        console.error('Failed to initialize tasks for sidebar:', error);
      }
    };
    
    initializeTasks();
  }, []); // Only run once on mount

  // Reload filtered tasks when the main tasks array changes
  useEffect(() => {
    if (tasks.length > 0) {
      loadTasks();
    }
  }, [tasks.length]); // Only depend on tasks.length to avoid infinite loops

  const loadTasks = async () => {
    try {
      setLoading(true);
      
      // Get all tasks and filter locally for better performance
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const overdue = tasks.filter(task => 
        task.dueDate && 
        utcToLocal(task.dueDate) < now && 
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.CANCELLED
      );
      
      const dueSoon = tasks.filter(task => 
        task.dueDate && 
        utcToLocal(task.dueDate) >= now && 
        utcToLocal(task.dueDate) <= oneDayFromNow &&
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.CANCELLED
      );
      
      // Sort by priority (URGENT > HIGH > MEDIUM > LOW)
      const priorityOrder = {
        [TaskPriority.URGENT]: 0,
        [TaskPriority.HIGH]: 1,
        [TaskPriority.MEDIUM]: 2,
        [TaskPriority.LOW]: 3
      };
      
      const sortedOverdue = overdue.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // If same priority, sort by due date (most overdue first)
        return utcToLocal(a.dueDate!).getTime() - utcToLocal(b.dueDate!).getTime();
      });
      
      const sortedDueSoon = dueSoon.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // If same priority, sort by due date (earliest first)
        return utcToLocal(a.dueDate!).getTime() - utcToLocal(b.dueDate!).getTime();
      });
      
      setOverdueTasks(sortedOverdue);
      setDueSoonTasks(sortedDueSoon);
    } catch (error) {
      console.error('Failed to load tasks for sidebar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshTasks();
      await loadTasks();
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  };


  const renderTaskItem = (task: Task) => (
    <div key={task.id} className="task-sidebar-item">
      <div className="task-item-header">
        <div className="task-priority-indicator" style={{ backgroundColor: getTaskPriorityColor(task.priority) }}>
          {getTaskPriorityDisplayName(task.priority)}
        </div>
        <div className="task-status">
          {getTaskStatusDisplayName(task.status)}
        </div>
      </div>
      
      <div className="task-item-content">
        <div className="task-title">{task.title}</div>
        {task.dueDate && (
          <div className={`task-due-date ${isTaskOverdue(task) ? 'overdue' : isTaskDueSoon(task) ? 'due-soon' : ''}`}>
            {formatDueDate(task.dueDate)}
          </div>
        )}
      </div>
    </div>
  );

  const renderTasksList = (taskList: Task[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="task-sidebar-loading">
          <div className="loading-spinner"></div>
          <p>Loading tasks...</p>
        </div>
      );
    }

    if (taskList.length === 0) {
      return (
        <div className="task-sidebar-empty">
          <div className="empty-icon">✅</div>
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="task-sidebar-list">
        {taskList.map(renderTaskItem)}
      </div>
    );
  };

  return (
    <div className={`task-sidebar ${className}`}>
      <div className="task-sidebar-header">
        <h3>📋 Tasks</h3>
        <button 
          onClick={handleRefresh}
          className="refresh-btn"
          title="Refresh tasks"
        >
          🔄
        </button>
      </div>

      <div className="task-sidebar-tabs">
        <button
          className={`tab-button ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          ⚠️ Overdue ({overdueTasks.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'dueSoon' ? 'active' : ''}`}
          onClick={() => setActiveTab('dueSoon')}
        >
          ⏰ Due Soon ({dueSoonTasks.length})
        </button>
      </div>

      <div className="task-sidebar-content">
        {activeTab === 'overdue' && renderTasksList(
          overdueTasks, 
          "No overdue tasks! Great job staying on track."
        )}
        
        {activeTab === 'dueSoon' && renderTasksList(
          dueSoonTasks, 
          "No tasks due in the next 24 hours."
        )}
      </div>

      <div className="task-sidebar-footer">
        <button 
          onClick={() => window.location.href = '/tasks'}
          className="view-all-btn"
        >
          View All Tasks →
        </button>
      </div>
    </div>
  );
};

export default TaskSidebar;
