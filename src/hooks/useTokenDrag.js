import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook to handle dragging selected tokens.
 * Coordinates are assumed to be in "grid" space.
 * Attaches global mousemove and mouseup listeners to track drag.
 *
 * @param {object} options
 * @param {number} options.scale - The current zoom scale of the tabletop.
 * @param {Function} options.getSnappedPosition - Function to snap a grid coordinate pair.
 * @param {Function} options.onDragMove - Callback (tokenId, newPos) => void for intermediate moves (receives snapped pos).
 * @param {Function} options.onDragEnd - Callback (tokenId, finalPos) => void when drag finishes (receives snapped pos).
 */
export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  // Refs for storing the latest props/state without needing hook re-runs for event handlers
  const scaleRef = useRef(scale);
  const getSnappedPositionRef = useRef(getSnappedPosition);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  // Our drag state: null when not dragging, { tokenIds: [...], startMouseX, startMouseY, tokenStartPositions: Map<id, {x,y}> } when dragging
  const dragStateRef = useRef(null);
  const isDraggingRef = useRef(false); // Simple boolean ref

  // Update the refs when props change. This effect ensures the global listeners
  // (even though they are added once) access the latest state/prop values via these refs.
  useEffect(() => {
    scaleRef.current = scale;
    getSnappedPositionRef.current = getSnappedPosition;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  }, [scale, getSnappedPosition, onDragMove, onDragEnd]); // Depend on the props

  // Attach global event listeners once on mount.
  // These listeners use the refs to access the latest data.
  useEffect(() => {
    console.log('[DEBUG] useTokenDrag: Attaching global mouse/key listeners.');

    function onMouseMove(e) {
      if (!isDraggingRef.current || !dragStateRef.current) return; // Only process if dragging

      // Prevent text selection and default drag behavior while dragging
      e.preventDefault();
      e.stopPropagation(); // Stop propagation so other listeners don't interfere

      const dragState = dragStateRef.current;

      // Calculate mouse movement delta in screen coordinates
      const dxScreen = e.clientX - dragState.startMouseX;
      const dyScreen = e.clientY - dragState.startMouseY;

      // Convert screen delta to grid delta using the current scale from ref
      const currentScale = scaleRef.current || 1; // Use ref and default to 1
      const dxGrid = dxScreen / currentScale;
      const dyGrid = dyScreen / currentScale;

      // Move all tokens included in this drag operation
      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return; // Should not happen if setup correctly

        // Calculate new position in grid space (initial + delta)
        const rawNewX = startPos.x + dxGrid;
        const rawNewY = startPos.y + dyGrid;

        // Get the snapped position using the snapping function from ref
        const snappedPos = getSnappedPositionRef.current(rawNewX, rawNewY);

        // Call the drag move callback for intermediate updates using ref
        // This callback typically updates component state directly (e.g., via setDirectState)
        onDragMoveRef.current?.(tokenId, snappedPos); // Simplified callback signature
      });

    }

    function onMouseUp(e) {
      if (!isDraggingRef.current || !dragStateRef.current) return; // Only process if dragging

      // Prevent default behavior
       e.preventDefault();
       e.stopPropagation(); // Ensure this stops event propagation


      const dragState = dragStateRef.current;

      // Calculate final mouse movement delta in screen coordinates
      const dxScreen = e.clientX - dragState.startMouseX;
      const dyScreen = e.clientY - dragState.startMouseY;

      // Convert screen delta to grid delta using the current scale from ref
      const currentScale = scaleRef.current || 1;
      const dxGrid = dxScreen / currentScale;
      const dyGrid = dyScreen / currentScale;

      // Handle the end of the drag for all tokens
      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return;

        // Calculate the final snapped position
        const rawFinalX = startPos.x + dxGrid;
        const rawFinalY = startPos.y + dyGrid;
        const finalSnappedPos = getSnappedPositionRef.current(rawFinalX, rawFinalY);

        // Call the drag end callback using ref.
        // This callback typically updates component state and adds to history (e.g., via updateGameState)
        onDragEndRef.current?.(tokenId, finalSnappedPos); // Simplified callback signature
      });

      // Reset drag state
      console.log('[DEBUG] useTokenDrag: Drag ended.');
      isDraggingRef.current = false;
      dragStateRef.current = null; // Clear the drag state

      // Restore default cursor and user select globally
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    function onKeyDown(e) {
      if (e.key === 'Escape' && isDraggingRef.current) {
        console.log('[DEBUG] Drag cancelled via Escape key');
         // Current implementation just stops the drag, leaving tokens at their current position.
         // To revert to original positions, you would need to use the tokenStartPositions
         // stored in dragStateRef.current and call onDragMoveRef.current for each token
         // with their original start position, then call onDragEndRef.current with the start position.

        isDraggingRef.current = false;
        dragStateRef.current = null; // Discard state

        // Restore default cursor and user select globally
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

         e.preventDefault(); // Prevent default browser behavior for Escape (e.g., closing dialogs)
         e.stopPropagation(); // Stop propagation
      }
    }

    // Add document-level listeners in the capture phase to ensure they run first
    // This is important for preventing default behaviors and stopping propagation
    // before potentially conflicting handlers lower in the DOM tree or later in the phase.
    document.addEventListener('mousemove', onMouseMove, { capture: true });
    document.addEventListener('mouseup', onMouseUp, { capture: true });
    document.addEventListener('keydown', onKeyDown, { capture: true }); // Keydown capture is also common

    // Cleanup function: runs when the hook unmounts (component unmounts)
    return () => {
      console.log('[DEBUG] useTokenDrag: Cleaning up global mouse/key listeners.');
      document.removeEventListener('mousemove', onMouseMove, { capture: true });
      document.removeEventListener('mouseup', onMouseUp, { capture: true });
      document.removeEventListener('keydown', onKeyDown, { capture: true });
      // Ensure cursor/user-select are reset on unmount just in case
       document.body.style.cursor = '';
       document.body.style.userSelect = '';
    };
  }, []); // Empty dependency array means these listeners are attached and removed only once

  /**
   * Function called from the component's onMouseDown to initiate a drag.
   * Should be called when a token mousedown occurs and the component
   * decides a drag might start (e.g., not just a click for selection).
   *
   * @param {object} initialToken - The token object where the mouse down occurred.
   * @param {MouseEvent} e - The mouse down event.
   * @param {Array<object>} selectedTokens - Array of all token objects that should be dragged together.
   */
  const startDrag = useCallback((initialToken, e, selectedTokens) => {
    console.log('[DEBUG] useTokenDrag: startDrag called.', {
      initialTokenId: initialToken.id,
      selectedCount: selectedTokens.length,
      mouseX: e.clientX,
      mouseY: e.clientY
    });

    // Prevent default text selection etc. related to the initial click on the element
    // e.preventDefault(); // Prevented by VirtualTabletop's mousedown handler if on token
    // e.stopPropagation(); // Stopped by VirtualTabletop's mousedown handler if on token

    // If a drag is already in progress, ignore this new startDrag call
    if (isDraggingRef.current) {
        console.warn('[DEBUG] useTokenDrag: startDrag called while already dragging. Ignoring.');
        return;
    }

    // Build the map of initial positions for *all* tokens being dragged
    const tokenStartPositions = new Map();
    selectedTokens.forEach(token => {
      tokenStartPositions.set(token.id, {
        x: token.position.x,
        y: token.position.y
      });
    });

    // Store the initial state in the ref
    dragStateRef.current = {
      tokenIds: selectedTokens.map(t => t.id),
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      tokenStartPositions,
      initialTimestamp: Date.now() // Might be useful for timing/thresholds
    };

    // Set dragging flag
    isDraggingRef.current = true;

    // Change cursor and prevent user selection globally
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent selecting text while dragging

    console.log('[DEBUG] useTokenDrag: Drag state initialized.');
  }, []); // No dependencies needed if called from component with current data passed as args

  return {
    startDrag,
    isDragging: isDraggingRef.current // Expose isDragging ref value if needed for UI feedback
  };
}