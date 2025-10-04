-- MySQL initialization script for Docker container
-- This script runs automatically when the container starts for the first time

-- Create database (already created by MYSQL_DATABASE env var, but ensuring it exists)
CREATE DATABASE IF NOT EXISTS omni_assistant;

-- Use the database
USE omni_assistant;

-- Grant additional privileges to the user (beyond what's set by MYSQL_USER env var)
GRANT ALL PRIVILEGES ON omni_assistant.* TO 'omni_user'@'%';
GRANT CREATE, DROP, ALTER ON omni_assistant.* TO 'omni_user'@'%';

-- Flush privileges to ensure changes take effect
FLUSH PRIVILEGES;

-- The users table will be created automatically by JPA/Hibernate
-- when the application starts, but here's the structure for reference:

/*
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    google_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
*/

-- Task tables will be created automatically by JPA/Hibernate
-- when the application starts, but here's the structure for reference:

/*
CREATE TABLE tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD') NOT NULL DEFAULT 'TODO',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    due_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_from_email BOOLEAN DEFAULT FALSE,
    email_source_id VARCHAR(255) NULL,
    owner_id BIGINT NOT NULL,
    parent_task_id BIGINT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_owner_id (owner_id),
    INDEX idx_parent_task_id (parent_task_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    INDEX idx_created_from_email (created_from_email)
);

CREATE TABLE task_dependencies (
    task_id BIGINT NOT NULL,
    depends_on_task_id BIGINT NOT NULL,
    PRIMARY KEY (task_id, depends_on_task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_depends_on_task_id (depends_on_task_id)
);
*/
