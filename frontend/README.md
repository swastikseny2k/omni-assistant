# Omni Assistant Frontend

A modern React 18 frontend application with TypeScript for the Omni Assistant project.

## Features

- **Authentication System**
  - Username/Password login
  - User registration with validation
  - Forgot password functionality
  - Google OAuth integration
  - JWT token management

- **Modern UI/UX**
  - Responsive design
  - Beautiful gradient backgrounds
  - Smooth animations
  - Accessibility features
  - Loading states

- **State Management**
  - React Context API for authentication
  - Persistent user sessions
  - Error handling

## Technology Stack

- **React 18** with TypeScript
- **React Router DOM** for navigation
- **Axios** for API communication
- **CSS3** with modern styling
- **React Context API** for state management

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- Backend API running on http://localhost:8080

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment variables (optional):
   ```bash
   # Create .env file
   echo "REACT_APP_API_URL=http://localhost:8080/api" > .env
   ```

## Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

## Project Structure

```
src/
├── components/          # React components
│   ├── AuthContainer.tsx    # Main auth wrapper
│   ├── LoginScreen.tsx      # Login form
│   ├── RegisterScreen.tsx   # Registration form
│   ├── ForgotPasswordScreen.tsx # Password reset
│   ├── Dashboard.tsx        # Main dashboard
│   ├── AuthStyles.css       # Authentication styles
│   └── Dashboard.css        # Dashboard styles
├── contexts/            # React contexts
│   └── AuthContext.tsx      # Authentication context
├── services/            # API services
│   └── api.ts              # Axios API client
├── types/               # TypeScript types
│   ├── auth.ts            # Authentication types
│   └── api.ts             # API response types
├── App.tsx              # Main app component
├── App.css              # Global styles
└── index.tsx            # App entry point
```

## Authentication Flow

1. **Login**: Users can sign in with email/password or Google OAuth
2. **Registration**: New users can create accounts with validation
3. **Password Reset**: Users can reset forgotten passwords via email
4. **Session Management**: JWT tokens are stored and validated automatically

## API Integration

The frontend communicates with the Spring Boot backend through:
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/forgot-password` - Password reset request
- `/api/auth/reset-password` - Password reset confirmation
- `/api/auth/validate` - Token validation
- `/api/auth/logout` - User logout
- `/api/oauth2/authorization/google` - Google OAuth

## Styling

- Modern CSS with gradients and animations
- Responsive design for mobile and desktop
- Accessibility features (focus states, ARIA labels)
- Loading states and error handling
- Beautiful form validation

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Production Build

Build the application for production:
```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Contributing

1. Follow TypeScript best practices
2. Use meaningful component and variable names
3. Add proper error handling
4. Ensure responsive design
5. Test on multiple browsers
