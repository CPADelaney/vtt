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
  onContextMenu,
  onMouseDown, // Add this prop to handle delegated events
  children
}) {
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

  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [panStarted, setPanStarted] = useState(false);
  
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
  
  const handleContainerMouseDown = useCallback((e) => {
    console.log('[DEBUG-ZOOM] Container mousedown:', e.button);
    
    // For right clicks, handle panning
    if (e.button === 2) {
      const isToken = e.target.closest('.token');
      if (isToken) {
        setPanStarted(false);
        return;
      }
      
      e.preventDefault();
      setPanStarted(true);
      
      setTimeout(() => {
        if (panStarted && e.movementX === 0 && e.movementY === 0) {
          setPanStarted(false);
        } else if (panStarted) {
          setIsPanning(true);
          setLastPos({ x: e.clientX, y: e.clientY });
          document.body.style.cursor = 'grabbing';
        }
      }, 150);
    } else {
      // For left clicks, delegate to parent handler
      onMouseDown?.(e);
    }
  }, [panStarted, onMouseDown]);

  const handleMouseMove = useCallback((e) => {
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
  
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    
    if (isPanning) {
      setPanStarted(false);
      return;
    }
    
    onContextMenu?.(e);
  }, [isPanning, onContextMenu]);

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
      onMouseDown={handleContainerMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
