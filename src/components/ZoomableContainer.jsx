import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import _ from 'lodash';
import { useZoomToMouse } from '../hooks/useZoomToMouse';

export function ZoomableContainer({
  containerId = 'tabletop-container',
  scale,
  position,
  setScale,
  setPosition,
  minScale = 0.5,
  maxScale = 4,
  zoomFactor = 0.1,
  onZoomEnd,
  onPanEnd, // This prop is likely unused now that pan is handled externally
  onContextMenu,
  gridWidth,
  gridHeight,
  isPanDisabled = false, // New prop: disable pan/zoom events if true
  children
}) {
  // Use the useZoomToMouse hook for wheel-based zooming
  const { handleWheel } = useZoomToMouse({
    containerId,
    scale,
    position,
    setScale,
    setPosition,
    minScale,
    maxScale,
    zoomFactor,
    isPanDisabled, // Pass the disabled flag to the hook
  });

  // The ZoomableContainer component's main role is now to:
  // 1. Provide the container element with a known ID.
  // 2. Apply the transform based on parent-managed scale/position.
  // 3. Attach the wheel listener (managed by useZoomToMouse hook).
  // 4. Attach the right-click context menu listener.
  // 5. Manage pointer events based on `isPanDisabled`.

  // Wheel listener for zooming
  const handleContainerWheel = useCallback((e) => {
     // The check for container containment is done inside handleWheel hook
     // We just call the hook's handler
     handleWheel(e);
     // Assuming the hook prevents default if it handles the event
  }, [handleWheel]);


  // Attach wheel listener to the container element
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[DEBUG] ZoomableContainer: Container element with ID "${containerId}" not found on mount.`);
        return;
    }

    // Add the wheel listener
    // Use { passive: false } to allow preventDefault for custom zooming
    container.addEventListener('wheel', handleContainerWheel, { passive: false });

    // Cleanup function
    return () => {
       console.log(`[DEBUG] ZoomableContainer: Removing wheel listener from "${containerId}".`);
       container.removeEventListener('wheel', handleContainerWheel);
    };
  }, [containerId, handleContainerWheel]); // Depend on containerId and the memoized handler


  // Context Menu listener for right-clicking
  const handleContainerContextMenu = useCallback((e) => {
      // Call the parent's onContextMenu handler if provided
      // The parent (VirtualTabletop) is responsible for checking if
      // a drag/select was active before showing its custom menu.
      // We prevent the default browser context menu here.
       e.preventDefault();
       e.stopPropagation();
       console.log('[DEBUG-CONTAINER] Context menu triggered on container.');
       onContextMenu?.(e); // Call the callback passed from the parent
  }, [onContextMenu]); // Depend on the parent's callback

   // Attach context menu listener to the container element
   useEffect(() => {
       const container = document.getElementById(containerId);
       if (!container) {
           console.warn(`[DEBUG] ZoomableContainer: Container element with ID "${containerId}" not found for contextmenu listener.`);
           return;
       }
       // Add the contextmenu listener
        container.addEventListener('contextmenu', handleContainerContextMenu);

       // Cleanup function
        return () => {
            console.log(`[DEBUG] ZoomableContainer: Removing contextmenu listener from "${containerId}".`);
            container.removeEventListener('contextmenu', handleContainerContextMenu);
        };
   }, [containerId, handleContainerContextMenu]); // Depend on containerId and the memoized handler


  // Style for the main container element
  const containerStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden', // Hide scrollbars
    position: 'relative', // Needed for absolute positioning of content
    touchAction: 'none', // Prevent default touch gestures like panning/zooming
    // Pointer events always 'auto' on the container itself,
    // allowing mouse events to be captured here before bubbling/capture phases.
    pointerEvents: 'auto',
  };

  // Style for the content element (the actual tabletop that gets transformed)
  const contentStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: gridWidth,
    height: gridHeight,
    // Apply the transform based on scale and position from parent state
    transform: `translate(${position?.x || 0}px, ${position?.y || 0}px) scale(${scale || 1})`,
    transformOrigin: '0 0', // Scale/translate from the top-left corner

    // Disable pointer events on the content *while dragging or selecting*.
    // This prevents unintended interactions with elements *within* the tabletop
    // while a drag or marquee started *on* the tabletop is in progress.
    // Mouse events are handled by global listeners attached to document.body by hooks.
    // Re-enable pointer events when not dragging/selecting so tokens, grid, etc.,
    // are interactive for clicks/initial mousedown.
    pointerEvents: isPanDisabled ? 'none' : 'auto',
  };

    // The onMouseDown on the container div is NOT where the main click/drag/marquee
    // differentiation happens in the refactored approach. That happens on the
    // #tabletop div child, handled by VirtualTabletop.
    // This container's mousedown is primarily for capturing the event early if needed,
    // but the logic is simpler now. Let's remove the redundant mousedown handler here.

return (
    <div
      id={containerId}
      style={containerStyle}
      // Removed internal mousedown, mousemove, mouseup handlers
      // Wheel and ContextMenu are handled by useEffect listeners above
    >
      <div
        id="tabletop" // Give the content div the id expected by other components/hooks
        style={contentStyle}
         // Handlers for drag/marquee initiation and click/ping should be on this #tabletop div
         // and are managed by the parent component (VirtualTabletop).
         // We don't need handlers here on the content div itself, as VirtualTabletop
         // attaches them via its own onMouseDown prop to this div.
      >
        {children}
      </div>
    </div>
);
}