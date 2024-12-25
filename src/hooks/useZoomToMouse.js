// useZoomToMouse.js
import { useCallback } from 'react';

/**
 * Hook to compute "zoom to mouse" logic, 
 * but does NOT store its own scale/position. 
 * Instead, it uses the parent's scale, position, setScale, setPosition.
 */
export function useZoomToMouse({
  containerId = 'tabletop-container',
  scale,
  position,
  setScale,
  setPosition,
  minScale = 0.5,
  maxScale = 4,
  zoomFactor = 0.1
}) {
  /**
   * handleWheel: Zoom in/out around the mouse pointer
   */
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      
      const container = document.getElementById(containerId);
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Convert mouse position to container coordinates
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;

      console.log('=== ZOOM EVENT ===');
      console.log('Container rect:', rect);
      console.log('Mouse position:', { 
        client: { x: e.clientX, y: e.clientY },
        container: { x: containerX, y: containerY }
      });
      console.log('Current state:', { position, scale });

      // Calculate the scale change
      const delta = -Math.sign(e.deltaY);
      const factor = 1 + delta * zoomFactor;
      const newScale = Math.min(Math.max(scale * factor, minScale), maxScale);

      // Convert current mouse point to world coordinates
      const worldX = (containerX - position.x) / scale;
      const worldY = (containerY - position.y) / scale;

      console.log('Calculations:', {
        worldPoint: { x: worldX, y: worldY },
        scaleFactor: factor,
        newScale
      });

      // Calculate where this world point would end up after scaling
      const scaledX = worldX * newScale;
      const scaledY = worldY * newScale;

      // Offset needed so the mouse stays at the same world point
      const newPosition = {
        x: containerX - scaledX,
        y: containerY - scaledY
      };

      console.log('Results:', {
        scaledPoint: { x: scaledX, y: scaledY },
        newPosition,
        resultingWorldPoint: {
          x: (containerX - newPosition.x) / newScale,
          y: (containerY - newPosition.y) / newScale
        }
      });
      console.log('========================');

      // Update parent's states
      setScale(newScale);
      setPosition(newPosition);
    },
    [containerId, scale, position, setScale, setPosition, zoomFactor, minScale, maxScale]
  );

  /**
   * handleZoomButtons: e.g. if you have +/- buttons 
   * to zoom in around the container center
   */
  const handleZoomButtons = useCallback(
    (factor) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const rect = container.getBoundingClientRect();
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const worldX = (centerX - position.x) / scale;
      const worldY = (centerY - position.y) / scale;
      
      const newScale = Math.min(Math.max(scale * factor, minScale), maxScale);
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

  // Return just the handlers, no internal states
  return {
    handleWheel,
    handleZoomButtons
  };
}
