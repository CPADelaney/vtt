// ZoomableContainer.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  // Use the advanced "zoom to mouse" hook with parent's states
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

  // Right-click panning
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Debounce for "wheel end"
  const handleWheelEnd = useMemo(() => {
    return _.debounce(() => {
      console.log('[DEBUG] wheel ended => onZoomEnd');
      onZoomEnd?.();
    }, 300);
  }, [onZoomEnd]);

  // Wrap handleWheel to detect the end of scrolling
  const onWheel = useCallback((e) => {
    handleWheel(e);
    handleWheelEnd();
  }, [handleWheel, handleWheelEnd]);

  const startPanning = useCallback((e) => {
    // Right-click only
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
    setPosition((prev) => ({
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

  useEffect(() => {
    if (!isPanning) return;

    const onMouseMoveHandler = (e) => handleMouseMove(e);
    const onMouseUpHandler = () => stopPanning();
    const onKeyDownHandler = (e) => {
      if (e.key === 'Escape') stopPanning();
    };

    window.addEventListener('mousemove', onMouseMoveHandler);
    window.addEventListener('mouseup', onMouseUpHandler);
    window.addEventListener('keydown', onKeyDownHandler);

    return () => {
      window.removeEventListener('mousemove', onMouseMoveHandler);
      window.removeEventListener('mouseup', onMouseUpHandler);
      window.removeEventListener('keydown', onKeyDownHandler);
    };
  }, [isPanning, handleMouseMove, stopPanning]);

  // Debug
  console.log('[DEBUG] ZoomableContainer => scale:', scale, 'pos:', position);

  // Style
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
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  };

  return (
    <div
      id={containerId}
      style={containerStyle}
      onWheel={onWheel}
      onMouseDown={startPanning}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
