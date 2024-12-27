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

  // States
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const startPosRef = useRef(null);
  
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
    if (e.button !== 2) return;
    
    const isToken = e.target.closest('.token');
    if (isToken) return;
    
    e.preventDefault();
    e.stopPropagation();

    // Record the exact start position
    startPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
    setIsPanning(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;

    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
      hasMovedRef.current = true;
      document.body.style.cursor = 'grabbing';
      
      setPosition({
        x: positionRef.current.x + dx,
        y: positionRef.current.y + dy
      });

      setLastPos({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPos, setPosition]);

  const handleMouseUp = useCallback((e) => {
    setIsPanning(false);
    document.body.style.cursor = '';
    startPosRef.current = null;
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasMovedRef.current && onContextMenu) {
      onContextMenu(e);
    }
  }, [onContextMenu]);

  // Global event listeners for panning
  useEffect(() => {
    if (isPanning) {
      const onMouseMove = (e) => {
        e.preventDefault();
        handleMouseMove(e);
      };
      const onMouseUp = (e) => {
        e.preventDefault();
        handleMouseUp(e);
      };
      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          handleMouseUp(e);
        }
      };

      // Add document-level listeners
      document.addEventListener('mousemove', onMouseMove, { capture: true });
      document.addEventListener('mouseup', onMouseUp, { capture: true });
      document.addEventListener('keydown', onKeyDown, { capture: true });

      return () => {
        document.removeEventListener('mousemove', onMouseMove, { capture: true });
        document.removeEventListener('mouseup', onMouseUp, { capture: true });
        document.removeEventListener('keydown', onKeyDown, { capture: true });
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]);

  // Prevent default wheel scroll
  useEffect(() => {
    const preventDefault = e => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

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
        
        if (e.button === 2) {
          handleMouseDown(e);
        }
      }}
      onMouseMove={(e) => {
        if (isPanning) {
          e.preventDefault();
          e.stopPropagation();
          handleMouseMove(e);
        }
      }}
      onMouseUp={(e) => {
        if (isPanning) {
          e.preventDefault();
          e.stopPropagation();
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
