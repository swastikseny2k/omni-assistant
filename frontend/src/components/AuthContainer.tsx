import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

type AuthScreen = 'login' | 'register' | 'forgot-password';

const AuthContainer: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  const switchToLogin = () => setCurrentScreen('login');
  const switchToRegister = () => setCurrentScreen('register');
  const switchToForgotPassword = () => setCurrentScreen('forgot-password');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onSwitchToRegister={switchToRegister}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        );
      case 'register':
        return <RegisterScreen onSwitchToLogin={switchToLogin} />;
      case 'forgot-password':
        return <ForgotPasswordScreen onSwitchToLogin={switchToLogin} />;
      default:
        return (
          <LoginScreen
            onSwitchToRegister={switchToRegister}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        );
    }
  };

  return <>{renderScreen()}</>;
};

export default AuthContainer;
