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
  const [panStarted, setPanStarted] = useState(false);
  
  // Keep track of current position for panning
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

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
      // Check if click is on a token
      const isToken = e.target.closest('.token');
      if (isToken) {
        setPanStarted(false);
        return; // Let context menu handle tokens
      }
      
      setPanStarted(true);
      
      // Small timeout to determine if this is a pan or context menu
      setTimeout(() => {
        if (panStarted) {
          setIsPanning(true);
          setLastPos({ x: e.clientX, y: e.clientY });
          document.body.style.cursor = 'grabbing';
        }
      }, 150); // Adjust this delay if needed
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    // If mouse moves while pan started, it's definitely a pan
    if (panStarted && !isPanning) {
      setIsPanning(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      document.body.style.cursor = 'grabbing';
    }

    if (!isPanning) return;

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;

    const currentPosition = positionRef.current || { x: 0, y: 0 };
    
    setPosition({
      x: currentPosition.x + dx,
      y: currentPosition.y + dy
    });

    setLastPos({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPos, setPosition, panStarted]);

  const stopPanning = useCallback(() => {
    setPanStarted(false);
    if (isPanning) {
      setIsPanning(false);
      document.body.style.cursor = '';
      onPanEnd?.();
    }
  }, [isPanning, onPanEnd]);
  
const isToken = e.target.closest('.token');
  console.log('[DEBUG-CHAIN] 2. Is token?', isToken);
  console.log('[DEBUG-CHAIN] 3. Current state:', { isPanning, panStarted });
  
  // Let it bubble in these cases
  if ((!isPanning && isToken) || (!isPanning && !panStarted)) {
    console.log('[DEBUG-CHAIN] 4. Allowing event to bubble');
    return;
  }
  
  console.log('[DEBUG-CHAIN] 5. Stopping propagation - was panning');
  e.stopPropagation();
  setPanStarted(false);
}, [isPanning, panStarted]);

const handleContextMenu = useCallback((e) => {
  console.log('[DEBUG-CHAIN] 1. ZoomableContainer contextmenu received');
  // Always prevent browser's default context menu
  e.preventDefault();
  
  const isToken = e.target.closest('.token');
  console.log('[DEBUG-CHAIN] 2. Target info:', {
    isToken,
    isPanning,
    panStarted,
    element: e.target
  });
  
  // If we're not panning, allow event to bubble up
  if (!isPanning && !panStarted) {
    console.log('[DEBUG-CHAIN] 3. Allowing event to bubble');
    return;
  }
  
  console.log('[DEBUG-CHAIN] 4. Stopping event - was panning');
  e.stopPropagation();
  setPanStarted(false);
}, [isPanning, panStarted]);

  useEffect(() => {
    if (isPanning || panStarted) {
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
  }, [isPanning, panStarted, handleMouseMove, stopPanning]);

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
      onContextMenu={handleContextMenu}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
