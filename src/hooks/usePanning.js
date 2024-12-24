import { useState, useCallback, useEffect } from 'react';

export function usePanning({ currentX, currentY, updatePosition, scale = 1 }) {
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [startClient, setStartClient] = useState({ x: 0, y: 0 });

  // Calculate boundaries based on grid size and viewport
  const getBoundaries = useCallback(() => {
    const gridSize = 2000; // Match the grid component's max size
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate actual boundaries considering scale
    const scaledGridSize = gridSize * scale;
    
    return {
      minX: -scaledGridSize + viewportWidth * 0.1, // Leave 10% viewport buffer
      maxX: viewportWidth * 0.9,
      minY: -scaledGridSize + viewportHeight * 0.1,
      maxY: viewportHeight * 0.9
    };
  }, [scale]);

  // Clamp position within boundaries
  const clampPosition = useCallback((x, y) => {
    const bounds = getBoundaries();
    return {
      x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
      y: Math.min(bounds.maxY, Math.max(bounds.minY, y))
    };
  }, [getBoundaries]);

  // Start panning on right-click down
  const startPanning = useCallback((e) => {
    if (e.button !== 2) return;
    e.preventDefault();
    
    setIsPanning(true);
    setStartClient({ x: e.clientX, y: e.clientY });
    setPanStart({
      x: e.pageX - currentX,
      y: e.pageY - currentY
    });
    
    // Add grabbing cursor to body during pan
    document.body.style.cursor = 'grabbing';
  }, [currentX, currentY]);

  // Move the camera/tabletop on mousemove
  const handlePanning = useCallback((e) => {
    if (!isPanning) return;
    e.preventDefault();
    
    // Calculate new position
    const newX = e.pageX - panStart.x;
    const newY = e.pageY - panStart.y;
    
    // Apply position with boundary limits
    const clampedPos = clampPosition(newX, newY);
    updatePosition(clampedPos.x, clampedPos.y);
  }, [isPanning, panStart, updatePosition, clampPosition]);

  // Stop panning on mouseup
  const stopPanning = useCallback(() => {
    setIsPanning(false);
    // Reset cursor
    document.body.style.cursor = '';
  }, []);

  // Set up global event listeners for mouse move & up
  useEffect(() => {
    if (!isPanning) return;

    function onMouseMove(e) {
      handlePanning(e);
    }

    function onMouseUp() {
      stopPanning();
    }

    // Also handle ESC key to cancel panning
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        stopPanning();
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isPanning, handlePanning, stopPanning]);

  return {
    isPanning,
    startPanning
  };
}
