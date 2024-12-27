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
  
  const isToken = e.target.closest('.token');
  if (isToken) {
    console.log('[DEBUG] Click on token, letting context menu handle it');
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  setPanStarted(true);
  didPanRef.current = false;
  setLastPos({ x: e.clientX, y: e.clientY });
}, []);
  
const handleMouseMove = useCallback((e) => {
  if (!panStarted) return;

  const dx = e.clientX - lastPos.x;
  const dy = e.clientY - lastPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // If we've moved more than a few pixels, start panning
  if (!isPanning && distance > 3) {
    setIsPanning(true);
    document.body.style.cursor = 'grabbing';
    didPanRef.current = true;
  }

  if (isPanning) {
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
  if (panStarted || isPanning) {
    e.preventDefault();
    e.stopPropagation();
    if (isPanning) {
      // If we were actually panning, ensure we block the upcoming context menu
      didPanRef.current = true;
    }
  }
  setPanStarted(false);
  setIsPanning(false);
  document.body.style.cursor = '';
}, [panStarted, isPanning]);


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

  // If we did any panning during this right-click sequence, don't show menu
  if (didPanRef.current || isPanning) {
    console.log('[DEBUG] Suppressing context menu after pan');
    setTimeout(() => {
      didPanRef.current = false;  // Reset after the context menu event has passed
    }, 0);
    return;
  }

  // No panning occurred, show the menu
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
