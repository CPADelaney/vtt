import React from 'react';
import { useZoomToMouse } from '../hooks/useZoomToMouse';

export function ZoomableContainer({
  containerId = 'tabletop-container',
  children,
  ...options
}) {
  // Pull out scale, position, and the wheel handler
  const {
    position,
    scale,
    handleWheel,
    handleZoomButtons,
  } = useZoomToMouse({ containerId, ...options });

  // The parent container styles
  const containerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  // The inner content styles (where scale & translate happen)
  const contentStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: '0 0', // Ensure top-left origin
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  };

  return (
    <div
      id={containerId}
      style={containerStyle}
      onWheel={handleWheel}
    >
      <div style={contentStyle}>
        {children}
      </div>

      {/* Example: Add some zoom buttons */}
      <button
        onClick={() => handleZoomButtons(1.1)}
        style={{ position: 'absolute', top: 10, left: 10 }}
      >
        Zoom In
      </button>
      <button
        onClick={() => handleZoomButtons(0.9)}
        style={{ position: 'absolute', top: 40, left: 10 }}
      >
        Zoom Out
      </button>
    </div>
  );
}
