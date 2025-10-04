# Omni Assistant

A full-stack application with Google OAuth authentication, built with Spring Boot backend and React frontend.

## Features

### Authentication & Security
- 🔐 Google OAuth2 authentication
- 🗄️ MySQL database for user storage
- 🔑 JWT token-based session management
- 💾 Persistent user sessions (no repeated logins)

### Frontend
- ⚛️ Modern React frontend with TypeScript
- 🎨 Beautiful, responsive UI with modern design
- 📱 Mobile-friendly interface
- 🔄 Real-time state management with React Context

### Backend
- 🚀 Spring Boot backend with Spring Security
- 🗃️ JPA/Hibernate for database operations
- 🔒 Secure API endpoints with authentication
- 📊 RESTful API design

### Task Management System
- 📋 **Task Creation**: Title, description, priority levels, due dates
- 🏗️ **Hierarchical Structure**: Parent-child task relationships with subtasks
- 🔗 **Task Dependencies**: Define task dependencies and blockers
- 📧 **Email Integration**: Convert emails to tasks automatically
- 🔍 **Advanced Search**: Search by title, description, status, priority
- 📊 **Smart Filtering**: Filter by status, priority, overdue, due soon
- 📈 **Statistics Dashboard**: Task completion rates, productivity metrics
- ⚠️ **Notifications**: Overdue and due-soon task alerts
- 🎯 **Bulk Operations**: Update multiple tasks at once
- 📄 **Pagination**: Efficient handling of large task lists
- 🎨 **Priority Colors**: Visual priority indicators
- 📅 **Due Date Management**: Track and manage deadlines

## Architecture

### Backend (Spring Boot)
- **Framework**: Spring Boot 3.2.0
- **Security**: Spring Security with OAuth2
- **Database**: MySQL with JPA/Hibernate
- **Authentication**: JWT tokens
- **Port**: 8080

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **Styling**: CSS3 with modern design
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Port**: 3000

## Prerequisites

- Java 17 or higher
- Node.js 16 or higher
- MySQL 8.0 or higher
- Maven or Gradle

## Quick Start

### 1. Database Setup

1. Start MySQL server
2. Run the database setup script:
   ```bash
   mysql -u root -p < database/setup.sql
   ```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:8080/api/login/oauth2/code/google`
6. Copy Client ID and Client Secret

### 3. Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DB_USERNAME=omni_user
DB_PASSWORD=omni_password

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT Configuration
JWT_SECRET=mySecretKey123456789012345678901234567890
```

### 4. Backend Setup

1. Navigate to the project root:
   ```bash
   cd /Users/swastiksen/workspace/omni-assistant/omni-assistant
   ```

2. Set environment variables:
   ```bash
   export DB_USERNAME=omni_user
   export DB_PASSWORD=omni_password
   export GOOGLE_CLIENT_ID=your-google-client-id
   export GOOGLE_CLIENT_SECRET=your-google-client-secret
   export JWT_SECRET=mySecretKey123456789012345678901234567890
   ```

3. Run the backend:
   ```bash
   ./gradlew bootRun
   ```

The backend will start on `http://localhost:8080`

### 5. Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend:
   ```bash
   npm start
   ```

The frontend will start on `http://localhost:3000`

## Usage

### Getting Started
1. Open `http://localhost:3000` in your browser
2. Click "Continue with Google" button
3. Complete Google OAuth flow
4. You'll be redirected to the dashboard
5. Your user information is stored in the database
6. Future visits will automatically authenticate you

### Task Management
1. Navigate to the Task Management section from the dashboard
2. Create your first task by clicking "New Task"
3. Set priority levels (Low, Medium, High, Urgent)
4. Add due dates to track deadlines
5. Create subtasks for complex projects
6. Set up task dependencies
7. Use filters and search to organize your tasks
8. Monitor your productivity with the statistics dashboard
9. Get notified about overdue and due-soon tasks

