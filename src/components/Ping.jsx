import React, { useEffect, useState } from 'react';

export const Ping = ({ x, y, color = '#ff4444', onComplete }) => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1000; // 1 second animation
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        setOpacity(1 - progress);
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    requestAnimationFrame(animate);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none'
      }}
    >
      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          width: '60px',
          height: '60px',
          border: `2px solid ${color}`,
          borderRadius: '50%',
          opacity: opacity * 0.5,
          transform: `scale(${2 - opacity})`,
          transition: 'transform 0.1s linear'
        }}
      />
      {/* Inner dot */}
      <div
        style={{
          position: 'absolute',
          width: '10px',
          height: '10px',
          left: '25px',
          top: '25px',
          backgroundColor: color,
          borderRadius: '50%',
          opacity: opacity
        }}
      />
    </div>
  );
};
