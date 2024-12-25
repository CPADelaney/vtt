import React, { useState, useCallback, useEffect, useMemo } from 'react';
import _ from 'lodash';
import { useZoomToMouse } from '../hooks/useZoomToMouse';

export function ZoomableContainer({
  containerId = 'tabletop-container',
  onScaleChange,
  onPositionChange,
  onZoomEnd,
  onPanEnd,
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
  } = useZoomToMouse({
    containerId,
    initialPosition,
    ...options
  });

  // For detecting "wheel end"
  const handleWheelEnd = useMemo(() => {
    return _.debounce(() => {
      console.log('[DEBUG] wheel ended => onZoomEnd');
      onZoomEnd?.();
    }, 300);
  }, [onZoomEnd]);

  // Wrap handleWheel so we can detect end
  const onWheel = useCallback((e) => {
    handleWheel(e);
    handleWheelEnd(); // schedule a call to onZoomEnd 300ms after the last wheel event
  }, [handleWheel, handleWheelEnd]);

  // Report scale changes
  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  // Report position changes
  useEffect(() => {
    onPositionChange?.(position);
  }, [position, onPositionChange]);

  // Right-click panning
  const [isPanning, setIsPanning] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  const startPanning = useCallback((e) => {
    // Right-click only. If you want left-click pan, remove the check below:
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
    setPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
    setLastPosition({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPosition, setPosition]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    document.body.style.cursor = '';
    console.log('[DEBUG] stopPanning => calling onPanEnd');
    onPanEnd?.();
  }, [onPanEnd]);

  useEffect(() => {
    if (!isPanning) return;

    const onMouseMoveHandler = (e) => handleMouseMove(e);
    const onMouseUpHandler = () => stopPanning();
    const onKeyDownHandler = (e) => {
      if (e.key === 'Escape') stopPanning();
    };

    window.addEventListener('mousemove', onMouseMoveHandler);
    window.addEventListener('mouseup', onMouseUpHandler);
    window.addEventListener('keydown', onKeyDownHandler);

    return () => {
      window.removeEventListener('mousemove', onMouseMoveHandler);
      window.removeEventListener('mouseup', onMouseUpHandler);
      window.removeEventListener('keydown', onKeyDownHandler);
    };
  }, [isPanning, stopPanning, handleMouseMove]);

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
      onWheel={onWheel}
      onMouseDown={startPanning}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
