import { useState, useCallback, useEffect } from 'react';

export function usePanning({ currentX, currentY, updatePosition }) {
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [startClient, setStartClient] = useState({ x: 0, y: 0 });

  // Start panning on right-click down
  const startPanning = useCallback((e) => {
    if (e.button !== 2) return;

    setIsPanning(true);
    setStartClient({ x: e.clientX, y: e.clientY });
    setPanStart({
      x: e.pageX - currentX,
      y: e.pageY - currentY
    });
  }, [currentX, currentY]);

  // Move the camera/tabletop on mousemove
  const handlePanning = useCallback((e) => {
    if (!isPanning) return;
    e.preventDefault();

    updatePosition(
      e.pageX - panStart.x,
      e.pageY - panStart.y
    );
  }, [isPanning, panStart, updatePosition]);

  // Stop panning on mouseup
  const stopPanning = useCallback(() => {
    setIsPanning(false);
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

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning, handlePanning, stopPanning]);

  return {
    isPanning,
    startPanning
  };
}
