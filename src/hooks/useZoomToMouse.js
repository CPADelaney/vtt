// useZoomToMouse.js
import { useCallback, useEffect } from 'react';

/**
 * Hook to calculate new scale and position for zoom-to-mouse operations.
 * Provides a handler function for 'wheel' events.
 *
 * @param {object} options
 * @param {string} options.containerId - The ID of the HTML element acting as the zoom container.
 * @param {number} options.scale - The current scale value.
 * @param {object} options.position - The current pan position {x, y}.
 * @param {Function} options.setScale - State setter for scale.
 * @param {Function} options.setPosition - State setter for position.
 * @param {number} [options.minScale=0.5] - Minimum allowed scale.
 * @param {number} [options.maxScale=4] - Maximum allowed scale.
 * @param {number} [options.zoomFactor=0.1] - How much scale changes per wheel 'tick'.
 */
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
      // Ensure the event target is within our container
      const container = document.getElementById(containerId);
      // Check if container exists AND if the event originated within it
      if (!container || !container.contains(e.target)) return;

      // Prevent default browser zoom/scroll behavior
      e.preventDefault();
      e.stopPropagation(); // Stop propagation as well

      const rect = container.getBoundingClientRect();

      // Ensure we have valid position values
      const currentPosition = {
        x: position?.x || 0,
        y: position?.y || 0
      };

      // Convert mouse position to container coordinates (relative to container's top-left)
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;

      // Calculate the scale change based on wheel delta
      const delta = -Math.sign(e.deltaY); // +1 for zoom in, -1 for zoom out
      const factor = 1 + delta * zoomFactor;
      const currentScale = scale || 1; // Use current scale, default to 1

      // Calculate the new scale, clamping it within min/max bounds
      const newScale = Math.min(Math.max(currentScale * factor, minScale), maxScale);

      // If scale isn't actually changing (due to bounds), return early
      if (newScale === currentScale) return;

      // Convert current mouse point (in screen/container coords) to world coordinates (relative to the grid's top-left at scale 1)
      // worldX = (screenX - panX) / scale
      const worldX = (containerX - currentPosition.x) / currentScale;
      const worldY = (containerY - currentPosition.y) / currentScale;

      // Calculate where this *same* world point would be after scaling to the new scale
      // scaledScreenX = worldX * newScale
      const scaledX = worldX * newScale;
      const scaledY = worldY * newScale;

      // Calculate the new pan position needed to keep the world point under the mouse cursor
      // newPanX = screenX - scaledScreenX
      const newPosition = {
        x: containerX - scaledX,
        y: containerY - scaledY
      };

      // Debug logging (optional, remove for production)
      // console.log('[DEBUG] Zoom calculation:', {
      //   mouse: { containerX, containerY },
      //   scale: { current: currentScale, new: newScale },
      //   position: { current: currentPosition, new: newPosition }
      // });

      // Update parent's states with the new scale and position
      setScale(newScale);
      setPosition(newPosition);
    },
    // Dependencies: state values and setters from parent component, and constants
    [containerId, scale, position, setScale, setPosition, zoomFactor, minScale, maxScale]
  );


  // The handleZoomButtons function is not used by the ZoomableContainer component itself.
  // It is used by the Controls component (via VirtualTabletop).
  // It can remain here or be moved to VirtualTabletop/Controls if preferred.
  // It's fine to keep it here as it uses the same zoom logic.
  const handleZoomButtons = useCallback(
    (factor) => { // factor is > 1 for zoom in, < 1 for zoom out
      const container = document.getElementById(containerId);
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentPosition = {
        x: position?.x || 0,
        y: position?.y || 0
      };
      const currentScale = scale || 1;

      // For button zoom, zoom towards the center of the container
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate the new scale, clamping within bounds
      const newScale = Math.min(Math.max(currentScale * factor, minScale), maxScale);

      // If scale isn't changing, return early
      if (newScale === currentScale) return;

      // Convert center point to world coordinates
      const worldX = (centerX - currentPosition.x) / currentScale;
      const worldY = (centerY - currentPosition.y) / currentScale;

      // Calculate where the center world point would be at the new scale
      const scaledX = worldX * newScale;
      const scaledY = worldY * newScale;

      // Calculate the new pan position to keep the world center point at the screen center
      setPosition({
        x: centerX - scaledX,
        y: centerY - scaledY
      });
      setScale(newScale); // Update scale after position for potentially smoother rendering (or vice-versa)
    },
    // Dependencies: state values and setters, and constants
    [containerId, position, scale, setScale, setPosition, minScale, maxScale]
  );


  return {
    // Return the wheel handler to be used by the ZoomableContainer component's onWheel prop
    handleWheel,
    // Return the button handler for external use (e.g., by Controls component)
    handleZoomButtons
  };
}