import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  return (
    <div
      style={{
        animation: `${transitionStage} 0.3s ease-in-out`,
        opacity: transitionStage === 'fadeOut' ? 0 : 1,
        transform: transitionStage === 'fadeOut' ? 'translateY(20px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out'
      }}
      onAnimationEnd={() => {
        if (transitionStage === 'fadeOut') {
          setTransitionStage('fadeIn');
          setDisplayLocation(location);
        }
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
