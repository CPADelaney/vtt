import React, { useState, useCallback, useEffect } from 'react';
import { useZoomToMouse } from '../hooks/useZoomToMouse';

export function ZoomableContainer({
  containerId = 'tabletop-container',
  onScaleChange,
  children,
  ...options
}) {
  const {
    position,
    setPosition,
    scale,
    setScale,
    handleWheel,
    handleZoomButtons,
  } = useZoomToMouse({ containerId, ...options });

    useEffect(() => {
    if (onScaleChange) {
      onScaleChange(scale);
    }
  }, [scale, onScaleChange]);

  // ---------- Right-click Panning State ----------
  const [isPanning, setIsPanning] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

  // Start panning on right-click
  const startPanning = useCallback((e) => {
    if (e.button !== 2) return; // Right-click
    e.preventDefault();         // Prevent browser context menu on mousedown
    setIsPanning(true);
    setLastPosition({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
  }, []);

  // Handle mouse moves while panning
  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    e.preventDefault();

    const deltaX = e.clientX - lastPosition.x;
    const deltaY = e.clientY - lastPosition.y;

    // Update the same position that the zoom logic uses
    setPosition((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastPosition({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPosition, setPosition]);

  // Stop panning on mouse up
  const stopPanning = useCallback(() => {
    setIsPanning(false);
    document.body.style.cursor = '';
  }, []);

  // Attach / remove listeners while panning
  useEffect(() => {
    if (!isPanning) return;

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
  }, [isPanning, handleMouseMove, stopPanning]);

  // ---------- Styles ----------
  const containerStyle = {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
  };

  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: '0 0',
    width: '100%',
    height: '100%',
  };

  return (
    <div
      id={containerId}
      style={containerStyle}
      onWheel={handleWheel}

      // Right-click => start panning
      onMouseDown={startPanning}
      // Prevent the default context menu from appearing on right-click
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={contentStyle}>
        {children}
      </div>

      {/* Example Zoom Buttons */}
      <button
        onClick={() => handleZoomButtons(1.1)}
        style={{ position: 'absolute', top: 10, left: 10 }}
      >
        Zoom In
      </button>
      <button
        onClick={() => handleZoomButtons(0.9)}
        style={{ position: 'absolute', top: 40, left: 10 }}
      >
        Zoom Out
      </button>
    </div>
  );
}
