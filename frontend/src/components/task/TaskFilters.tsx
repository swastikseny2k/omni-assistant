import React, { useState, useEffect } from 'react';
import { TaskFilters as TaskFiltersType, TaskStatus, TaskPriority, getTaskPriorityDisplayName, getTaskStatusDisplayName } from '../../types/task';
import './TaskFilters.css';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  onClearFilters: () => void;
  availableTasks?: any[]; // For parent task selection
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  availableTasks = []
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusToggle = (status: TaskStatus) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    onFiltersChange({ 
      ...filters, 
      status: newStatuses.length > 0 ? newStatuses : undefined 
    });
  };

  const handlePriorityToggle = (priority: TaskPriority) => {
    const currentPriorities = filters.priority || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];
    
    onFiltersChange({ 
      ...filters, 
      priority: newPriorities.length > 0 ? newPriorities : undefined 
    });
  };

  const handleOverdueToggle = () => {
    onFiltersChange({ ...filters, overdue: !filters.overdue });
  };

  const handleDueSoonToggle = () => {
    onFiltersChange({ ...filters, dueSoon: !filters.dueSoon });
  };

  const handleEmailSourceToggle = () => {
    onFiltersChange({ 
      ...filters, 
      createdFromEmail: filters.createdFromEmail === undefined ? true : undefined 
    });
  };

  const handleParentTaskChange = (taskId: string) => {
    onFiltersChange({ 
      ...filters, 
      parentTaskId: taskId ? parseInt(taskId) : undefined 
    });
  };

  const hasActiveFilters = () => {
    return !!(
      filters.search ||
      (filters.status && filters.status.length > 0) ||
      (filters.priority && filters.priority.length > 0) ||
      filters.overdue ||
      filters.dueSoon ||
      filters.parentTaskId ||
      filters.createdFromEmail !== undefined
    );
  };

  return (
    <div className="task-filters">
      <div className="filters-header">
        <h3>Filters</h3>
        {hasActiveFilters() && (
          <button 
            onClick={onClearFilters}
            className="clear-filters-btn"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div className="filter-group">
        <label className="filter-label">Search</label>
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => handleSearchChange('')}
              className="clear-search-btn"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        <button
          onClick={handleOverdueToggle}
          className={`quick-filter-btn ${filters.overdue ? 'active' : ''}`}
        >
          ⚠️ Overdue
        </button>
        <button
          onClick={handleDueSoonToggle}
          className={`quick-filter-btn ${filters.dueSoon ? 'active' : ''}`}
        >
          ⏰ Due Soon
        </button>
        <button
          onClick={handleEmailSourceToggle}
          className={`quick-filter-btn ${filters.createdFromEmail ? 'active' : ''}`}
        >
          📧 From Email
        </button>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="advanced-toggle">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="toggle-btn"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          {/* Status Filter */}
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <div className="checkbox-group">
              {Object.values(TaskStatus).map(status => (
                <label key={status} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(filters.status || []).includes(status)}
                    onChange={() => handleStatusToggle(status)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">
                    {getTaskStatusDisplayName(status)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="filter-group">
            <label className="filter-label">Priority</label>
            <div className="checkbox-group">
              {Object.values(TaskPriority).map(priority => (
                <label key={priority} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(filters.priority || []).includes(priority)}
                    onChange={() => handlePriorityToggle(priority)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">
                    {getTaskPriorityDisplayName(priority)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Parent Task Filter */}
          {availableTasks.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Parent Task</label>
              <select
                value={filters.parentTaskId || ''}
                onChange={(e) => handleParentTaskChange(e.target.value)}
                className="select-input"
              >
                <option value="">All tasks</option>
                {availableTasks
                  .filter(task => !task.parentTask) // Only top-level tasks
                  .map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="active-filters">
          <h4>Active Filters:</h4>
          <div className="active-filter-tags">
            {filters.search && (
              <span className="filter-tag">
                Search: "{filters.search}"
                <button onClick={() => handleSearchChange('')}>×</button>
              </span>
            )}
            {filters.status && filters.status.length > 0 && (
              <span className="filter-tag">
                Status: {filters.status.map(s => getTaskStatusDisplayName(s)).join(', ')}
                <button onClick={() => onFiltersChange({ ...filters, status: undefined })}>×</button>
              </span>
            )}
            {filters.priority && filters.priority.length > 0 && (
              <span className="filter-tag">
                Priority: {filters.priority.map(p => getTaskPriorityDisplayName(p)).join(', ')}
                <button onClick={() => onFiltersChange({ ...filters, priority: undefined })}>×</button>
              </span>
            )}
            {filters.overdue && (
              <span className="filter-tag">
                Overdue
                <button onClick={handleOverdueToggle}>×</button>
              </span>
            )}
            {filters.dueSoon && (
              <span className="filter-tag">
                Due Soon
                <button onClick={handleDueSoonToggle}>×</button>
              </span>
            )}
            {filters.createdFromEmail && (
              <span className="filter-tag">
                From Email
                <button onClick={handleEmailSourceToggle}>×</button>
              </span>
            )}
            {filters.parentTaskId && (
              <span className="filter-tag">
                Parent: {availableTasks.find(t => t.id === filters.parentTaskId)?.title || 'Unknown'}
                <button onClick={() => onFiltersChange({ ...filters, parentTaskId: undefined })}>×</button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
