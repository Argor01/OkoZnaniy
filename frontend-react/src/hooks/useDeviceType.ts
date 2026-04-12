import { useState, useEffect } from 'react';

interface DeviceType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export const useDeviceType = (): DeviceType => {
  const [deviceType, setDeviceType] = useState<DeviceType>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      
      if (width <= 480) {
        setDeviceType({
          isMobile: true,
          isTablet: false,
          isDesktop: false,
        });
      } else if (width <= 768) {
        setDeviceType({
          isMobile: false,
          isTablet: true,
          isDesktop: false,
        });
      } else {
        setDeviceType({
          isMobile: false,
          isTablet: false,
          isDesktop: true,
        });
      }
    };

    // Check on mount
    checkDeviceType();

    // Add event listener for window resize
    window.addEventListener('resize', checkDeviceType);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkDeviceType);
    };
  }, []);

  return deviceType;
};