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

  // Debug current state
  useEffect(() => {
    if (isPanning) {
      console.log('[DEBUG] Panning active, last position:', lastPos);
    }
  }, [isPanning, lastPos]);

  const startPanning = useCallback((e) => {
    if (e.button === 2) {  // right click
      e.preventDefault();
      console.log('[DEBUG] Starting pan at:', { x: e.clientX, y: e.clientY });
      setIsPanning(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      document.body.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;

    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    console.log('[DEBUG] Mouse move delta:', { dx, dy });
    console.log('[DEBUG] Current position:', position);

    setPosition(prev => {
      const newPos = {
        x: (prev?.x || 0) + dx,
        y: (prev?.y || 0) + dy
      };
      console.log('[DEBUG] New position:', newPos);
      return newPos;
    });

    setLastPos({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPos, setPosition, position]);

  const stopPanning = useCallback(() => {
    console.log('[DEBUG] Stopping pan');
    setIsPanning(false);
    document.body.style.cursor = '';
    onPanEnd?.();
  }, [onPanEnd]);

  // Set up event listeners when panning starts
  useEffect(() => {
    if (isPanning) {
      console.log('[DEBUG] Adding pan event listeners');
      
      const onMouseMove = (e) => {
        e.preventDefault();
        handleMouseMove(e);
      };

      const onMouseUp = () => {
        stopPanning();
      };

      // Add listeners to window to catch events outside container
      window.addEventListener('mousemove', onMouseMove, { capture: true });
      window.addEventListener('mouseup', onMouseUp, { capture: true });

      return () => {
        console.log('[DEBUG] Removing pan event listeners');
        window.removeEventListener('mousemove', onMouseMove, { capture: true });
        window.removeEventListener('mouseup', onMouseUp, { capture: true });
      };
    }
  }, [isPanning, handleMouseMove, stopPanning]);

  const containerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    touchAction: 'none' // Prevent touch events from scrolling
  };

  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${position?.x || 0}px, ${position?.y || 0}px) scale(${scale})`,
    transformOrigin: '0 0',
    pointerEvents: isPanning ? 'none' : 'auto' // Prevent interaction while panning
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
