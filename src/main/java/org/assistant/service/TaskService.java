package org.assistant.service;

import org.assistant.entity.Task;
import org.assistant.entity.TaskPriority;
import org.assistant.entity.TaskStatus;
import org.assistant.entity.User;
import org.assistant.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaskService {
    
    @Autowired
    private TaskRepository taskRepository;
    
    // Create a new task
    public Task createTask(Task task) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        task.setCreatedAt(now);
        task.setUpdatedAt(now);
        return taskRepository.save(task);
    }
    
    // Create a task from email
    public Task createTaskFromEmail(String title, String description, User owner, String emailSourceId) {
        Task task = new Task(title, description, owner);
        task.setCreatedFromEmail(true);
        task.setEmailSourceId(emailSourceId);
        return createTask(task);
    }
    
    // Batch insert multiple tasks
    public List<Task> createTasksBatch(List<Task> tasks) {
        if (tasks == null || tasks.isEmpty()) {
            return List.of();
        }
        
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        
        // Set timestamps for all tasks
        for (Task task : tasks) {
            task.setCreatedAt(now);
            task.setUpdatedAt(now);
        }
        
        // Use saveAll for efficient batch insert
        return taskRepository.saveAll(tasks);
    }
    
    // Batch insert multiple tasks with validation
    public List<Task> createTasksBatchWithValidation(List<Task> tasks, User owner) {
        if (tasks == null || tasks.isEmpty()) {
            return List.of();
        }
        
        // Validate that all tasks belong to the specified owner
        for (Task task : tasks) {
            if (!task.getOwner().getId().equals(owner.getId())) {
                throw new IllegalArgumentException("All tasks must belong to the specified owner");
            }
        }
        
        return createTasksBatch(tasks);
    }
    
    // Update an existing task
    public Task updateTask(Task task) {
        task.setUpdatedAt(LocalDateTime.now());
        if (task.getStatus() == TaskStatus.COMPLETED && task.getCompletedAt() == null) {
            task.setCompletedAt(LocalDateTime.now());
        }
        return taskRepository.save(task);
    }
    
    // Get task by ID
    public Optional<Task> getTaskById(Long id) {
        return taskRepository.findById(id);
    }
    
    // Get task by ID and owner (for security)
    public Optional<Task> getTaskByIdAndOwner(Long id, User owner) {
        Optional<Task> task = taskRepository.findById(id);
        if (task.isPresent()) {
            User taskOwner = task.get().getOwner();
            if (taskOwner.getId().equals(owner.getId())) {
                return task;
            }
        }

        return Optional.empty();
    }
    
    // Get all tasks for a user
    public List<Task> getTasksByOwner(User owner) {
        return taskRepository.findByOwner(owner);
    }
    
    // Get tasks by owner and status
    public List<Task> getTasksByOwnerAndStatus(User owner, TaskStatus status) {
        return taskRepository.findByOwnerAndStatus(owner, status);
    }
    
    // Get tasks by owner and priority
    public List<Task> getTasksByOwnerAndPriority(User owner, TaskPriority priority) {
        return taskRepository.findByOwnerAndPriority(owner, priority);
    }
    
    // Get top-level tasks (no parent) for a user
    public List<Task> getTopLevelTasksByOwner(User owner) {
        return taskRepository.findByOwnerAndParentTaskIsNull(owner);
    }
    
    // Get sub-tasks of a parent task
    public List<Task> getSubTasks(Task parentTask) {
        return taskRepository.findByParentTask(parentTask);
    }
    
    // Add a sub-task
    public Task addSubTask(Task parentTask, Task subTask) {
        if (!parentTask.getOwner().getId().equals(subTask.getOwner().getId())) {
            throw new IllegalArgumentException("Sub-task owner must match parent task owner");
        }
        
        parentTask.addSubTask(subTask);
        subTask = taskRepository.save(subTask);
        taskRepository.save(parentTask);
        return subTask;
    }
    
    // Remove a sub-task
    public void removeSubTask(Task parentTask, Task subTask) {
        parentTask.removeSubTask(subTask);
        taskRepository.save(parentTask);
    }
    
    // Add a dependency
    public void addDependency(Task task, Task dependency) {
        if (!task.getOwner().getId().equals(dependency.getOwner().getId())) {
            throw new IllegalArgumentException("Task and dependency must have the same owner");
        }
        
        if (task.getId().equals(dependency.getId())) {
            throw new IllegalArgumentException("Task cannot depend on itself");
        }
        
        // Check for circular dependencies
        if (wouldCreateCircularDependency(task, dependency)) {
            throw new IllegalArgumentException("Adding this dependency would create a circular dependency");
        }
        
        task.addDependency(dependency);
        taskRepository.save(task);
    }
    
    // Remove a dependency
    public void removeDependency(Task task, Task dependency) {
        task.removeDependency(dependency);
        taskRepository.save(task);
    }
    
    // Check for circular dependencies
    private boolean wouldCreateCircularDependency(Task task, Task dependency) {
        return isTaskInDependencyChain(dependency, task);
    }
    
    private boolean isTaskInDependencyChain(Task currentTask, Task targetTask) {
        if (currentTask.getId().equals(targetTask.getId())) {
            return true;
        }
        
        for (Task dep : currentTask.getDependencies()) {
            if (isTaskInDependencyChain(dep, targetTask)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Get overdue tasks for a user
    public List<Task> getOverdueTasks(User owner) {
        return taskRepository.findOverdueTasksByOwner(owner, LocalDateTime.now());
    }
    
    // Get tasks due soon (within specified hours)
    public List<Task> getTasksDueSoon(User owner, int hours) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime future = now.plusHours(hours);
        return taskRepository.findTasksDueSoonByOwner(owner, now, future);
    }
    
    // Search tasks by title
    public List<Task> searchTasksByTitle(User owner, String title) {
        return taskRepository.findByOwnerAndTitleContainingIgnoreCase(owner, title);
    }
    
    // Search tasks by description
    public List<Task> searchTasksByDescription(User owner, String description) {
        return taskRepository.findByOwnerAndDescriptionContainingIgnoreCase(owner, description);
    }
    
    // Get tasks created from email
    public List<Task> getTasksCreatedFromEmail(User owner) {
        return taskRepository.findByOwnerAndCreatedFromEmailTrue(owner);
    }
    
    // Get task by email source ID
    public Optional<Task> getTaskByEmailSourceId(String emailSourceId) {
        return taskRepository.findByEmailSourceId(emailSourceId);
    }
    
    // Delete a task
    public void deleteTask(Task task) {
        // Remove from parent task if it's a sub-task
        if (task.getParentTask() != null) {
            task.getParentTask().removeSubTask(task);
            taskRepository.save(task.getParentTask());
        }
        
        // Remove dependencies
        for (Task dependent : task.getDependentTasks()) {
            dependent.removeDependency(task);
            taskRepository.save(dependent);
        }
        
        // Delete sub-tasks first
        for (Task subTask : task.getSubTasks()) {
            deleteTask(subTask);
        }
        
        taskRepository.delete(task);
    }
    
    // Get task statistics for a user
    public TaskStatistics getTaskStatistics(User owner) {
        long totalTasks = taskRepository.countByOwner(owner);
        long todoTasks = taskRepository.countByOwnerAndStatus(owner, TaskStatus.TODO);
        long inProgressTasks = taskRepository.countByOwnerAndStatus(owner, TaskStatus.IN_PROGRESS);
        long completedTasks = taskRepository.countByOwnerAndStatus(owner, TaskStatus.COMPLETED);
        long cancelledTasks = taskRepository.countByOwnerAndStatus(owner, TaskStatus.CANCELLED);
        
        long highPriorityTasks = taskRepository.countByOwnerAndPriority(owner, TaskPriority.HIGH);
        long urgentTasks = taskRepository.countByOwnerAndPriority(owner, TaskPriority.URGENT);
        
        List<Task> overdueTasks = getOverdueTasks(owner);
        
        return new TaskStatistics(
            totalTasks, todoTasks, inProgressTasks, completedTasks, cancelledTasks,
            highPriorityTasks, urgentTasks, overdueTasks.size()
        );
    }
    
    // Advanced filtering
    public List<Task> getFilteredTasks(User owner, List<TaskStatus> status, List<TaskPriority> priority,
                                     Boolean overdue, Boolean dueSoon, Integer dueSoonHours, String search,
                                     Long parentTaskId, Boolean createdFromEmail, String sortBy, String sortOrder) {
        // This would be implemented with a complex query builder
        // For now, we'll use the existing methods and filter in memory
        List<Task> tasks = taskRepository.findByOwner(owner);
        
        // Apply filters
        if (status != null && !status.isEmpty()) {
            tasks = tasks.stream().filter(task -> status.contains(task.getStatus())).collect(Collectors.toList());
        }
        
        if (priority != null && !priority.isEmpty()) {
            tasks = tasks.stream().filter(task -> priority.contains(task.getPriority())).collect(Collectors.toList());
        }
        
        if (overdue != null && overdue) {
            tasks = tasks.stream().filter(this::isOverdue).collect(Collectors.toList());
        }
        
        if (dueSoon != null && dueSoon) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime future = now.plusHours(dueSoonHours != null ? dueSoonHours : 24);
            tasks = tasks.stream().filter(task -> isDueSoon(task, now, future)).collect(Collectors.toList());
        }
        
        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase();
            tasks = tasks.stream().filter(task -> 
                task.getTitle().toLowerCase().contains(searchLower) ||
                (task.getDescription() != null && task.getDescription().toLowerCase().contains(searchLower))
            ).collect(Collectors.toList());
        }
        
        if (parentTaskId != null) {
            if (parentTaskId == 0) {
                // Filter for top-level tasks
                tasks = tasks.stream().filter(task -> task.getParentTask() == null).collect(Collectors.toList());
            } else {
                // Filter for subtasks of specific parent
                tasks = tasks.stream().filter(task -> 
                    task.getParentTask() != null && task.getParentTask().getId().equals(parentTaskId)
                ).collect(Collectors.toList());
            }
        }
        
        if (createdFromEmail != null) {
            tasks = tasks.stream().filter(task -> 
                createdFromEmail.equals(task.getCreatedFromEmail())
            ).collect(Collectors.toList());
        }
        
        // Apply sorting
        if (sortBy != null) {
            tasks.sort((t1, t2) -> {
                int comparison = 0;
                switch (sortBy) {
                    case "title":
                        comparison = t1.getTitle().compareToIgnoreCase(t2.getTitle());
                        break;
                    case "status":
                        comparison = t1.getStatus().toString().compareTo(t2.getStatus().toString());
                        break;
                    case "priority":
                        comparison = t1.getPriority().ordinal() - t2.getPriority().ordinal();
                        break;
                    case "due":
                        if (t1.getDueDate() == null && t2.getDueDate() == null) comparison = 0;
                        else if (t1.getDueDate() == null) comparison = 1;
                        else if (t2.getDueDate() == null) comparison = -1;
                        else comparison = t1.getDueDate().compareTo(t2.getDueDate());
                        break;
                    case "created":
                    default:
                        comparison = t1.getCreatedAt().compareTo(t2.getCreatedAt());
                        break;
                }
                return "desc".equals(sortOrder) ? -comparison : comparison;
            });
        }
        
        return tasks;
    }
    
    private boolean isOverdue(Task task) {
        return task.getDueDate() != null && LocalDateTime.now().isAfter(task.getDueDate()) && !task.isCompleted();
    }
    
    private boolean isDueSoon(Task task, LocalDateTime now, LocalDateTime future) {
        return task.getDueDate() != null && 
               !task.isCompleted() && 
               task.getDueDate().isAfter(now) && 
               task.getDueDate().isBefore(future);
    }
    
    // Bulk operations
    public int bulkUpdateTaskStatus(User owner, List<Long> taskIds, TaskStatus status) {
        int updatedCount = 0;
        for (Long taskId : taskIds) {
            Optional<Task> taskOpt = getTaskByIdAndOwner(taskId, owner);
            if (taskOpt.isPresent()) {
                Task task = taskOpt.get();
                task.setStatus(status);
                if (status == TaskStatus.COMPLETED && task.getCompletedAt() == null) {
                    task.setCompletedAt(LocalDateTime.now());
                }
                updateTask(task);
                updatedCount++;
            }
        }
        return updatedCount;
    }
    
    public int bulkUpdateTaskPriority(User owner, List<Long> taskIds, TaskPriority priority) {
        int updatedCount = 0;
        for (Long taskId : taskIds) {
            Optional<Task> taskOpt = getTaskByIdAndOwner(taskId, owner);
            if (taskOpt.isPresent()) {
                Task task = taskOpt.get();
                task.setPriority(priority);
                updateTask(task);
                updatedCount++;
            }
        }
        return updatedCount;
    }
    
    public int bulkDeleteTasks(User owner, List<Long> taskIds) {
        int deletedCount = 0;
        for (Long taskId : taskIds) {
            Optional<Task> taskOpt = getTaskByIdAndOwner(taskId, owner);
            if (taskOpt.isPresent()) {
                deleteTask(taskOpt.get());
                deletedCount++;
            }
        }
        return deletedCount;
    }
    
    // Pagination support
    public Map<String, Object> getTasksPaginated(User owner, int page, int size, String sortBy, String sortOrder,
                                                List<TaskStatus> status, List<TaskPriority> priority, String search) {
        // Get filtered tasks first
        List<Task> filteredTasks = getFilteredTasks(owner, status, priority, null, null, null, search, null, null, sortBy, sortOrder);
        
        // Calculate pagination
        int totalItems = filteredTasks.size();
        int totalPages = (int) Math.ceil((double) totalItems / size);
        int startIndex = page * size;
        int endIndex = Math.min(startIndex + size, totalItems);
        
        List<Task> pagedTasks = filteredTasks.subList(startIndex, endIndex);
        
        Map<String, Object> result = new HashMap<>();
        result.put("tasks", pagedTasks);
        result.put("currentPage", page);
        result.put("totalPages", totalPages);
        result.put("totalItems", totalItems);
        result.put("pageSize", size);
        result.put("hasNext", page < totalPages - 1);
        result.put("hasPrevious", page > 0);
        
        return result;
    }
    
    // Task statistics class
    public static class TaskStatistics {
        private final long totalTasks;
        private final long todoTasks;
        private final long inProgressTasks;
        private final long completedTasks;
        private final long cancelledTasks;
        private final long highPriorityTasks;
        private final long urgentTasks;
        private final long overdueTasks;
        
        public TaskStatistics(long totalTasks, long todoTasks, long inProgressTasks, 
                            long completedTasks, long cancelledTasks, long highPriorityTasks, 
                            long urgentTasks, long overdueTasks) {
            this.totalTasks = totalTasks;
            this.todoTasks = todoTasks;
            this.inProgressTasks = inProgressTasks;
            this.completedTasks = completedTasks;
            this.cancelledTasks = cancelledTasks;
            this.highPriorityTasks = highPriorityTasks;
            this.urgentTasks = urgentTasks;
            this.overdueTasks = overdueTasks;
        }
        
        // Getters
        public long getTotalTasks() { return totalTasks; }
        public long getTodoTasks() { return todoTasks; }
        public long getInProgressTasks() { return inProgressTasks; }
        public long getCompletedTasks() { return completedTasks; }
        public long getCancelledTasks() { return cancelledTasks; }
        public long getHighPriorityTasks() { return highPriorityTasks; }
        public long getUrgentTasks() { return urgentTasks; }
        public long getOverdueTasks() { return overdueTasks; }
    }
}
