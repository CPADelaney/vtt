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
  const didPanRef = useRef(false);
  
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
    // Only handle right-click, let left clicks pass through
    if (e.button !== 2) return;
    
    console.log('[DEBUG] Right-click detected in ZoomableContainer');
    
    const isToken = e.target.closest('.token');
    if (isToken) {
      console.log('[DEBUG] Click on token, letting context menu handle it');
      setPanStarted(false);
      return;
    }
    
    e.preventDefault();
    setPanStarted(true);
    didPanRef.current = false;
    
    setTimeout(() => {
      if (panStarted && e.movementX === 0 && e.movementY === 0) {
        console.log('[DEBUG] No movement detected, treating as context menu');
        setPanStarted(false);
      } else if (panStarted) {
        console.log('[DEBUG] Movement detected, starting pan');
        setIsPanning(true);
        setLastPos({ x: e.clientX, y: e.clientY });
        document.body.style.cursor = 'grabbing';
      }
    }, 150);
  }, [panStarted]);

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

    if (dx !== 0 || dy !== 0) {
      didPanRef.current = true;
    }
    
    setPosition({
      x: positionRef.current.x + dx,
      y: positionRef.current.y + dy
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
    // Always prevent browser default
    e.preventDefault();
    
    // If we actually panned, don't show context menu
    if (didPanRef.current) {
      console.log('[DEBUG] Suppressing context menu after pan');
      didPanRef.current = false;
      return;
    }
    
    const isToken = e.target.closest('.token');
    console.log('[DEBUG] Context menu check:', {
      isToken,
      wasPanning: isPanning,
      didPan: didPanRef.current
    });
    
    if (isPanning) {
      setPanStarted(false);
      return;
    }
    
    // Call the passed in handler
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
      pointerEvents: isPanning ? 'none' : 'auto',
      minWidth: '100%',    // Change from width to minWidth
      minHeight: '100%',   // Change from height to minHeight
      width: 'max-content',  // Add this
      height: 'max-content', // Add this
    };

  return (
    <div
      id={containerId}
      style={{
        ...containerStyle,
        pointerEvents: 'auto'  // Add this
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
