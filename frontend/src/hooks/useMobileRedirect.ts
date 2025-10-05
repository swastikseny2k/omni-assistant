import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isMobileDevice, shouldUseMobileChat, getDeviceType } from '../utils/mobileDetection';

interface MobileRedirectOptions {
  mobilePath: string;
  desktopPath?: string;
  enableAutoRedirect?: boolean;
  enableUserPreference?: boolean;
  preferenceKey?: string;
}

export const useMobileRedirect = (options: MobileRedirectOptions) => {
  const {
    mobilePath,
    desktopPath,
    enableAutoRedirect = true,
    enableUserPreference = true,
    preferenceKey = 'chat-view-preference'
  } = options;

  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [userPreference, setUserPreference] = useState<string | null>(null);

  useEffect(() => {
    const detectDevice = () => {
      const device = getDeviceType();
      setDeviceType(device);
      
      let savedPreference: string | null = null;
      if (enableUserPreference) {
        savedPreference = localStorage.getItem(preferenceKey);
        setUserPreference(savedPreference);
      }

      if (enableAutoRedirect) {
        handleRedirect(device, savedPreference);
      }
    };

    detectDevice();

    // Listen for resize events to update device detection
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [enableAutoRedirect, enableUserPreference, preferenceKey]);

  const handleRedirect = (device: 'mobile' | 'tablet' | 'desktop', savedPreference: string | null) => {
    if (savedPreference) {
      // User has explicit preference
      if (savedPreference === 'mobile' && window.location.pathname !== mobilePath) {
        setIsRedirecting(true);
        navigate(mobilePath, { replace: true });
      } else if (savedPreference === 'desktop' && window.location.pathname === mobilePath) {
        setIsRedirecting(true);
        navigate(desktopPath || '/chat', { replace: true });
      }
    } else {
      // Auto-detect based on device
      const shouldRedirectToMobile = shouldUseMobileChat();
      if (shouldRedirectToMobile && window.location.pathname !== mobilePath) {
        setIsRedirecting(true);
        navigate(mobilePath, { replace: true });
      } else if (!shouldRedirectToMobile && window.location.pathname === mobilePath) {
        setIsRedirecting(true);
        navigate(desktopPath || '/chat', { replace: true });
      }
    }
  };

  const setUserPreferenceValue = (preference: 'mobile' | 'desktop') => {
    if (enableUserPreference) {
      localStorage.setItem(preferenceKey, preference);
      setUserPreference(preference);
      handleRedirect(deviceType, preference);
    }
  };

  const clearUserPreference = () => {
    if (enableUserPreference) {
      localStorage.removeItem(preferenceKey);
      setUserPreference(null);
      handleRedirect(deviceType, null);
    }
  };

  return {
    deviceType,
    userPreference,
    isRedirecting,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    shouldUseMobile: shouldUseMobileChat(),
    setUserPreference: setUserPreferenceValue,
    clearUserPreference,
    redirectToMobile: () => navigate(mobilePath),
    redirectToDesktop: () => navigate(desktopPath || '/chat')
  };
};
