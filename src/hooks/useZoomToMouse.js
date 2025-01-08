// useZoomToMouse.js
import { useCallback } from 'react';

export function useZoomToMouse({
  containerId = 'tabletop-container',
  scale = 1,
  position = { x: 0, y: 0 },
  setScale,
  setPosition,
  minScale = 0.5,
  maxScale = 4,
  zoomFactor = 0.1
}) {
  const handleWheel = useCallback(
    (e) => {
      // Only handle if it's within our container
      const container = document.getElementById(containerId);
      if (!container || !container.contains(e.target)) return;
      
      const rect = container.getBoundingClientRect();
      
      // Ensure we have valid position values
      const currentPosition = {
        x: position?.x || 0,
        y: position?.y || 0
      };

      // Convert mouse position to container coordinates
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;

      // Calculate the scale change
      const delta = -Math.sign(e.deltaY);
      const factor = 1 + delta * zoomFactor;
      const currentScale = scale || 1;
      const newScale = Math.min(Math.max(currentScale * factor, minScale), maxScale);

      // If scale isn't changing, don't update anything
      if (newScale === currentScale) return;

      // Convert current mouse point to world coordinates
      const worldX = (containerX - currentPosition.x) / currentScale;
      const worldY = (containerY - currentPosition.y) / currentScale;

      // Calculate where this world point would end up after scaling
      const scaledX = worldX * newScale;
      const scaledY = worldY * newScale;

      // Offset needed so the mouse stays at the same world point
      const newPosition = {
        x: containerX - scaledX,
        y: containerY - scaledY
      };

      // Debug logging
      console.log('[DEBUG] Zoom calculation:', {
        container: { width: rect.width, height: rect.height },
        mouse: { containerX, containerY },
        scale: { current: currentScale, new: newScale },
        position: { current: currentPosition, new: newPosition }
      });

      // Update parent's states
      setScale(newScale);
      setPosition(newPosition);
    },
    [containerId, scale, position, setScale, setPosition, zoomFactor, minScale, maxScale]
  );

  const handleZoomButtons = useCallback(
    (factor) => {
      const container = document.getElementById(containerId);
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentPosition = {
        x: position?.x || 0,
        y: position?.y || 0
      };
      const currentScale = scale || 1;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const worldX = (centerX - currentPosition.x) / currentScale;
      const worldY = (centerY - currentPosition.y) / currentScale;
      
      const newScale = Math.min(Math.max(currentScale * factor, minScale), maxScale);
      
      // If scale isn't changing, don't update anything
      if (newScale === currentScale) return;
      
      const scaledX = worldX * newScale;
      const scaledY = worldY * newScale;
      
      setScale(newScale);
      setPosition({
        x: centerX - scaledX,
        y: centerY - scaledY
      });
    },
    [containerId, position, scale, setScale, setPosition, minScale, maxScale]
  );

  return {
    handleWheel,
    handleZoomButtons
  };
}
