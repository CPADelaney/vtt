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
  gridWidth,
  gridHeight,
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

  // Right-click panning state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [panStarted, setPanStarted] = useState(false);
  const rightClickTimerRef = useRef(null);
  const hasMovedRef = useRef(false);
  
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
  
  const handleMouseDown = useCallback((e) => {
    // Only handle right-click
    if (e.button !== 2) return;
    
    const isToken = e.target.closest('.token');
    if (isToken) {
      console.log('[DEBUG] Click on token, letting context menu handle it');
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    // Reset movement tracking
    hasMovedRef.current = false;
    
    // Start a short timer
    if (rightClickTimerRef.current) {
      clearTimeout(rightClickTimerRef.current);
    }
    rightClickTimerRef.current = setTimeout(() => {
      // If we haven't moved by now, it's a context menu attempt
      if (!hasMovedRef.current) {
        setPanStarted(false);
        setIsPanning(false);
      }
    }, 200);

    setPanStarted(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!panStarted) return;

    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If we've moved more than a few pixels
    if (distance > 3) {
      hasMovedRef.current = true;
      if (!isPanning) {
        setIsPanning(true);
        document.body.style.cursor = 'grabbing';
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      setPosition({
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy
      });

      setLastPos({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPos, panStarted, setPosition]);

  const handleMouseUp = useCallback((e) => {
    // Clear the timer
    if (rightClickTimerRef.current) {
      clearTimeout(rightClickTimerRef.current);
      rightClickTimerRef.current = null;
    }

    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setPanStarted(false);
    setIsPanning(false);
    document.body.style.cursor = '';
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Only show menu if we haven't moved
    if (!hasMovedRef.current && onContextMenu) {
      onContextMenu(e);
    }

    // Reset for next interaction
    hasMovedRef.current = false;
  }, [onContextMenu]);

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
    width: gridWidth,
    height: gridHeight,
    transform: `translate(${position?.x}px, ${position?.y}px) scale(${scale})`,
    transformOrigin: '0 0',
    pointerEvents: isPanning ? 'none' : 'auto'
  };

  return (
    <div
      id={containerId}
      style={{
        ...containerStyle,
        pointerEvents: 'auto'
      }}
      onWheel={onWheel}
      onMouseDown={(e) => {
        console.log('[DEBUG-CONTAINER] Container mousedown:', {
          button: e.button,
          target: e.target.className,
          tagName: e.target.tagName,
          path: e.nativeEvent.composedPath().map(el => el.id || el.className || el.tagName).join(' -> ')
        });
        
        if (e.button === 2) {  // Only handle right clicks
          handleMouseDown(e);
        }
      }}
      onMouseMove={(e) => {
        if (e.button === 2 || panStarted) {
          handleMouseMove(e);
        }
      }}
      onMouseUp={(e) => {
        if (e.button === 2 || panStarted) {
          handleMouseUp(e);
        }
      }}
      onContextMenu={handleContextMenu}
    >
      <div 
        style={contentStyle}
        onMouseDown={(e) => {
          console.log('[DEBUG-CONTENT] Content div mousedown:', {
            button: e.button,
            target: e.target.className,
            tagName: e.target.tagName,
            path: e.nativeEvent.composedPath().map(el => el.id || el.className || el.tagName).join(' -> ')
          });
        }}
      >
        {children}
      </div>
    </div>
  );
}
