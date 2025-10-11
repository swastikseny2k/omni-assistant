import React, { useState, useEffect } from 'react';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskPriority, TaskStatus, getTaskPriorityDisplayName, getTaskStatusDisplayName } from '../../types/task';
import { localToUtc } from '../../utils/dateUtils';
import './TaskForm.css';

interface TaskFormProps {
  task?: Task;
  parentTaskId?: number;
  onSubmit: (taskData: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  parentTaskId,
  onSubmit,
  onCancel,
  mode
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    dueDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        notes: task.notes || '',
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''
      });
    }
  }, [mode, task]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDate < now) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const taskData: CreateTaskRequest | UpdateTaskRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate ? localToUtc(new Date(formData.dueDate)) : undefined
      };

      // Add parentTaskId for create mode
      if (mode === 'create' && parentTaskId) {
        (taskData as CreateTaskRequest).parentTaskId = parentTaskId;
      }

      // Add status for edit mode
      if (mode === 'edit') {
        (taskData as UpdateTaskRequest).status = formData.status;
      }

      await onSubmit(taskData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-form-overlay">
      <div className="task-form-container">
        <div className="task-form-header">
          <h2>
            {mode === 'create' ? 'Create New Task' : 'Edit Task'}
            {parentTaskId && mode === 'create' && ' (Subtask)'}
          </h2>
          <button 
            onClick={onCancel}
            className="close-button"
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="Enter task title..."
              maxLength={200}
              disabled={loading}
            />
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Enter task description..."
              rows={4}
              maxLength={1000}
              disabled={loading}
            />
            <div className="character-count">
              {formData.description.length}/1000 characters
            </div>
            {errors.description && <div className="error-message">{errors.description}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Add notes to this task..."
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority" className="form-label">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="form-select"
                disabled={loading}
              >
                {Object.values(TaskPriority).map(priority => (
                  <option key={priority} value={priority}>
                    {getTaskPriorityDisplayName(priority)}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'edit' && (
              <div className="form-group">
                <label htmlFor="status" className="form-label">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-select"
                  disabled={loading}
                >
                  {Object.values(TaskStatus).map(status => (
                    <option key={status} value={status}>
                      {getTaskStatusDisplayName(status)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="dueDate" className="form-label">
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              className={`form-input ${errors.dueDate ? 'error' : ''}`}
              disabled={loading}
            />
            {errors.dueDate && <div className="error-message">{errors.dueDate}</div>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                mode === 'create' ? 'Create Task' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
