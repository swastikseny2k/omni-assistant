import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, CreateTaskRequest, UpdateTaskRequest } from '../../types/task';
import { useTask } from '../../contexts/TaskContext';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import './TaskList.css';

interface TaskListProps {
  showOnlyTopLevel?: boolean;
  showFilters?: boolean;
  showActions?: boolean;
  onTaskSelect?: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  showOnlyTopLevel = false,
  showFilters = true,
  showActions = true,
  onTaskSelect
}) => {
  const {
    tasks,
    filteredTasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks,
    fetchTopLevelTasks,
    applyFilters,
    clearFilters,
    refreshTasks
  } = useTask();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);
  const [sortBy, setSortBy] = useState<'created' | 'due' | 'priority' | 'status' | 'title'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Tasks are loaded by the parent component (TaskDashboard)
  // No need to fetch tasks here to avoid duplicate API calls

  const handleCreateTask = async (taskData: CreateTaskRequest | UpdateTaskRequest) => {
    try {
      if (parentTaskForSubtask) {
        await createTask({ ...taskData, parentTaskId: parentTaskForSubtask.id } as CreateTaskRequest);
      } else {
        await createTask(taskData as CreateTaskRequest);
      }
      setShowTaskForm(false);
      setParentTaskForSubtask(null);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleEditTask = async (taskData: UpdateTaskRequest) => {
    if (!editingTask) return;
    
    try {
      await updateTask(editingTask.id, taskData);
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      try {
        await deleteTask(task.id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    try {
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handlePriorityChange = async (task: Task, newPriority: TaskPriority) => {
    try {
      await updateTask(task.id, { priority: newPriority });
    } catch (error) {
      console.error('Failed to update task priority:', error);
    }
  };

  const handleAddSubTask = (parentTask: Task) => {
    setParentTaskForSubtask(parentTask);
    setShowTaskForm(true);
  };

  const handleAddDependency = (task: Task) => {
    // This would open a dependency selection modal
    console.log('Add dependency for task:', task.title);
  };

  const sortedTasks = React.useMemo(() => {
    const tasksToSort = [...(showOnlyTopLevel ? filteredTasks.filter(task => !task.parentTask) : filteredTasks)];
    
    return tasksToSort.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'due':
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'created':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTasks, showOnlyTopLevel, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="task-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-list-error">
        <p>Error: {error}</p>
        <button onClick={async () => {
          try {
            await refreshTasks();
          } catch (error: any) {
            console.error('Failed to retry loading tasks:', error.message || error);
          }
        }}>
          Refresh Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="task-list">
      <div className="task-list-header">
        <div className="task-list-title">
          <h2>{showOnlyTopLevel ? 'Top-Level Tasks' : 'All Tasks'}</h2>
          <span className="task-count">{sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}</span>
        </div>
        
        {showActions && (
          <div className="task-list-actions">
            <button 
              onClick={async () => {
                try {
                  await refreshTasks();
                } catch (error: any) {
                  console.error('Failed to refresh tasks:', error.message || error);
                }
              }}
              className="btn btn-secondary"
              title="Refresh tasks"
            >
              🔄 Refresh
            </button>
            <button 
              onClick={() => setShowTaskForm(true)}
              className="btn btn-primary"
            >
              + New Task
            </button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="task-list-filters">
          <div className="sort-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="sort-select"
            >
              <option value="created">Created Date</option>
              <option value="due">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="title">Title</option>
            </select>
            
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="sort-select"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      )}

      <div className="task-list-content">
        {sortedTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No tasks found</h3>
            <p>
              {filteredTasks.length === tasks.length 
                ? "You don't have any tasks yet. Create your first task to get started!"
                : "No tasks match your current filters. Try adjusting your search criteria."
              }
            </p>
            {filteredTasks.length === tasks.length && showActions && (
              <button 
                onClick={() => setShowTaskForm(true)}
                className="btn btn-primary"
              >
                Create Your First Task
              </button>
            )}
          </div>
        ) : (
          <div className="task-cards">
            {sortedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(task) => {
                  setEditingTask(task);
                  if (onTaskSelect) onTaskSelect(task);
                }}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                onAddSubTask={handleAddSubTask}
                onAddDependency={handleAddDependency}
                onRefresh={async () => {
                  try {
                    await refreshTasks();
                  } catch (error: any) {
                    console.error('Failed to refresh tasks:', error.message || error);
                  }
                }}
                showSubTasks={!showOnlyTopLevel}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={editingTask || undefined}
          parentTaskId={parentTaskForSubtask?.id}
          onSubmit={editingTask ? handleEditTask : handleCreateTask}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(null);
            setParentTaskForSubtask(null);
          }}
          mode={editingTask ? 'edit' : 'create'}
        />
      )}
    </div>
  );
};

export default TaskList;
