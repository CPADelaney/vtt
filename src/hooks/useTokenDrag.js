import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook to handle dragging selected tokens.
 * Coordinates are assumed to be in "grid" space.
 *
 * @param {object} options
 * @param {number} options.scale - The current zoom scale of the tabletop.
 * @param {Function} options.getSnappedPosition - Function to snap a grid coordinate pair.
 * @param {Function} options.onDragMove - Callback (tokenId, newPos, isFinal) => void for intermediate moves.
 * @param {Function} options.onDragEnd - Callback (tokenId, finalPos) => void when drag finishes.
 */
export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  // Refs for storing the latest props/state without needing hook re-runs
  const scaleRef = useRef(scale);
  const getSnappedPositionRef = useRef(getSnappedPosition);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  // Our drag state: null when not dragging, { tokenIds: [...], startMouseX, startMouseY, tokenStartPositions: Map<id, {x,y}> } when dragging
  const dragStateRef = useRef(null);
  const isDraggingRef = useRef(false); // Simple boolean ref

  // Update the refs when props change
  useEffect(() => {
    scaleRef.current = scale;
    getSnappedPositionRef.current = getSnappedPosition;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  }, [scale, getSnappedPosition, onDragMove, onDragEnd]); // Depend on the props

  // Attach global event listeners once
  useEffect(() => {
    function onMouseMove(e) {
      if (!isDraggingRef.current || !dragStateRef.current) return; // Only process if dragging
      const dragState = dragStateRef.current;

      // Prevent text selection and default drag behavior while dragging
      e.preventDefault();
      e.stopPropagation(); // Stop propagation so other listeners (like marquee) don't interfere if drag starts

      // Calculate mouse movement delta in screen coordinates
      const dxScreen = e.clientX - dragState.startMouseX;
      const dyScreen = e.clientY - dragState.startMouseY;

      // Convert screen delta to grid delta using the current scale
      const currentScale = scaleRef.current || 1; // Use ref and default to 1
      const dxGrid = dxScreen / currentScale;
      const dyGrid = dyScreen / currentScale;

      // Move all tokens included in this drag operation
      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return; // Should not happen if setup correctly

        // Calculate new position in grid space
        const rawNewX = startPos.x + dxGrid;
        const rawNewY = startPos.y + dyGrid;

        // Get the snapped position
        const snappedPos = getSnappedPositionRef.current(rawNewX, rawNewY);

        // Call the drag move callback for intermediate updates
        // Pass false for isFinal
        onDragMoveRef.current?.(tokenId, snappedPos, false);
      });

    }

    function onMouseUp(e) {
      if (!isDraggingRef.current || !dragStateRef.current) return; // Only process if dragging
      const dragState = dragStateRef.current;

      // Prevent default behavior
       e.preventDefault();
       e.stopPropagation(); // Ensure this stops event propagation


      // Calculate final mouse movement delta in screen coordinates
      const dxScreen = e.clientX - dragState.startMouseX;
      const dyScreen = e.clientY - dragState.startMouseY;

      // Convert screen delta to grid delta using the current scale
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

         // Call the drag move callback ONE LAST TIME with the final position and true for isFinal
         onDragMoveRef.current?.(tokenId, finalSnappedPos, true);

        // Call the drag end callback
        onDragEndRef.current?.(tokenId, finalSnappedPos);
      });

      // Reset drag state
      console.log('[DEBUG] Drag ended.');
      isDraggingRef.current = false;
      dragStateRef.current = null;
      // Restore default cursor and user select
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    function onKeyDown(e) {
      if (e.key === 'Escape' && isDraggingRef.current) {
        console.log('[DEBUG] Drag cancelled via Escape key');
         // TODO: Revert tokens to original positions? Or just stop the drag?
         // For now, just stop drag. Reverting needs storing initial positions here.
         // The current dragStateRef stores initial positions, so reverting is possible.
         // Let's just stop the drag for now, leaving tokens where they are.

        isDraggingRef.current = false;
        dragStateRef.current = null; // Discard state
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
         e.preventDefault(); // Prevent default browser behavior for Escape
         e.stopPropagation(); // Stop propagation
      }
    }

    // Add document-level listeners in the capture phase to ensure they run first
    // This helps in preventing default behaviors and stopping propagation before other handlers.
    document.addEventListener('mousemove', onMouseMove, { capture: true });
    document.addEventListener('mouseup', onMouseUp, { capture: true });
    document.addEventListener('keydown', onKeyDown, { capture: true }); // Keydown can be capture or bubble, capture often safer

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', onMouseMove, { capture: true });
      document.removeEventListener('mouseup', onMouseUp, { capture: true });
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []); // Empty dependency array means these listeners are attached once on mount

  /**
   * Function called from the component's onMouseDown to initiate a drag.
   *
   * @param {object} initialToken - The token element where the mouse down occurred.
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

    // Prevent default text selection etc.
     e.preventDefault();
     e.stopPropagation(); // Stop propagation so the background mousedown handler doesn't also fire

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
      initialTimestamp: Date.now()
    };

    // Set dragging flag
    isDraggingRef.current = true;

    // Change cursor and prevent user selection globally
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent selecting text while dragging

    console.log('[DEBUG] useTokenDrag: Drag state initialized.');
  }, []); // No dependencies needed if called from component with current data

  return {
    startDrag,
    isDragging: isDraggingRef.current // Expose isDragging ref value if needed for UI feedback
  };
}