### Key Features
- **Hierarchical Organization**: Create parent tasks with multiple subtasks
- **Smart Filtering**: Filter by status, priority, due date, or search terms
- **Visual Indicators**: Color-coded priority levels and status badges
- **Bulk Operations**: Update multiple tasks at once
- **Statistics**: Track completion rates and productivity metrics
- **Notifications**: Stay on top of deadlines with smart alerts

## API Endpoints

### Authentication
- `GET /api/oauth2/authorization/google` - Initiate Google OAuth
- `GET /api/auth/login/success` - OAuth success callback
- `GET /api/auth/login/failure` - OAuth failure callback
- `GET /api/auth/user` - Get current user
- `GET /api/auth/validate` - Validate JWT token
- `POST /api/auth/logout` - Logout user

### Task Management
- `GET /api/tasks` - Get all tasks for current user
- `GET /api/tasks/top-level` - Get top-level tasks (no parent)
- `GET /api/tasks/{id}` - Get specific task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `GET /api/tasks/status/{status}` - Get tasks by status
- `GET /api/tasks/priority/{priority}` - Get tasks by priority
- `GET /api/tasks/overdue` - Get overdue tasks
- `GET /api/tasks/due-soon` - Get tasks due soon
- `GET /api/tasks/search` - Search tasks
- `GET /api/tasks/statistics` - Get task statistics
- `GET /api/tasks/filter` - Advanced filtering
- `GET /api/tasks/paginated` - Get tasks with pagination
- `POST /api/tasks/bulk/update-status` - Bulk update task status
- `POST /api/tasks/bulk/update-priority` - Bulk update task priority
- `DELETE /api/tasks/bulk/delete` - Bulk delete tasks
- `GET /api/tasks/{id}/subtasks` - Get subtasks
- `POST /api/tasks/{id}/subtasks` - Add subtask
- `POST /api/tasks/{id}/dependencies` - Add dependency
- `DELETE /api/tasks/{id}/dependencies/{depId}` - Remove dependency

## Database Schema

### Users Table
```sql
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
```

### Tasks Table
```sql
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
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);
```

### Task Dependencies Table
```sql
CREATE TABLE task_dependencies (
    task_id BIGINT NOT NULL,
    depends_on_task_id BIGINT NOT NULL,
    PRIMARY KEY (task_id, depends_on_task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

## Project Structure

```
omni-assistant/
├── src/main/java/org/assistant/
│   ├── config/          # Security and OAuth configuration
│   ├── controller/      # REST controllers
│   ├── entity/          # JPA entities
│   ├── repository/      # Data repositories
│   ├── service/         # Business logic services
│   └── OmniAssistantApplication.java
├── src/main/resources/
│   └── application.yml  # Application configuration
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── App.tsx
│   └── package.json
├── database/
│   └── setup.sql       # Database setup script
└── build.gradle.kts    # Gradle build configuration
```

## Security Features

- OAuth2 with Google for secure authentication
- JWT tokens for stateless session management
- CORS configuration for frontend-backend communication
- Password-less authentication (Google handles credentials)
- Automatic token validation and refresh

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure MySQL is running
   - Check database credentials in `.env`
   - Verify database exists: `omni_assistant`

2. **Google OAuth Failed**
   - Verify Google Client ID and Secret
   - Check redirect URI is correct
   - Ensure Google+ API is enabled

3. **CORS Errors**
   - Verify backend is running on port 8080
   - Check CORS configuration in SecurityConfig.java

4. **Token Validation Failed**
   - Check JWT_SECRET environment variable
   - Ensure token is not expired
   - Verify token format in Authorization header

## Development

### Backend Development
```bash
./gradlew bootRun
```

### Frontend Development
```bash
cd frontend
npm start
```

### Database Management
```bash
mysql -u omni_user -p omni_assistant
```

## License

This project is licensed under the MIT License.
