import { useCallback, useEffect, useRef, useState } from 'react';
import _ from 'lodash';

/**
 * Hook to handle dragging selected tokens.
 * Coordinates are assumed to be in "grid" space.
 * Attaches global mousemove and mouseup listeners to track drag *only when active*.
 *
 * @param {object} options
 * @param {number} options.scale - The current zoom scale of the tabletop.
 * @param {Function} options.getSnappedPosition - Function to snap a grid coordinate pair.
 * @param {Function} options.onDragMove - Callback (tokenId, newPos) => void for intermediate moves (receives snapped pos).
 * @param {Function} options.onDragEnd - Callback (tokenIds: string[], finalPositions: Map<string, {x,y}>) => void when drag finishes.
 */
export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  // Refs for storing the latest props/state without needing hook re-runs for event handlers
  const scaleRef = useRef(scale);
  const getSnappedPositionRef = useRef(getSnappedPosition);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  // Our drag state: null when not dragging, { startMouseX, startMouseY, tokenStartPositions: Map<id, {x,y}> } when dragging
  const dragStateRef = useRef(null);
  // State to indicate if dragging is currently active (exposed to parent)
  const [isDragging, setIsDragging] = useState(false);


  // Update the refs when props change. This ensures the global listeners
  // (even though they are added dynamically) access the latest state/prop values via these refs.
  useEffect(() => {
    scaleRef.current = scale;
    getSnappedPositionRef.current = getSnappedPosition;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  }, [scale, getSnappedPosition, onDragMove, onDragEnd]); // Depend on the props

  // Memoize the mousemove handler using the ref pattern
  const handleMouseMoveRef = useRef(handleMouseMove);
  useEffect(() => {
      handleMouseMoveRef.current = handleMouseMove;
  }, [handleMouseMove]); // Depend on the memoized handler logic

  // Memoize the mouseup handler using the ref pattern
  const handleMouseUpRef = useRef(handleMouseUp);
   useEffect(() => {
      handleMouseUpRef.current = handleMouseUp;
  }, [handleMouseUp]); // Depend on the memoized handler logic


  // Mouse move handler - Only active when `isDragging` is true
  const handleMouseMove = useCallback((e) => {
      if (!isDragging) return; // Only process if dragging state is true

      // Prevent text selection and default drag behavior while dragging
      e.preventDefault();
      e.stopPropagation(); // Stop propagation so other listeners don't interfere

      const dragState = dragStateRef.current;
      if (!dragState) return; // Should not be null if isDragging is true

      // Calculate mouse movement delta in screen coordinates
      const dxScreen = e.clientX - dragState.startMouseX;
      const dyScreen = e.clientY - dragState.startMouseY;

      // Convert screen delta to grid delta using the current scale from ref
      const currentScale = scaleRef.current || 1; // Use ref and default to 1
      const dxGrid = dxScreen / currentScale;
      const dyGrid = dyScreen / currentScale;

      // Store current positions in the drag state for the end calculation
      const currentTokenPositions = new Map();

      // Move all tokens included in this drag operation
      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return; // Should not happen if setup correctly

        // Calculate new position in grid space (initial + delta)
        const rawNewX = startPos.x + dxGrid;
        const rawNewY = startPos.y + dyGrid;

        // Get the snapped position using the snapping function from ref
        const snappedPos = getSnappedPositionRef.current(rawNewX, rawNewY);

         // Store the current snapped position
        currentTokenPositions.set(tokenId, snappedPos);

        // Call the drag move callback for intermediate updates using ref
        onDragMoveRef.current?.(tokenId, snappedPos);
      });

       // Update the current positions in the drag state
      dragStateRef.current.currentTokenPositions = currentTokenPositions;

  }, [isDragging]); // Depend on the `isDragging` state


  // Mouse up handler - Only active when `isDragging` is true
  const handleMouseUp = useCallback((e) => {
      if (!isDragging) return; // Only process if dragging state is true

      console.log('[DEBUG] useTokenDrag: handleMouseUp. Drag ended.');

      // Prevent default behavior (like context menu on some buttons)
      e.preventDefault();
      e.stopPropagation(); // Ensure this stops event propagation

      const dragState = dragStateRef.current;
      if (!dragState) return; // Should not be null if isDragging is true

      // Get the final snapped positions from the last mousemove update
      const finalPositions = dragState.currentTokenPositions || dragState.tokenStartPositions;

      // Call the drag end callback using ref.
      onDragEndRef.current?.(dragState.tokenIds, finalPositions); // Pass token IDs and final positions map

      // Reset drag state and listeners
      setIsDragging(false);
      dragStateRef.current = null;

      // Restore default cursor and user select globally
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

       // Remove the global listeners added in startDrag
       document.removeEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
       document.removeEventListener('mouseup', handleMouseUpRef.current, { capture: true });
       document.removeEventListener('keydown', handleKeyDown, { capture: true }); // Also remove keydown listener
  }, [isDragging, onDragEnd]); // Depend on `isDragging` state and the end callback


  // Keydown handler for cancellation
  const handleKeyDown = useCallback((e) => {
      if (e.key === 'Escape' && isDragging) {
        console.log('[DEBUG] Drag cancelled via Escape key');

         // Revert tokens to their start positions
         const dragState = dragStateRef.current;
         if (dragState?.tokenStartPositions) {
             console.log('[DEBUG] Reverting tokens to start positions.');
             // Use onDragMove to visually move them back immediately
              dragState.tokenIds.forEach(tokenId => {
                  const startPos = dragState.tokenStartPositions.get(tokenId);
                  if (startPos) {
                      onDragMoveRef.current?.(tokenId, startPos);
                  }
              });
             // Then call onDragEnd with the start positions to finalize the state (adds to history)
             onDragEndRef.current?.(dragState.tokenIds, dragState.tokenStartPositions);
         }


        // Reset state and listeners
        setIsDragging(false);
        dragStateRef.current = null; // Discard state

        // Restore default cursor and user select globally
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

         e.preventDefault(); // Prevent default browser behavior for Escape
         e.stopPropagation(); // Stop propagation

         // Remove the global listeners manually
         document.removeEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
         document.removeEventListener('mouseup', handleMouseUpRef.current, { capture: true });
         document.removeEventListener('keydown', handleKeyDown, { capture: true });
      }
  }, [isDragging, onDragMove, onDragEnd]); // Depend on state and callbacks


  /**
   * Function called from the component's onMouseDown to initiate a drag.
   * Should be called when a token mousedown occurs and the component
   * decides a drag might start (e.g., after threshold check in mousemove).
   *
   * @param {Array<object>} tokensToDrag - Array of all token objects that should be dragged together.
   * @param {MouseEvent} e - The mouse down event (used for start position).
   */
  const startDrag = useCallback((tokensToDrag, e) => {
    console.log('[DEBUG] useTokenDrag: startDrag called.', {
      selectedCount: tokensToDrag.length,
      mouseX: e.clientX,
      mouseY: e.clientY
    });

    // If a drag is already in progress, ignore this new startDrag call
    if (isDragging) { // Use state value here
        console.warn('[DEBUG] useTokenDrag: startDrag called while already dragging. Ignoring.');
        return;
    }
     if (tokensToDrag.length === 0) {
         console.warn('[DEBUG] useTokenDrag: startDrag called with empty token list. Ignoring.');
         return;
     }

    // Build the map of initial positions for *all* tokens being dragged
    const tokenStartPositions = new Map();
    tokensToDrag.forEach(token => {
      tokenStartPositions.set(token.id, {
        x: token.position.x,
        y: token.position.y
      });
    });

    // Store the initial state in the ref
    dragStateRef.current = {
      tokenIds: tokensToDrag.map(t => t.id),
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      tokenStartPositions,
      currentTokenPositions: tokenStartPositions, // Initialize current with start
    };

    // Set dragging state to true - this enables the mousemove/mouseup handlers logic
    setIsDragging(true);

    // Change cursor and prevent user selection globally
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent selecting text while dragging

    // Attach global event listeners for the duration of the drag
    // Using { capture: true } to ensure they run first
    document.addEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
    document.addEventListener('mouseup', handleMouseUpRef.current, { capture: true });
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    console.log('[DEBUG] useTokenDrag: Drag state initialized, listeners attached.');
  }, [isDragging, handleKeyDown]); // Depend on isDragging state and keydown handler


  // Cleanup function: runs when the hook unmounts (component unmounts).
  // Ensures listeners are removed if a drag is in progress when the component unmounts.
  useEffect(() => {
      return () => {
          console.log('[DEBUG] useTokenDrag: Hook unmounting, cleaning up global listeners.');
          document.removeEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
          document.removeEventListener('mouseup', handleMouseUpRef.current, { capture: true });
          document.removeEventListener('keydown', handleKeyDown, { capture: true });
          // Ensure cursor/user-select are reset on unmount just in case
           document.body.style.cursor = '';
           document.body.style.userSelect = '';
      };
  }, [handleMouseMoveRef, handleMouseUpRef, handleKeyDown]); // Depend on stable handler refs

  return {
    startDrag,
    isDragging // Expose isDragging state
  };
}