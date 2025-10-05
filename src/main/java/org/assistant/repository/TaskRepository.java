package org.assistant.repository;

import org.assistant.entity.Task;
import org.assistant.entity.TaskPriority;
import org.assistant.entity.TaskStatus;
import org.assistant.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    // Find tasks by owner
    List<Task> findByOwner(User owner);
    
    // Find tasks by owner and status
    List<Task> findByOwnerAndStatus(User owner, TaskStatus status);
    
    // Find tasks by owner and priority
    List<Task> findByOwnerAndPriority(User owner, TaskPriority priority);
    
    // Find tasks by owner and status and priority
    List<Task> findByOwnerAndStatusAndPriority(User owner, TaskStatus status, TaskPriority priority);
    
    // Find sub-tasks of a parent task
    List<Task> findByParentTask(Task parentTask);
    
    // Find tasks with no parent (top-level tasks)
    List<Task> findByParentTaskIsNull();
    
    // Find tasks by owner with no parent
    List<Task> findByOwnerAndParentTaskIsNull(User owner);
    
    // Find overdue tasks for a user
    @Query("SELECT t FROM Task t WHERE t.owner = :owner AND t.dueDate < :currentTime AND t.status != 'COMPLETED'")
    List<Task> findOverdueTasksByOwner(@Param("owner") User owner, @Param("currentTime") LocalDateTime currentTime);
    
    // Find tasks due soon (within specified hours)
    @Query("SELECT t FROM Task t WHERE t.owner = :owner AND t.dueDate BETWEEN :currentTime AND :futureTime AND t.status != 'COMPLETED'")
    List<Task> findTasksDueSoonByOwner(@Param("owner") User owner, 
                                       @Param("currentTime") LocalDateTime currentTime, 
                                       @Param("futureTime") LocalDateTime futureTime);
    
    // Find tasks created from email
    List<Task> findByCreatedFromEmailTrue();
    
    // Find tasks by email source ID
    Optional<Task> findByEmailSourceId(String emailSourceId);
    
    // Find tasks by owner and email source
    List<Task> findByOwnerAndCreatedFromEmailTrue(User owner);
    
    // Find tasks with dependencies
    @Query("SELECT t FROM Task t JOIN t.dependencies d WHERE t.owner = :owner")
    List<Task> findTasksWithDependenciesByOwner(@Param("owner") User owner);
    
    // Find tasks that are dependencies of other tasks
    @Query("SELECT t FROM Task t JOIN t.dependentTasks dt WHERE t.owner = :owner")
    List<Task> findDependentTasksByOwner(@Param("owner") User owner);
    
    // Find tasks by title containing (case-insensitive search)
    List<Task> findByOwnerAndTitleContainingIgnoreCase(User owner, String title);
    
    // Find tasks by description containing (case-insensitive search)
    List<Task> findByOwnerAndDescriptionContainingIgnoreCase(User owner, String description);
    
    // Count tasks by owner and status
    long countByOwnerAndStatus(User owner, TaskStatus status);
    
    // Count tasks by owner and priority
    long countByOwnerAndPriority(User owner, TaskPriority priority);
    
    // Find tasks created between dates
    List<Task> findByOwnerAndCreatedAtBetween(User owner, LocalDateTime startDate, LocalDateTime endDate);
    
    // Find tasks completed between dates
    List<Task> findByOwnerAndCompletedAtBetween(User owner, LocalDateTime startDate, LocalDateTime endDate);
    
    // Find tasks due between dates
    List<Task> findByOwnerAndDueDateBetween(User owner, LocalDateTime startDate, LocalDateTime endDate);
    
    // Count tasks by owner
    long countByOwner(User owner);
}
