import React, { useState, useEffect, useCallback } from 'react';
import './BackendStatus.css';

interface BackendStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

const BackendStatus: React.FC<BackendStatusProps> = ({ onStatusChange }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const getApiBaseUrl = () => {
    // Get the base URL from environment variable, same as ApiService
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    // Remove /api suffix if present since we're adding it in the endpoint
    return baseUrl.replace(/\/api$/, '');
  };

  const checkBackendStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      
      // Use the health endpoint which doesn't require authentication
      const response = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const connected = response.ok;
      setIsConnected(connected);
      onStatusChange?.(connected);
      
      if (!connected) {
        console.warn(`Backend health check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Backend connection check failed:', error);
      setIsConnected(false);
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    checkBackendStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);
    
    return () => clearInterval(interval);
  }, [checkBackendStatus]);

  if (isConnected === null && !isChecking) {
    return null;
  }

  return (
    <div className="backend-status">
      <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="status-dot"></div>
        <span className="status-text">
          {isChecking ? 'Checking...' : isConnected ? 'Backend Connected' : 'Backend Disconnected'}
        </span>
      </div>
      
      {!isConnected && !isChecking && (
        <button className="retry-button" onClick={checkBackendStatus}>
          Retry Connection
        </button>
      )}
    </div>
  );
};

export default BackendStatus;