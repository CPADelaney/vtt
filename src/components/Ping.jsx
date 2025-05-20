import React, { useEffect, useState } from 'react';
import '../css/styles.css'; // Corrected import path to resolve build error

export const Ping = ({ x, y, color = '#ff4444', onComplete }) => {
  const [opacity, setOpacity] = useState(1); // Not strictly needed with CSS animation, but kept for potential JS animation variations

  // Trigger onComplete after animation duration
  useEffect(() => {
    // Assuming the CSS animation duration is 2s
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="ping-container" // Use CSS class
      style={{
        // Position the container at the target coordinates
        left: x,
        top: y,
        // Center the container itself on the coordinates
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Outer ring - CSS handles animation and opacity */}
      <div
        className="ping-outer"
        style={{
          borderColor: color, // Apply color
          // opacity: opacity * 0.5, // CSS animation handles this
          // transform: `scale(${2 - opacity})`, // CSS animation handles this
          // transition: 'transform 0.1s linear' // CSS animation handles this
        }}
      />
      {/* Inner dot - CSS handles animation and centering */}
      <div
        className="ping-inner"
        style={{
          backgroundColor: color, // Apply color
          // opacity: opacity // CSS animation handles this
           // Centering done via CSS
        }}
      />
    </div>
  );
};