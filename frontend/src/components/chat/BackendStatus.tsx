import React, { useState, useEffect, useCallback } from 'react';
import './BackendStatus.css';

interface BackendStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

const BackendStatus: React.FC<BackendStatusProps> = ({ onStatusChange }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkBackendStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8080/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      
      const connected = response.ok;
      setIsConnected(connected);
      onStatusChange?.(connected);
    } catch (error) {
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
