import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, getTaskPriorityColor, getTaskStatusColor, getTaskPriorityDisplayName, getTaskStatusDisplayName, isTaskOverdue, isTaskDueSoon } from '../../types/task';
import { formatUtcDate } from '../../utils/dateUtils';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
  onPriorityChange?: (task: Task, newPriority: TaskPriority) => void;
  onAddSubTask?: (parentTask: Task) => void;
  onAddDependency?: (task: Task) => void;
  onRefresh?: () => void;
  showSubTasks?: boolean;
  level?: number;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onAddSubTask,
  onAddDependency,
  onRefresh,
  showSubTasks = true,
  level = 0
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showSubTasksLocal, setShowSubTasksLocal] = useState(false);

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (onStatusChange) {
      onStatusChange(task, newStatus);
    }
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    if (onPriorityChange) {
      onPriorityChange(task, newPriority);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task);

  return (
    <div className={`task-card level-${level}`} style={{ marginLeft: `${level * 20}px` }}>
      <div className="task-card-header">
        <div className="task-title-section">
          <h4 className="task-title">{task.title}</h4>
          {task.dueDate && (
            <div className="task-due-date-main">
              <span className={`due-date-text ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}`}>
                📅 Due: {formatUtcDate(task.dueDate)}
              </span>
            </div>
          )}
          <div className="task-badges">
            <span 
              className="priority-badge"
              style={{ backgroundColor: getTaskPriorityColor(task.priority) }}
            >
              {getTaskPriorityDisplayName(task.priority)}
            </span>
            <span 
              className="status-badge"
              style={{ backgroundColor: getTaskStatusColor(task.status) }}
            >
              {getTaskStatusDisplayName(task.status)}
            </span>
            {isOverdue && <span className="overdue-badge">OVERDUE</span>}
            {isDueSoon && !isOverdue && <span className="due-soon-badge">DUE SOON</span>}
          </div>
        </div>
        
        <div className="task-actions">
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className="status-select"
          >
            {Object.values(TaskStatus).map(status => (
              <option key={status} value={status}>
                {getTaskStatusDisplayName(status)}
              </option>
            ))}
          </select>
          
          <select
            value={task.priority}
            onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
            className="priority-select"
          >
            {Object.values(TaskPriority).map(priority => (
              <option key={priority} value={priority}>
                {getTaskPriorityDisplayName(priority)}
              </option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="action-button details-button"
            title="Toggle details"
          >
            {showDetails ? '▼' : '▶'}
          </button>
          
          {onEdit && (
            <button 
              onClick={() => onEdit(task)}
              className="action-button edit-button"
              title="Edit task"
            >
              ✏️
            </button>
          )}
          
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="action-button refresh-button"
              title="Refresh task"
            >
              🔄
            </button>
          )}
          
          {onDelete && (
            <button 
              onClick={() => onDelete(task)}
              className="action-button delete-button"
              title="Delete task"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="task-details">
          {task.description && (
            <div className="task-description">
              <strong>Description:</strong>
              <p>{task.description}</p>
            </div>
          )}
          
          <div className="task-meta">
            <div className="meta-item">
              <strong>Created:</strong> {formatUtcDate(task.createdAt)}
            </div>
            {task.updatedAt !== task.createdAt && (
              <div className="meta-item">
                <strong>Updated:</strong> {formatUtcDate(task.updatedAt)}
              </div>
            )}
            {task.dueDate && (
              <div className="meta-item">
                <strong>Due:</strong> 
                <span className={isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}>
                  {formatUtcDate(task.dueDate)}
                </span>
              </div>
            )}
            {task.completedAt && (
              <div className="meta-item">
                <strong>Completed:</strong> {formatUtcDate(task.completedAt)}
              </div>
            )}
          </div>

          {task.createdFromEmail && (
            <div className="email-source">
              <span className="email-badge">📧 Created from email</span>
            </div>
          )}

          {task.dependencies && task.dependencies.length > 0 && (
            <div className="dependencies">
              <strong>Dependencies:</strong>
              <ul>
                {task.dependencies.map(dep => (
                  <li key={dep.id}>
                    <span className="dependency-title">{dep.title}</span>
                    <span className={`dependency-status ${dep.status.toLowerCase()}`}>
                      {getTaskStatusDisplayName(dep.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.dependentTasks && task.dependentTasks.length > 0 && (
            <div className="dependent-tasks">
              <strong>Blocks:</strong>
              <ul>
                {task.dependentTasks.map(dep => (
                  <li key={dep.id}>
                    <span className="dependent-title">{dep.title}</span>
                    <span className={`dependent-status ${dep.status.toLowerCase()}`}>
                      {getTaskStatusDisplayName(dep.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="task-actions-detailed">
            {onAddSubTask && (
              <button 
                onClick={() => onAddSubTask(task)}
                className="action-button add-subtask-button"
              >
                + Add Subtask
              </button>
            )}
            
            {onAddDependency && (
              <button 
                onClick={() => onAddDependency(task)}
                className="action-button add-dependency-button"
              >
                + Add Dependency
              </button>
            )}
          </div>

          {showSubTasks && task.subTasks && task.subTasks.length > 0 && (
            <div className="subtasks-section">
              <button 
                onClick={() => setShowSubTasksLocal(!showSubTasksLocal)}
                className="subtasks-toggle"
              >
                {showSubTasksLocal ? '▼' : '▶'} Subtasks ({task.subTasks.length})
              </button>
              
              {showSubTasksLocal && (
                <div className="subtasks-list">
                  {task.subTasks.map(subTask => (
                    <TaskCard
                      key={subTask.id}
                      task={subTask}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      onPriorityChange={onPriorityChange}
                      onAddSubTask={onAddSubTask}
                      onAddDependency={onAddDependency}
                      level={level + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
