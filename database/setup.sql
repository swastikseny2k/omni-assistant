-- MySQL database setup for Omni Assistant
-- Run this script as root to create the database and user

-- Create database
CREATE DATABASE IF NOT EXISTS omni_assistant;

-- Drop user if exists (to ensure clean setup)
DROP USER IF EXISTS 'omni_user'@'localhost';
DROP USER IF EXISTS 'omni_user'@'%';

-- Create user for localhost access
CREATE USER 'omni_user'@'0.0.0.0' IDENTIFIED BY 'omni_password';

-- Create user for any host access (useful for Docker/remote connections)
CREATE USER 'omni_user'@'%' IDENTIFIED BY 'omni_password';

-- Grant privileges for localhost
GRANT ALL PRIVILEGES ON omni_assistant.* TO 'omni_user'@'0.0.0.0';

-- Grant privileges for any host
GRANT ALL PRIVILEGES ON omni_assistant.* TO 'omni_user'@'%';

-- Grant global privileges (if needed)
GRANT CREATE, DROP, ALTER ON omni_assistant.* TO 'omni_user'@'0.0.0.0';
GRANT CREATE, DROP, ALTER ON omni_assistant.* TO 'omni_user'@'%';

-- Flush privileges to ensure changes take effect
FLUSH PRIVILEGES;

-- Use the database
USE omni_assistant;

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

-- Show created users
SELECT User, Host FROM mysql.user WHERE User = 'omni_user';
