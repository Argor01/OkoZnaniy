
import { useState, useEffect } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: window.innerWidth <= 840,
    isTablet: window.innerWidth > 840 && window.innerWidth <= 1024,
    isDesktop: window.innerWidth > 1024,
    width: window.innerWidth,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width <= 840,
        isTablet: width > 840 && width <= 1024,
        isDesktop: width > 1024,
        width,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
};
