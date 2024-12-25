import { useState, useCallback } from 'react';

export function useZoomToMouse({
  containerId = 'tabletop-container', // the DOM ID for the parent container
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

      // Grab container + bounding rect so we can do container-relative coords
      const container = document.getElementById(containerId);
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      // Decide how much to zoom (in or out)
      const delta = -Math.sign(e.deltaY);
      const factor = 1 + delta * zoomFactor;
      const newScale = Math.min(Math.max(scale * factor, minScale), maxScale);

      // Convert the current mouse position to "world" coords
      const worldX = (localX - position.x) / scale;
      const worldY = (localY - position.y) / scale;

      // Update scale
      setScale(newScale);

      // Where does that same world point land on-screen after we scale?
      const newScreenX = worldX * newScale + position.x;
      const newScreenY = worldY * newScale + position.y;

      // Shift so that point stays under the mouse
      setPosition({
        x: position.x + (localX - newScreenX),
        y: position.y + (localY - newScreenY),
      });
    },
    [containerId, position, scale, zoomFactor, minScale, maxScale]
  );

  // Optional: If you have button-based zoom, you can add them here, too.
  const handleZoomButtons = useCallback(
    (factor) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Zoom relative to the center of the container, for example
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const worldX = (centerX - position.x) / scale;
      const worldY = (centerY - position.y) / scale;

      const newScale = Math.min(Math.max(scale * factor, minScale), maxScale);

      const newScreenX = worldX * newScale + position.x;
      const newScreenY = worldY * newScale + position.y;

      setScale(newScale);
      setPosition({
        x: position.x + (centerX - newScreenX),
        y: position.y + (centerY - newScreenY),
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
