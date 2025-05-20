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


  // --- Define Handler Logic using useCallback ---
  // These functions capture state/props from their render cycle and depend on `isDragging` state.

  const handleMouseMoveLogic = useCallback((e) => {
      // Only process if dragging state is true
      if (!isDragging) return;

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

  }, [isDragging]); // Depends on the `isDragging` state


  const handleMouseUpLogic = useCallback((e) => {
      // Only process if dragging state is true
      if (!isDragging) return;

      console.log('[DEBUG] useTokenDrag: handleMouseUpLogic. Drag ended.');

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
      setIsDragging(false); // Set state - this triggers a re-render
      dragStateRef.current = null;

      // Restore default cursor and user select globally
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

       // Remove the global listeners manually using the handler refs
       // Use a slight delay to allow the current event loop to finish processing
       // This can sometimes help prevent issues with listener removal during the same event that triggered them.
       setTimeout(() => {
            document.removeEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
            document.removeEventListener('mouseup', handleMouseUpRef.current, { capture: true });
            document.removeEventListener('keydown', handleKeyDownRef.current, { capture: true }); // Use keydown ref
       }, 0);

  }, [isDragging]); // Depends on `isDragging` state


  const handleKeyDownLogic = useCallback((e) => {
      if (e.key === 'Escape' && isDragging) { // Access state directly
        console.log('[DEBUG] Drag cancelled via Escape key');

         const dragState = dragStateRef.current;
         if (dragState?.tokenStartPositions) {
             console.log('[DEBUG] Reverting tokens to start positions.');
             // Use onDragMove to visually move them back immediately using ref
              dragState.tokenIds.forEach(tokenId => {
                  const startPos = dragState.tokenStartPositions.get(tokenId);
                  if (startPos) {
                      onDragMoveRef.current?.(tokenId, startPos); // Use ref
                  }
              });
             // Then call onDragEnd with the start positions to finalize the state (adds to history) using ref
             onDragEndRef.current?.(dragState.tokenIds, dragState.tokenStartPositions); // Use ref
         }

        // Reset state and listeners
        setIsDragging(false); // Set state - this triggers a re-render
        dragStateRef.current = null; // Discard state

        // Restore default cursor and user select globally
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

         e.preventDefault(); // Prevent default browser behavior for Escape
         e.stopPropagation(); // Stop propagation

         // Remove the global listeners manually using the handler refs
         // Use a slight delay similar to mouseup cleanup
         setTimeout(() => {
            document.removeEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
            document.removeEventListener('mouseup', handleMouseUpRef.current, { capture: true });
            document.removeEventListener('keydown', handleKeyDownRef.current, { capture: true }); // Use keydown ref
         }, 0);
      }
  }, [isDragging]); // Depends on isDragging state


  // --- Refs for the actual listener functions ---
  // These refs will always point to the latest version of the handler logic defined above.
   const handleMouseMoveRef = useRef(handleMouseMoveLogic);
   const handleMouseUpRef = useRef(handleMouseUpLogic);
   const handleKeyDownRef = useRef(handleKeyDownLogic);


  // --- Effects to keep handler refs updated ---
  // These effects run whenever the corresponding handler logic changes (i.e., when isDragging changes)
  useEffect(() => {
      handleMouseMoveRef.current = handleMouseMoveLogic;
      // console.log('[DEBUG] useTokenDrag: handleMouseMoveLogic updated in ref.');
  }, [handleMouseMoveLogic]);

  useEffect(() => {
      handleMouseUpRef.current = handleMouseUpLogic;
       // console.log('[DEBUG] useTokenDrag: handleMouseUpLogic updated in ref.');
  }, [handleMouseUpLogic]);

  useEffect(() => {
      handleKeyDownRef.current = handleKeyDownLogic;
       // console.log('[DEBUG] useTokenDrag: handleKeyDownLogic updated in ref.');
  }, [handleKeyDownLogic]);


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
      mouseY: e.clientY,
      isDraggingState: isDragging, // Log current state value
    });

    // If a drag is already in progress, ignore this new startDrag call
    if (isDragging) { // Use state value here for the guard
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

    // Set dragging state to true - this triggers a re-render and enables the handler logic
    setIsDragging(true);

    // Change cursor and prevent user selection globally
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent selecting text while dragging

    // Attach global event listeners for the duration of the drag
    // Use { capture: true } to ensure they run first
    // Use the .current property of the handler refs
    document.addEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
    document.addEventListener('mouseup', handleMouseUpRef.current, { capture: true });
    document.addEventListener('keydown', handleKeyDownRef.current, { capture: true });

    console.log('[DEBUG] useTokenDrag: Drag state initialized, listeners attached.');

     // Prevent default browser actions related to mousedown that might interfere (like image drag)
     // It's best for the component calling startDrag to handle preventDefault/stopPropagation
     // on the original mousedown event based on its context (e.g., if on a token).
     // Adding them here defensively if not handled upstream.
     // e.preventDefault();
     // e.stopPropagation();

  }, [isDragging]); // Dependency only includes the state used in the guard clause


  // Cleanup function: runs when the hook unmounts (component unmounts).
  // Ensures listeners are removed if a drag is in progress when the component unmounts.
  useEffect(() => {
      return () => {
          console.log('[DEBUG] useTokenDrag: Hook unmounting, cleaning up global listeners.');
          // Use the latest state of the refs during cleanup
           // Use a slight delay for cleanup on unmount too
           setTimeout(() => {
                document.removeEventListener('mousemove', handleMouseMoveRef.current, { capture: true });
                document.removeEventListener('mouseup', handleMouseUpRef.current, { capture: true });
                document.removeEventListener('keydown', handleKeyDownRef.current, { capture: true });
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
           }, 0);
      };
  }, [handleMouseMoveRef, handleMouseUpRef, handleKeyDownRef]); // Depend on stable handler refs


  return {
    startDrag,
    isDragging // Expose isDragging state
  };
}