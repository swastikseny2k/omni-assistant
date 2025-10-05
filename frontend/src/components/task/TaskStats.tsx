import React, { useEffect } from 'react';
import { TaskStatistics } from '../../types/task';
import { useTask } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import './TaskStats.css';

interface TaskStatsProps {
  className?: string;
}

const TaskStats: React.FC<TaskStatsProps> = ({ className = '' }) => {
  const { statistics, fetchTaskStatistics, loading, error } = useTask();
  const { isAuthenticated } = useAuth();

  // Load statistics automatically when component mounts and user is authenticated
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        if (isAuthenticated) {
          await fetchTaskStatistics();
        }
      } catch (error: any) {
        console.error('Failed to load task statistics:', error.message || error);
      }
    };
    
    loadStatistics();
  }, [isAuthenticated]); // Run when authentication state changes

  if (loading) {
    return (
      <div className={`task-stats ${className}`}>
        <div className="stats-loading">
          <div className="loading-spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className={`task-stats ${className}`}>
        <div className="stats-error">
          <p>Click refresh to load statistics</p>
          <button onClick={async () => {
            try {
              await fetchTaskStatistics();
            } catch (error: any) {
              console.error('Failed to load statistics:', error.message || error);
            }
          }}>Refresh Statistics</button>
        </div>
      </div>
    );
  }

  const completionRate = statistics.totalTasks > 0 
    ? Math.round((statistics.completedTasks / statistics.totalTasks) * 100)
    : 0;

  const progressRate = statistics.totalTasks > 0
    ? Math.round(((statistics.completedTasks + statistics.inProgressTasks) / statistics.totalTasks) * 100)
    : 0;

  return (
    <div className={`task-stats ${className}`}>
      <div className="stats-header">
        <h3>Task Statistics</h3>
        <button 
          onClick={async () => {
            try {
              await fetchTaskStatistics();
            } catch (error: any) {
              console.error('Failed to refresh statistics:', error.message || error);
            }
          }}
          className="refresh-btn"
          title="Refresh statistics"
        >
          🔄
        </button>
      </div>

      <div className="stats-grid">
        {/* Overview Cards */}
        <div className="stat-card overview">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.totalTasks}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>

        <div className="stat-card completion">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.completedTasks}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-percentage">{completionRate}%</div>
          </div>
        </div>

        <div className="stat-card progress">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.inProgressTasks}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card todo">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.todoTasks}</div>
            <div className="stat-label">To Do</div>
          </div>
        </div>

        {/* Priority Cards */}
        <div className="stat-card urgent">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.urgentTasks}</div>
            <div className="stat-label">Urgent</div>
          </div>
        </div>

        <div className="stat-card high-priority">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.highPriorityTasks}</div>
            <div className="stat-label">High Priority</div>
          </div>
        </div>

        {/* Alert Cards */}
        <div className="stat-card overdue">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.overdueTasks}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>

        <div className="stat-card cancelled">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{statistics.cancelledTasks}</div>
            <div className="stat-label">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Progress Visualization */}
      <div className="progress-section">
        <h4>Progress Overview</h4>
        <div className="progress-bars">
          <div className="progress-item">
            <div className="progress-label">
              <span>Overall Progress</span>
              <span>{progressRate}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill progress-overall"
                style={{ width: `${progressRate}%` }}
              ></div>
            </div>
          </div>
          
          <div className="progress-item">
            <div className="progress-label">
              <span>Completion Rate</span>
              <span>{completionRate}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill progress-completion"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="status-distribution">
        <h4>Status Distribution</h4>
        <div className="status-chart">
          <div className="status-item">
            <div className="status-color todo"></div>
            <span>To Do ({statistics.todoTasks})</span>
          </div>
          <div className="status-item">
            <div className="status-color in-progress"></div>
            <span>In Progress ({statistics.inProgressTasks})</span>
          </div>
          <div className="status-item">
            <div className="status-color completed"></div>
            <span>Completed ({statistics.completedTasks})</span>
          </div>
          <div className="status-item">
            <div className="status-color cancelled"></div>
            <span>Cancelled ({statistics.cancelledTasks})</span>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="insights">
        <h4>Quick Insights</h4>
        <div className="insights-list">
          {statistics.overdueTasks > 0 && (
            <div className="insight-item urgent">
              <span className="insight-icon">⚠️</span>
              <span className="insight-text">
                You have {statistics.overdueTasks} overdue task{statistics.overdueTasks !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          {statistics.urgentTasks > 0 && (
            <div className="insight-item high">
              <span className="insight-icon">🚨</span>
              <span className="insight-text">
                {statistics.urgentTasks} urgent task{statistics.urgentTasks !== 1 ? 's' : ''} need attention
              </span>
            </div>
          )}
          
          {completionRate >= 80 && (
            <div className="insight-item positive">
              <span className="insight-icon">🎉</span>
              <span className="insight-text">
                Great job! {completionRate}% completion rate
              </span>
            </div>
          )}
          
          {statistics.totalTasks === 0 && (
            <div className="insight-item neutral">
              <span className="insight-icon">📝</span>
              <span className="insight-text">
                Ready to create your first task?
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskStats;
