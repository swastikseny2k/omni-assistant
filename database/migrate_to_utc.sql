-- Migration script to ensure UTC timezone handling
-- This script configures MySQL to properly handle UTC timestamps

-- Set the timezone for the session to UTC
SET time_zone = '+00:00';

-- Update existing TIMESTAMP columns to use UTC
-- Note: MySQL TIMESTAMP columns are always stored in UTC internally
-- This is just to ensure proper timezone handling in queries

-- Verify timezone settings
SELECT @@global.time_zone, @@session.time_zone;

-- Update any existing data if needed (this is optional and depends on your data)
-- The following queries show how to handle existing data if it was stored incorrectly

-- Example: If you had local time stored as if it was UTC, you could convert it
-- UPDATE tasks SET due_date = CONVERT_TZ(due_date, 'America/New_York', 'UTC') WHERE due_date IS NOT NULL;
-- UPDATE tasks SET created_at = CONVERT_TZ(created_at, 'America/New_York', 'UTC') WHERE created_at IS NOT NULL;
-- UPDATE tasks SET updated_at = CONVERT_TZ(updated_at, 'America/New_York', 'UTC') WHERE updated_at IS NOT NULL;
-- UPDATE tasks SET completed_at = CONVERT_TZ(completed_at, 'America/New_York', 'UTC') WHERE completed_at IS NOT NULL;

-- For new installations, the following ensures proper UTC handling:
-- All TIMESTAMP columns are automatically stored in UTC by MySQL
-- The application should send UTC timestamps to the database
-- The application should convert UTC timestamps to local time for display

-- Verify table structures have TIMESTAMP columns
DESCRIBE tasks;
DESCRIBE chats;
DESCRIBE chat_messages;
DESCRIBE users;

-- Note: 
-- 1. MySQL TIMESTAMP columns are always stored in UTC internally
-- 2. The server timezone setting affects how TIMESTAMP values are interpreted when inserted/selected
-- 3. For consistent behavior, always use UTC in application code
-- 4. Convert to local timezone only for display purposes in the frontend
