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
  // Only handle right-click
  if (e.button !== 2) return;
  
  // If clicking on a token, let context menu handle it
  const isToken = e.target.closest('.token');
  if (isToken) {
    setPanStarted(false);
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  
  setPanStarted(true);
  didPanRef.current = false;

  // Set a flag to start panning if mouse moves within timeout
  const panTimeout = setTimeout(() => {
    if (panStarted && !didPanRef.current) {
      setPanStarted(false);
    }
  }, 150);

  // Clean up timeout if component unmounts
  return () => clearTimeout(panTimeout);
}, [panStarted]);
const handleMouseMove = useCallback((e) => {
  if (!panStarted) return;

  if (!isPanning) {
    setIsPanning(true);
    setLastPos({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
  }

  if (isPanning) {
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
  }
}, [isPanning, lastPos, panStarted, setPosition]);

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
  e.stopPropagation();

  // Don't show context menu if we panned
  if (didPanRef.current || isPanning) {
    console.log('[DEBUG] Suppressing context menu after pan');
    didPanRef.current = false;
    return;
  }

  // If no panning occurred, show the context menu
  const isToken = e.target.closest('.token');
  if (onContextMenu) {
    onContextMenu(e);
  }
}, [isPanning, onContextMenu]);

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

    // Use the REAL grid dimensions:
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
