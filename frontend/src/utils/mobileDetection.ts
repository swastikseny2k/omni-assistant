// Mobile detection utility
export const isMobileDevice = (): boolean => {
  // Check for touch capability and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for mobile user agents
  const mobileUserAgents = [
    'android', 'iphone', 'ipad', 'ipod', 'blackberry', 
    'windows phone', 'opera mini', 'mobile'
  ];
  
  const isMobileUA = mobileUserAgents.some(agent => userAgent.includes(agent));
  
  return (hasTouch && isSmallScreen) || isMobileUA;
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (width <= 480) return 'mobile';
  if (width <= 768 || userAgent.includes('ipad') || userAgent.includes('tablet')) return 'tablet';
  return 'desktop';
};

export const shouldUseMobileChat = (): boolean => {
  const deviceType = getDeviceType();
  return deviceType === 'mobile' || (deviceType === 'tablet' && window.innerWidth <= 768);
};
