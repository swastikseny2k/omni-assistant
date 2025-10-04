import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../types/api';
import './AuthStyles.css';

interface ForgotPasswordScreenProps {
  onSwitchToLogin: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onSwitchToLogin }) => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await forgotPassword({ email });
      setIsEmailSent(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
              </svg>
            </div>
            <h1 className="auth-title">Check Your Email</h1>
            <p className="auth-subtitle">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="auth-description">
              Please check your email and click the link to reset your password. 
              If you don't see the email, check your spam folder.
            </p>
          </div>

          <div className="auth-actions">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-button auth-button-primary"
            >
              Back to Sign In
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsEmailSent(false);
                setEmail('');
              }}
              className="auth-link"
            >
              Try a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleInputChange}
              className={`form-input ${validationError ? 'form-input-error' : ''}`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
            {validationError && (
              <span className="error-message">{validationError}</span>
            )}
          </div>

          {error && (
            <div className="auth-error">
              <span className="error-message">{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-button auth-button-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                Sending Reset Link...
              </div>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="auth-links">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-link"
            disabled={isLoading}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
