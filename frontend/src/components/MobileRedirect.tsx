import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isMobileDevice, shouldUseMobileChat } from '../utils/mobileDetection';

interface MobileRedirectProps {
  children: React.ReactNode;
  mobilePath: string;
  desktopPath?: string;
  allowOverride?: boolean;
}

const MobileRedirect: React.FC<MobileRedirectProps> = ({
  children,
  mobilePath,
  desktopPath,
  allowOverride = true
}) => {
  const [shouldRedirect, setShouldRedirect] = useState<boolean | null>(null);
  const [userPreference, setUserPreference] = useState<string | null>(null);

  useEffect(() => {
    // Check for user preference first
    const savedPreference = localStorage.getItem('chat-view-preference');
    setUserPreference(savedPreference);

    if (savedPreference) {
      // User has explicitly chosen a preference
      setShouldRedirect(savedPreference === 'mobile');
    } else {
      // Auto-detect based on device
      const isMobile = shouldUseMobileChat();
      setShouldRedirect(isMobile);
    }
  }, []);

  const handlePreferenceChange = (preference: 'mobile' | 'desktop') => {
    localStorage.setItem('chat-view-preference', preference);
    setUserPreference(preference);
    setShouldRedirect(preference === 'mobile');
  };

  // Show loading while detecting
  if (shouldRedirect === null) {
    return (
      <div className="mobile-redirect-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Detecting device...</p>
      </div>
    );
  }

  // Redirect to mobile view if needed
  if (shouldRedirect) {
    return <Navigate to={mobilePath} replace />;
  }

  // Show desktop view with optional mobile toggle
  return (
    <div className="desktop-chat-container">
      {allowOverride && (
        <div className="view-toggle">
          <button
            className={`toggle-btn ${userPreference === 'mobile' ? 'active' : ''}`}
            onClick={() => handlePreferenceChange('mobile')}
            title="Switch to mobile view"
          >
            📱 Mobile View
          </button>
        </div>
      )}
      {children}
    </div>
  );
};

export default MobileRedirect;
