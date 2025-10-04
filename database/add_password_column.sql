-- Add password column to users table for email/password authentication
-- This migration adds support for both Google OAuth and email/password authentication

USE omni_assistant;

-- Add password column (nullable for existing Google OAuth users)
ALTER TABLE users 
ADD COLUMN password VARCHAR(255) NULL AFTER name;

-- Make google_id nullable (users can now register without Google)
ALTER TABLE users 
MODIFY COLUMN google_id VARCHAR(255) NULL;

-- Add unique constraint on email (already exists but ensuring it)
ALTER TABLE users 
ADD CONSTRAINT uk_users_email UNIQUE (email);

-- Update existing users to have unique google_id if null
-- This is a safety measure for existing data
UPDATE users 
SET google_id = CONCAT('temp_', id) 
WHERE google_id IS NULL;

-- Add index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Add index on google_id for faster lookups
CREATE INDEX idx_users_google_id ON users(google_id);
