package org.assistant.controller;

import org.assistant.entity.Task;
import org.assistant.entity.TaskPriority;
import org.assistant.entity.TaskStatus;
import org.assistant.entity.User;
import org.assistant.service.TaskService;
import org.assistant.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private static final Logger log = LoggerFactory.getLogger(TaskController.class);
    @Autowired
    private TaskService taskService;
    
    @Autowired
    private UserService userService;
    
    /**
     * Helper method to get the current user from either OAuth2User or User authentication
     */
    private User getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        
        Object principal = authentication.getPrincipal();
        
        if (principal instanceof User) {
            // JWT authentication - principal is already a User
            return (User) principal;
        } else if (principal instanceof OAuth2User) {
            // OAuth2 authentication - need to get/create user from OAuth2User
            OAuth2User oauth2User = (OAuth2User) principal;
            return userService.getOrCreateUser(oauth2User);
        }
        
        return null;
    }
    
    // Test endpoint to verify the controller is working
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testEndpoint(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Task controller is working");
        
        User user = getCurrentUser(authentication);
        response.put("user", user != null ? user.getEmail() : "No user");
        return ResponseEntity.ok(response);
    }
    
    // Create a new task
    @PostMapping
    public ResponseEntity<Task> createTask(@RequestBody CreateTaskRequest request, 
                                         Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            Task task = new Task(request.getTitle(), request.getDescription(), user);
            
            if (request.getPriority() != null) {
                task.setPriority(request.getPriority());
            }
            
            if (request.getDueDate() != null) {
                task.setDueDate(request.getDueDate());
            }
            
            if (request.getNotes() != null) {
                task.setNotes(request.getNotes());
            }
            
            if (request.getParentTaskId() != null) {
                Optional<Task> parentTask = taskService.getTaskByIdAndOwner(request.getParentTaskId(), user);
                if (parentTask.isPresent()) {
                    task.setParentTask(parentTask.get());
                } else {
                    return ResponseEntity.badRequest().build();
                }
            }
            
            Task createdTask = taskService.createTask(task);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdTask);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Create a task from email
    @PostMapping("/from-email")
    public ResponseEntity<Task> createTaskFromEmail(@RequestBody CreateTaskFromEmailRequest request,
                                                   @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            
            Task task = taskService.createTaskFromEmail(
                request.getTitle(),
                request.getDescription(),
                user,
                request.getEmailSourceId()
            );
            
            if (request.getPriority() != null) {
                task.setPriority(request.getPriority());
            }
            
            if (request.getDueDate() != null) {
                task.setDueDate(request.getDueDate());
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(taskService.updateTask(task));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get all tasks for the current user
    @GetMapping
    public ResponseEntity<List<Task>> getTasks(Authentication authentication) {
        try {
            log.debug("Getting tasks for authentication: {}", authentication != null ? authentication.getClass().getSimpleName() : "null");
            User user = getCurrentUser(authentication);
            if (user == null) {
                log.warn("No user found in authentication context");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            log.debug("Getting tasks for user: {}", user.getEmail());
            List<Task> tasks = taskService.getTasksByOwner(user);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            log.error("Error getting tasks", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Get top-level tasks (no parent)
    @GetMapping("/top-level")
    public ResponseEntity<List<Task>> getTopLevelTasks(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<Task> tasks = taskService.getTopLevelTasksByOwner(user);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get task by ID
    @GetMapping("/{id}")
    public ResponseEntity<Task> getTask(@PathVariable Long id, 
                                      Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            Optional<Task> task = taskService.getTaskByIdAndOwner(id, user);
            
            if (task.isPresent()) {
                return ResponseEntity.ok(task.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Update a task
    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, 
                                         @RequestBody UpdateTaskRequest request,
                                         Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            Optional<Task> taskOpt = taskService.getTaskByIdAndOwner(id, user);
            
            if (taskOpt.isPresent()) {
                Task task = taskOpt.get();
                
                if (request.getTitle() != null) {
                    task.setTitle(request.getTitle());
                }
                
                if (request.getDescription() != null) {
                    task.setDescription(request.getDescription());
                }
                
                if (request.getStatus() != null) {
                    task.setStatus(request.getStatus());
                }
                
                if (request.getPriority() != null) {
                    task.setPriority(request.getPriority());
                }
                
                if (request.getDueDate() != null) {
                    task.setDueDate(request.getDueDate());
                }
                
                if (request.getNotes() != null) {
                    task.setNotes(request.getNotes());
                }
                
                Task updatedTask = taskService.updateTask(task);
                return ResponseEntity.ok(updatedTask);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Delete a task
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id, 
                                         Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            Optional<Task> taskOpt = taskService.getTaskByIdAndOwner(id, user);
            
            if (taskOpt.isPresent()) {
                taskService.deleteTask(taskOpt.get());
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get tasks by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Task>> getTasksByStatus(@PathVariable TaskStatus status,
                                                      Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<Task> tasks = taskService.getTasksByOwnerAndStatus(user, status);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get tasks by priority
    @GetMapping("/priority/{priority}")
    public ResponseEntity<List<Task>> getTasksByPriority(@PathVariable TaskPriority priority,
                                                        Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<Task> tasks = taskService.getTasksByOwnerAndPriority(user, priority);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get sub-tasks
    @GetMapping("/{id}/subtasks")
    public ResponseEntity<List<Task>> getSubTasks(@PathVariable Long id,
                                                 @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            Optional<Task> parentTask = taskService.getTaskByIdAndOwner(id, user);
            
            if (parentTask.isPresent()) {
                List<Task> subTasks = taskService.getSubTasks(parentTask.get());
                return ResponseEntity.ok(subTasks);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Add sub-task
    @PostMapping("/{id}/subtasks")
    public ResponseEntity<Task> addSubTask(@PathVariable Long id,
                                         @RequestBody CreateTaskRequest request,
                                         @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            Optional<Task> parentTask = taskService.getTaskByIdAndOwner(id, user);
            
            if (parentTask.isPresent()) {
                Task subTask = new Task(request.getTitle(), request.getDescription(), user);
                
                if (request.getPriority() != null) {
                    subTask.setPriority(request.getPriority());
                }
                
                if (request.getDueDate() != null) {
                    subTask.setDueDate(request.getDueDate());
                }
                
                if (request.getNotes() != null) {
                    subTask.setNotes(request.getNotes());
                }
                
                Task createdSubTask = taskService.addSubTask(parentTask.get(), subTask);
                return ResponseEntity.status(HttpStatus.CREATED).body(createdSubTask);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Add dependency
    @PostMapping("/{id}/dependencies")
    public ResponseEntity<Void> addDependency(@PathVariable Long id,
                                            @RequestBody Map<String, Long> request,
                                            @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            Optional<Task> taskOpt = taskService.getTaskByIdAndOwner(id, user);
            Optional<Task> dependencyOpt = taskService.getTaskByIdAndOwner(request.get("dependencyId"), user);
            
            if (taskOpt.isPresent() && dependencyOpt.isPresent()) {
                taskService.addDependency(taskOpt.get(), dependencyOpt.get());
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Remove dependency
    @DeleteMapping("/{id}/dependencies/{dependencyId}")
    public ResponseEntity<Void> removeDependency(@PathVariable Long id,
                                               @PathVariable Long dependencyId,
                                               @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            Optional<Task> taskOpt = taskService.getTaskByIdAndOwner(id, user);
            Optional<Task> dependencyOpt = taskService.getTaskByIdAndOwner(dependencyId, user);
            
            if (taskOpt.isPresent() && dependencyOpt.isPresent()) {
                taskService.removeDependency(taskOpt.get(), dependencyOpt.get());
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get overdue tasks
    @GetMapping("/overdue")
    public ResponseEntity<List<Task>> getOverdueTasks(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.badRequest().build();
            }
            List<Task> tasks = taskService.getOverdueTasks(user);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            log.error("Error getting overdue tasks", e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get tasks due soon
    @GetMapping("/due-soon")
    public ResponseEntity<List<Task>> getTasksDueSoon(@RequestParam(defaultValue = "24") int hours,
                                                     Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.badRequest().build();
            }
            List<Task> tasks = taskService.getTasksDueSoon(user, hours);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            log.error("Error getting tasks due soon", e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Search tasks
    @GetMapping("/search")
    public ResponseEntity<List<Task>> searchTasks(@RequestParam String query,
                                                 @RequestParam(defaultValue = "title") String type,
                                                 @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            List<Task> tasks;
            
            if ("description".equals(type)) {
                tasks = taskService.searchTasksByDescription(user, query);
            } else {
                tasks = taskService.searchTasksByTitle(user, query);
            }
            
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get tasks created from email
    @GetMapping("/from-email")
    public ResponseEntity<List<Task>> getTasksFromEmail(@AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            List<Task> tasks = taskService.getTasksCreatedFromEmail(user);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get task statistics
    @GetMapping("/statistics")
    public ResponseEntity<TaskService.TaskStatistics> getTaskStatistics(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                return ResponseEntity.badRequest().build();
            }
            
            TaskService.TaskStatistics stats = taskService.getTaskStatistics(user);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error getting task statistics", e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Advanced filtering endpoint
    @GetMapping("/filter")
    public ResponseEntity<List<Task>> filterTasks(
            @RequestParam(required = false) List<TaskStatus> status,
            @RequestParam(required = false) List<TaskPriority> priority,
            @RequestParam(required = false) Boolean overdue,
            @RequestParam(required = false) Boolean dueSoon,
            @RequestParam(required = false) Integer dueSoonHours,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long parentTaskId,
            @RequestParam(required = false) Boolean createdFromEmail,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            List<Task> tasks = taskService.getFilteredTasks(user, status, priority, overdue, dueSoon, dueSoonHours, 
                                                           search, parentTaskId, createdFromEmail, sortBy, sortOrder);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Bulk operations
    @PostMapping("/bulk/update-status")
    public ResponseEntity<Map<String, Object>> bulkUpdateStatus(
            @RequestBody BulkUpdateStatusRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            int updatedCount = taskService.bulkUpdateTaskStatus(user, request.getTaskIds(), request.getStatus());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("updatedCount", updatedCount);
            response.put("message", "Successfully updated " + updatedCount + " task(s)");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to update tasks: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @PostMapping("/bulk/update-priority")
    public ResponseEntity<Map<String, Object>> bulkUpdatePriority(
            @RequestBody BulkUpdatePriorityRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            int updatedCount = taskService.bulkUpdateTaskPriority(user, request.getTaskIds(), request.getPriority());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("updatedCount", updatedCount);
            response.put("message", "Successfully updated " + updatedCount + " task(s)");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to update tasks: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @DeleteMapping("/bulk/delete")
    public ResponseEntity<Map<String, Object>> bulkDeleteTasks(
            @RequestBody BulkDeleteRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            int deletedCount = taskService.bulkDeleteTasks(user, request.getTaskIds());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("deletedCount", deletedCount);
            response.put("message", "Successfully deleted " + deletedCount + " task(s)");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to delete tasks: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    // Get tasks with pagination
    @GetMapping("/paginated")
    public ResponseEntity<Map<String, Object>> getTasksPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder,
            @RequestParam(required = false) List<TaskStatus> status,
            @RequestParam(required = false) List<TaskPriority> priority,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            User user = userService.getOrCreateUser(principal);
            Map<String, Object> result = taskService.getTasksPaginated(user, page, size, sortBy, sortOrder, 
                                                                      status, priority, search);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Request DTOs
    public static class CreateTaskRequest {
        private String title;
        private String description;
        private TaskPriority priority;
        private LocalDateTime dueDate;
        private Long parentTaskId;
        private String notes;
        
        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public TaskPriority getPriority() { return priority; }
        public void setPriority(TaskPriority priority) { this.priority = priority; }
        
        public LocalDateTime getDueDate() { return dueDate; }
        public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
        
        public Long getParentTaskId() { return parentTaskId; }
        public void setParentTaskId(Long parentTaskId) { this.parentTaskId = parentTaskId; }
        
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }
    
    public static class CreateTaskFromEmailRequest {
        private String title;
        private String description;
        private String emailSourceId;
        private TaskPriority priority;
        private LocalDateTime dueDate;
        
        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public String getEmailSourceId() { return emailSourceId; }
        public void setEmailSourceId(String emailSourceId) { this.emailSourceId = emailSourceId; }
        
        public TaskPriority getPriority() { return priority; }
        public void setPriority(TaskPriority priority) { this.priority = priority; }
        
        public LocalDateTime getDueDate() { return dueDate; }
        public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    }
    
    public static class UpdateTaskRequest {
        private String title;
        private String description;
        private TaskStatus status;
        private TaskPriority priority;
        private LocalDateTime dueDate;
        private String notes;
        
        // Getters and Setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        
        public TaskStatus getStatus() { return status; }
        public void setStatus(TaskStatus status) { this.status = status; }
        
        public TaskPriority getPriority() { return priority; }
        public void setPriority(TaskPriority priority) { this.priority = priority; }
        
        public LocalDateTime getDueDate() { return dueDate; }
        public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
        
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }
    
    // Bulk operation request DTOs
    public static class BulkUpdateStatusRequest {
        private List<Long> taskIds;
        private TaskStatus status;
        
        public List<Long> getTaskIds() { return taskIds; }
        public void setTaskIds(List<Long> taskIds) { this.taskIds = taskIds; }
        
        public TaskStatus getStatus() { return status; }
        public void setStatus(TaskStatus status) { this.status = status; }
    }
    
    public static class BulkUpdatePriorityRequest {
        private List<Long> taskIds;
        private TaskPriority priority;
        
        public List<Long> getTaskIds() { return taskIds; }
        public void setTaskIds(List<Long> taskIds) { this.taskIds = taskIds; }
        
        public TaskPriority getPriority() { return priority; }
        public void setPriority(TaskPriority priority) { this.priority = priority; }
    }
    
    public static class BulkDeleteRequest {
        private List<Long> taskIds;
        
        public List<Long> getTaskIds() { return taskIds; }
        public void setTaskIds(List<Long> taskIds) { this.taskIds = taskIds; }
    }
}
