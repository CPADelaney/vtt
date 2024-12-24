import { useState, useCallback, useEffect } from 'react';

export function usePanning({ currentX, currentY, updatePosition, scale = 1 }) {
  const [isPanning, setIsPanning] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  
  // Start panning
  const startPanning = useCallback((e) => {
    if (e.button !== 2) return;
    e.preventDefault();
    
    setIsPanning(true);
    setLastPosition({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
  }, []);

  // Handle panning
  const handlePanning = useCallback((e) => {
    if (!isPanning) return;
    
    const deltaX = e.clientX - lastPosition.x;
    const deltaY = e.clientY - lastPosition.y;
    
    updatePosition(
      currentX + deltaX,
      currentY + deltaY
    );
    
    setLastPosition({ x: e.clientX, y: e.clientY });
  }, [isPanning, currentX, currentY, lastPosition, updatePosition]);

  // Stop panning
  const stopPanning = useCallback(() => {
    setIsPanning(false);
    document.body.style.cursor = '';
  }, []);

  // Event listeners
  useEffect(() => {
    if (!isPanning) return;

    const onMouseMove = (e) => handlePanning(e);
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
  }, [isPanning, handlePanning, stopPanning]);

  return {
    isPanning,
    startPanning
  };
}
