import React, { useCallback, useEffect, useMemo, useState } from 'react';
import _ from 'lodash';

/**
 * A "presentation + logic" component that:
 * 1) Receives `scale` and `position` from the parent.
 * 2) Calls `setScale(newVal)` and `setPosition(newVal)` whenever the user zooms or pans.
 * 3) Fires `onZoomEnd()` and `onPanEnd()` after the user stops interacting.
 */
export function ZoomableContainer({
  scale,
  position,
  setScale,
  setPosition,
  minScale = 0.3,
  maxScale = 3,
  zoomFactor = 0.1,
  onZoomEnd,
  onPanEnd,
  children,
}) {
  // Panning state
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Wheel: zoom in or out
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    // Basic approach: scale up/down by zoomFactor
    const delta = e.deltaY > 0 ? -1 : 1;
    const newScale = scale * (1 + delta * zoomFactor);
    const clamped = Math.min(Math.max(newScale, minScale), maxScale);
    setScale(clamped);

    // If you want "zoom to mouse" logic, you can do it here:
    // - Convert (e.clientX, e.clientY) to world coords
    // - Adjust `position` to keep that point under mouse
  }, [scale, zoomFactor, minScale, maxScale, setScale]);

  // Debounced detection of "wheel end"
  const handleWheelEnd = useMemo(() => {
    return _.debounce(() => {
      console.log('[DEBUG] wheel ended => onZoomEnd');
      onZoomEnd?.();
    }, 300);
  }, [onZoomEnd]);

  const onWheel = useCallback((e) => {
    handleWheel(e);
    handleWheelEnd(); // schedule the "zoom end" callback
  }, [handleWheel, handleWheelEnd]);

  // Right-click panning
  const startPanning = useCallback((e) => {
    // If you want to allow left-click pan, remove this check
    if (e.button !== 2) return;
    e.preventDefault();
    setIsPanning(true);
    setLastPos({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    e.preventDefault();

    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
    setLastPos({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPos, setPosition]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    document.body.style.cursor = '';
    console.log('[DEBUG] stopPanning => onPanEnd');
    onPanEnd?.();
  }, [onPanEnd]);

  // Attach listeners for panning
  useEffect(() => {
    if (!isPanning) return;
    const mouseMoveHandler = (e) => handleMouseMove(e);
    const mouseUpHandler = () => stopPanning();
    const keyDownHandler = (e) => {
      if (e.key === 'Escape') stopPanning();
    };
    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
    window.addEventListener('keydown', keyDownHandler);

    return () => {
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', mouseUpHandler);
      window.removeEventListener('keydown', keyDownHandler);
    };
  }, [isPanning, handleMouseMove, stopPanning]);

  // Debug
  console.log('[DEBUG] ZoomableContainer render => scale:', scale, 'pos:', position);

  // Styles
  const containerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    // Apply parent's scale + position
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  };

  return (
    <div
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
