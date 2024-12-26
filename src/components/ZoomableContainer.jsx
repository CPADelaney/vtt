import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import _ from 'lodash';
import { useZoomToMouse } from '../hooks/useZoomToMouse';

export function ZoomableContainer({
  containerId = 'tabletop-container',
  scale,
  position,
  setScale,
  setPosition,
  minScale = 0.5,
  maxScale = 4,
  zoomFactor = 0.1,
  onZoomEnd,
  onPanEnd,
  children
}) {
  // Mouse wheel zooming
  const { handleWheel } = useZoomToMouse({
    containerId,
    scale,
    position,
    setScale,
    setPosition,
    minScale,
    maxScale,
    zoomFactor
  });

  // Right-click panning state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  
  // Track if we're handling a pan to prevent context menu
  const isPanningRef = useRef(false);

  // Debounced wheel end detection
  const handleWheelEnd = useMemo(() => {
    return _.debounce(() => {
      console.log('[DEBUG] wheel ended');
      onZoomEnd?.();
    }, 300);
  }, [onZoomEnd]);

  const onWheel = useCallback((e) => {
    handleWheel(e);
    handleWheelEnd();
  }, [handleWheel, handleWheelEnd]);

  const startPanning = useCallback((e) => {
    // Only handle right click
    if (e.button !== 2) return;
    
    // Important: Stop event propagation
    e.stopPropagation();
    e.preventDefault();
    
    isPanningRef.current = true;
    setIsPanning(true);
    setLastPos({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    
    setPosition(prev => ({
      x: (prev?.x || 0) + dx,
      y: (prev?.y || 0) + dy
    }));
    
    setLastPos({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPos, setPosition]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    isPanningRef.current = false;
    document.body.style.cursor = '';
    onPanEnd?.();
  }, [onPanEnd]);

  // Handle context menu behavior
  const handleContextMenu = useCallback((e) => {
    // If we're panning or just finished panning, prevent context menu
    if (isPanningRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isPanningRef.current = false;
      return;
    }
  }, []);

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
  }, [isPanning, handleMouseMove, stopPanning]);

  // Debug logging
  useEffect(() => {
    console.log('[DEBUG] ZoomableContainer => scale:', scale, 'pos:', position);
  }, [scale, position]);

  const containerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative'
  };

  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${position?.x || 0}px, ${position?.y || 0}px) scale(${scale})`,
    transformOrigin: '0 0'
  };

  return (
    <div
      id={containerId}
      style={containerStyle}
      onWheel={onWheel}
      onMouseDown={startPanning}
      onContextMenu={handleContextMenu}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
