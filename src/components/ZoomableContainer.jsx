// ZoomableContainer.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useZoomToMouse } from '../hooks/useZoomToMouse';

export function ZoomableContainer({
  containerId = 'tabletop-container',
  onScaleChange,
  onPositionChange,
  initialPosition = { x: 0, y: 0 },
  children,
  ...options
}) {
  const {
    position,
    setPosition,
    scale,
    setScale,
    handleWheel,
    handleZoomButtons,
  } = useZoomToMouse({ 
    containerId, 
    initialPosition,
    ...options 
  });

  // Report scale changes
  useEffect(() => {
    if (onScaleChange) {
      onScaleChange(scale);
    }
  }, [scale, onScaleChange]);

  // Report position changes
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(position);
    }
  }, [position, onPositionChange]);

  // Right-click panning state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  const startPanning = useCallback((e) => {
    if (e.button !== 2) return;
    e.preventDefault();
    setIsPanning(true);
    setLastPosition({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    e.preventDefault();
    const deltaX = e.clientX - lastPosition.x;
    const deltaY = e.clientY - lastPosition.y;
    setPosition((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    setLastPosition({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPosition, setPosition]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    if (!isPanning) return;
    
    const onMouseMove = (e) => handleMouseMove(e);
    const onMouseUp = () => stopPanning();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') stopPanning();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPanning, handleMouseMove, stopPanning]);

  const containerStyle = {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
  };

  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: '0 0',
    width: '100%',
    height: '100%',
  };

  return (
    <div
      id={containerId}
      style={containerStyle}
      onWheel={handleWheel}
      onMouseDown={startPanning}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
