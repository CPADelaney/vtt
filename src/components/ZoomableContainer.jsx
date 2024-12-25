import React, { useCallback, useMemo, useState, useEffect } from 'react';
import _ from 'lodash';

export function ZoomableContainer({
  scale,              // from parent
  position,           // from parent
  setScale,           // from parent
  setPosition,        // from parent
  minScale = 0.3,
  maxScale = 3,
  zoomFactor = 0.1,
  onZoomEnd,
  onPanEnd,
  children
}) {
  // Panning state (just track if user is panning)
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // WHEEL: We'll handle the wheel event to compute new scale
  const handleWheel = useCallback((e) => {
    e.preventDefault();

    // Example approach: zoom in/out by a factor
    const delta = e.deltaY > 0 ? -1 : 1;
    const newScale = scale * (1 + delta * zoomFactor);

    // clamp
    const clampedScale = Math.min(Math.max(newScale, minScale), maxScale);
    setScale(clampedScale);
    // You might want to calculate a "zoom to mouse" logic, etc.

  }, [scale, zoomFactor, minScale, maxScale, setScale]);

  // Debounce detecting "wheel end"
  const handleWheelEnd = useMemo(() => {
    return _.debounce(() => {
      console.log('[DEBUG] wheel ended => onZoomEnd');
      onZoomEnd?.();
    }, 300);
  }, [onZoomEnd]);

  // Combined wheel handler
  const onWheel = useCallback((e) => {
    handleWheel(e);
    handleWheelEnd(); // calls onZoomEnd after 300ms of no wheel
  }, [handleWheel, handleWheelEnd]);

  // PANNING: right-click to pan (example)
  const startPanning = useCallback((e) => {
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

    // Update parent's position
    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    setLastPos({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPos, setPosition]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    document.body.style.cursor = '';
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

  const containerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  // The key: we apply parent's `scale` and `position`
  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  };

  // Debug log
  console.log('[DEBUG] ZoomableContainer rendering => scale:', scale, 'pos:', position);

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
