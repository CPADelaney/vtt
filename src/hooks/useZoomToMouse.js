import { useState, useCallback } from 'react';

export function useZoomToMouse({
  containerId = 'tabletop-container',
  initialPosition = { x: 0, y: 0 },
  initialScale = 1,
  minScale = 0.5,
  maxScale = 4,
  zoomFactor = 0.1,
} = {}) {
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      
      // Get container and its position
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
      console.log('Current state:', {
        position,
        scale
      });

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

      // Calculate the offset needed to keep this point under the mouse
      const newPosition = {
        x: containerX - scaledX,
        y: containerY - scaledY
      };

      console.log('Results:', {
        scaledPoint: { x: scaledX, y: scaledY },
        newPosition,
        // Verification: converting back to world coordinates
        resultingWorldPoint: {
          x: (containerX - newPosition.x) / newScale,
          y: (containerY - newPosition.y) / newScale
        }
      });
      console.log('========================');

      setScale(newScale);
      setPosition(newPosition);
    },
    [containerId, position, scale, zoomFactor, minScale, maxScale]
  );

  const handleZoomButtons = useCallback(
    (factor) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const rect = container.getBoundingClientRect();
      
      // Use center of container for button zooms
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
    [containerId, position, scale, minScale, maxScale]
  );

  return {
    position,
    scale,
    handleWheel,
    handleZoomButtons,
    setPosition,
    setScale,
  };
}
