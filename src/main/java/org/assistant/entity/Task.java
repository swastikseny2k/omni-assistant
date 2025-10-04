package org.assistant.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tasks")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Task {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.TODO;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority = TaskPriority.MEDIUM;
    
    @Column(name = "due_date")
    private LocalDateTime dueDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @Column(name = "created_from_email")
    private Boolean createdFromEmail = false;
    
    @Column(name = "email_source_id")
    private String emailSourceId;
    
    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_task_id")
    private Task parentTask;
    
    @OneToMany(mappedBy = "parentTask", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Task> subTasks = new ArrayList<>();
    
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "task_dependencies",
        joinColumns = @JoinColumn(name = "task_id"),
        inverseJoinColumns = @JoinColumn(name = "depends_on_task_id")
    )
    private List<Task> dependencies = new ArrayList<>();
    
    @ManyToMany(mappedBy = "dependencies", fetch = FetchType.LAZY)
    private List<Task> dependentTasks = new ArrayList<>();
    
    // Constructors
    public Task() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public Task(String title, String description, User owner) {
        this();
        this.title = title;
        this.description = description;
        this.owner = owner;
    }
    
    public Task(String title, String description, User owner, Task parentTask) {
        this(title, description, owner);
        this.parentTask = parentTask;
    }
    
    // Business methods
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (status == TaskStatus.COMPLETED && completedAt == null) {
            this.completedAt = LocalDateTime.now();
        }
    }
    
    public void addSubTask(Task subTask) {
        subTasks.add(subTask);
        subTask.setParentTask(this);
    }
    
    public void removeSubTask(Task subTask) {
        subTasks.remove(subTask);
        subTask.setParentTask(null);
    }
    
    public void addDependency(Task dependency) {
        if (!dependencies.contains(dependency)) {
            dependencies.add(dependency);
            dependency.getDependentTasks().add(this);
        }
    }
    
    public void removeDependency(Task dependency) {
        dependencies.remove(dependency);
        dependency.getDependentTasks().remove(this);
    }
    
    public boolean isCompleted() {
        return status == TaskStatus.COMPLETED;
    }
    
    public boolean isOverdue() {
        return dueDate != null && LocalDateTime.now().isAfter(dueDate) && !isCompleted();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public TaskStatus getStatus() {
        return status;
    }
    
    public void setStatus(TaskStatus status) {
        this.status = status;
    }
    
    public TaskPriority getPriority() {
        return priority;
    }
    
    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }
    
    public LocalDateTime getDueDate() {
        return dueDate;
    }
    
    public void setDueDate(LocalDateTime dueDate) {
        this.dueDate = dueDate;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
    
    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
    
    public Boolean getCreatedFromEmail() {
        return createdFromEmail;
    }
    
    public void setCreatedFromEmail(Boolean createdFromEmail) {
        this.createdFromEmail = createdFromEmail;
    }
    
    public String getEmailSourceId() {
        return emailSourceId;
    }
    
    public void setEmailSourceId(String emailSourceId) {
        this.emailSourceId = emailSourceId;
    }
    
    public User getOwner() {
        return owner;
    }
    
    public void setOwner(User owner) {
        this.owner = owner;
    }
    
    public Task getParentTask() {
        return parentTask;
    }
    
    public void setParentTask(Task parentTask) {
        this.parentTask = parentTask;
    }
    
    public List<Task> getSubTasks() {
        return subTasks;
    }
    
    public void setSubTasks(List<Task> subTasks) {
        this.subTasks = subTasks;
    }
    
    public List<Task> getDependencies() {
        return dependencies;
    }
    
    public void setDependencies(List<Task> dependencies) {
        this.dependencies = dependencies;
    }
    
    public List<Task> getDependentTasks() {
        return dependentTasks;
    }
    
    public void setDependentTasks(List<Task> dependentTasks) {
        this.dependentTasks = dependentTasks;
    }
    
    @Override
    public String toString() {
        return "Task{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", status=" + status +
                ", priority=" + priority +
                ", dueDate=" + dueDate +
                ", owner=" + (owner != null ? owner.getName() : null) +
                ", parentTask=" + (parentTask != null ? parentTask.getId() : null) +
                '}';
    }
}
