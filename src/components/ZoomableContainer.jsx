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
  
  // Keep track of current position for panning
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

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
    if (e.button === 2) {  // right click
      e.preventDefault();
      e.stopPropagation();
      console.log('[DEBUG] Starting pan at:', { x: e.clientX, y: e.clientY });
      setIsPanning(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      document.body.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    const currentPosition = positionRef.current || { x: 0, y: 0 };
    
    console.log('[DEBUG] Pan update:', {
      delta: { dx, dy },
      from: currentPosition,
      to: {
        x: currentPosition.x + dx,
        y: currentPosition.y + dy
      }
    });

    setPosition({
      x: currentPosition.x + dx,
      y: currentPosition.y + dy
    });

    setLastPos({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPos, setPosition]);

  const stopPanning = useCallback(() => {
    if (!isPanning) return;
    
    console.log('[DEBUG] Stopping pan');
    setIsPanning(false);
    document.body.style.cursor = '';
    onPanEnd?.();
  }, [isPanning, onPanEnd]);

  useEffect(() => {
    if (isPanning) {
      console.log('[DEBUG] Adding pan event listeners');
      
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
    }
  }, [isPanning, handleMouseMove, stopPanning]);

  const containerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    touchAction: 'none'
  };

  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${position?.x || 0}px, ${position?.y || 0}px) scale(${scale})`,
    transformOrigin: '0 0',
    pointerEvents: isPanning ? 'none' : 'auto'
  };

  return (
    <div
      id={containerId}
      style={containerStyle}
      onWheel={onWheel}
      onMouseDown={startPanning}
      onContextMenu={e => e.preventDefault()}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
