import { useState, useCallback, useEffect, useRef } from 'react';
// Removed direct DOM manipulation of marquee element

/**
 * Hook to manage token selection via clicks and marquee selection.
 *
 * @param {object} options
 * @param {Function} options.getTokens - Function that returns the current array of token objects (e.g., from gameState).
 * @param {number} options.scale - The current zoom scale of the tabletop.
 * @param {object} options.position - The current pan position {x, y}.
 * @param {number} options.tokenSize - The visual size of tokens (for intersection check).
 * @param {Function} [options.onSelectTokens] - Optional callback when selection changes (removed - selection state managed internally).
 */
export function useTokenSelection({ getTokens, scale, position, tokenSize }) {
  const [selectedTokenIds, setSelectedTokenIds] = useState(new Set());
  // marqueeState: null when not active, { startX: screenPx, startY: screenPx, currentX: screenPx, currentY: screenPx, containerRect } when active
  const [marqueeState, setMarqueeState] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false); // State to indicate if a marquee selection is in progress

   // Refs for the actual listener functions. These need to be stable
   // so they can be added and removed correctly.
   const handleMarqueeMouseMoveRef = useRef();
   const handleMarqueeMouseUpRef = useRef();


  const clearSelection = useCallback(() => {
    console.log('[DEBUG] Clearing selection.');
    setSelectedTokenIds(new Set());
  }, []);


  // This function is for setting the selection directly (e.g., after marquee or token click)
  // It handles additive logic internally.
  const setSelectedIds = useCallback((idsToSelect, additive = false) => {
       console.log('[DEBUG] Setting selection:', { tokenIds: Array.from(idsToSelect), additive });
        setSelectedTokenIds(prev => {
             let newSet = new Set(prev);

             if (additive) {
                 // Additive: Add tokens in the list to the current selection
                 idsToSelect.forEach(id => newSet.add(id));
             } else {
                 // Not additive: Replace the selection with only the tokens in the list
                 newSet = new Set(idsToSelect);
             }

            return newSet;
        });
  }, []); // setSelectedTokenIds is a stable setter, additive is an arg. Dependencies are correct ([]).


   // Handler for document mousemove during marquee
   const handleMarqueeMouseMove = useCallback((e) => {
        // Only process if marqueeState is active
        // Access state directly as it's listed in dependencies
        if (!marqueeState) return;

        // Prevent default text selection
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Use marqueeState directly for containerRect
        const { containerRect: initialContainerRect } = marqueeState;

        // Update the current mouse position in container coordinates
        const currentX = e.clientX - initialContainerRect.left;
        const currentY = e.clientY - initialContainerRect.top;

        // Update marquee state - This will trigger Marquee component re-render
        setMarqueeState(prev => ({
            ...prev,
            currentX,
            currentY
        }));

   }, [marqueeState, setMarqueeState]); // Depends on state and its setter


    // Handler for document mouseup during marquee
   const handleMarqueeMouseUp = useCallback((e) => {
        // Only process if marqueeState is active
        // Access state directly as it's listed in dependencies
        if (!marqueeState) return;

        console.log('[DEBUG] useTokenSelection: handleMouseUp. Marquee ended.');

        // Prevent default
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Get marquee coordinates and containerRect from state
        const { startX, startY, currentX, currentY, containerRect: initialContainerRect } = marqueeState; // Get from state

        // Calculate marquee bounding box (min/max screen coordinates relative to container)
        const marqueeMinXScreen = Math.min(startX, currentX);
        const marqueeMaxXScreen = Math.max(startX, currentX);
        const marqueeMinYScreen = Math.min(startY, currentY);
        const marqueeMaxYScreen = Math.max(startY, currentY);

        // Get latest state/props directly as they are listed in dependencies
        const currentTokens = getTokens(); // Call getTokens prop directly
        const currentScale = scale || 1; // Use scale prop directly
        const currentPosition = position || { x: 0, y: 0 }; // Use position prop directly
        const currentTokenSize = tokenSize || 40; // Use tokenSize prop directly

        // Check which tokens intersect with the marquee rectangle
        const intersectingTokenIds = new Set();
        const tokenRadius = currentTokenSize / 2;

        currentTokens.forEach(token => {
            // Get token's screen position relative to the container.
            // Token's position is its center in grid coordinates.
            // Convert grid position to screen position: (gridPos * scale) + panOffset
            const tokenCenterXScreen = (token.position.x * currentScale) + currentPosition.x;
            const tokenCenterYScreen = (token.position.y * currentScale) + currentPosition.y;

            // Get token's screen bounds.
            const tokenLeftScreen = tokenCenterXScreen - tokenRadius;
            const tokenRightScreen = tokenCenterXScreen + tokenRadius;
            const tokenTopScreen = tokenCenterYScreen - tokenRadius;
            const tokenBottomScreen = tokenCenterYScreen + tokenRadius;


            // Check for intersection between marquee rectangle and token bounding box (AABB intersection)
            const intersects = !(
                marqueeMaxXScreen < tokenLeftScreen ||
                marqueeMinXScreen > tokenRightScreen ||
                marqueeMaxYScreen < tokenTopScreen ||
                marqueeMinYScreen > tokenBottomScreen
            );


            if (intersects) {
                intersectingTokenIds.add(token.id);
            }
        });

        console.log('[DEBUG] Marquee selection complete. Intersecting tokens:', Array.from(intersectingTokenIds));

        // Update the selected tokens state using the additive flag from the mouse event (Shift key)
        setSelectedIds(intersectingTokenIds, e.shiftKey); // Call setSelectedIds

        // Reset marquee state and selecting flag
        setMarqueeState(null);
        setIsSelecting(false);

        // Remove global listeners added in startMarquee using the stable handler refs
        document.removeEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
        document.removeEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });
         document.body.style.userSelect = ''; // Restore user select

   }, [
       marqueeState, // State variable
       getTokens, scale, position, tokenSize, // Props
       setSelectedIds, setMarqueeState, setIsSelecting, // Stable setters/callbacks
       handleMarqueeMouseMoveRef, handleMarqueeMouseUpRef // Stable refs for listener cleanup
   ]);


   // Effect to keep the handler refs updated with the latest memoized function instances
   useEffect(() => {
       handleMarqueeMouseMoveRef.current = handleMarqueeMouseMove;
   }, [handleMarqueeMouseMove]);

   useEffect(() => {
       handleMarqueeMouseUpRef.current = handleMarqueeMouseUp;
   }, [handleMarqueeMouseUp]);


  /**
   * Call this function from the tabletop's onMouseDown handler when a click
   * doesn't hit a token and isn't a right-click (pan/context menu), and
   * a drag threshold is met.
   *
   * @param {object} startEvent - The initial mousedown event (or object with clientX/Y).
   */
  const startMarquee = useCallback((startEvent) => {
    console.log('[DEBUG] useTokenSelection: startMarquee called.');

    // Get container and verify
    const container = document.getElementById('tabletop-container');
    if (!container) {
      console.error('[DEBUG] Container not found for marquee.');
      return;
    }

    // Get container bounds - calculate this fresh on mousedown
    const containerRect = container.getBoundingClientRect();

    // Store the starting position of the mouse in container coordinates
    const startX = startEvent.clientX - containerRect.left;
    const startY = startEvent.clientY - containerRect.top;

    console.log('[DEBUG] Marquee start position (container coords):', { startX, startY });

    // Set marquee state to activate mouse move/up listeners
    setMarqueeState({
      startX,
      startY,
      currentX: startX, // Current position starts the same
      currentY: startY,
      containerRect // Store container rect for later calculations
    });
     setIsSelecting(true); // Set selecting flag

     // Prevent user selection globally while selecting
     document.body.style.userSelect = 'none';

    // Add global mouse move/up listeners managed by this hook
    // Using { capture: true } to ensure they run before bubbling handlers
    // Use the .current property of the handler refs
    document.addEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
    document.addEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });

  }, [setMarqueeState, setIsSelecting, handleMarqueeMouseMoveRef, handleMarqueeMouseUpRef]); // Depend on state setters and refs for listeners


  // Effect to clear selection if a selected token is deleted outside this hook's actions
  // (e.g., via Context Menu delete). This ensures the selection set stays valid.
  useEffect(() => {
       // Get the latest tokens list by calling the prop function
       const currentTokens = getTokens();
       const currentTokenIds = new Set(currentTokens.map(t => t.id));

       // Check if any token in the selection set no longer exists in the current tokens list
       // Access selectedTokenIds state directly as it's in dependencies
       const selectionNeedsCleanup = Array.from(selectedTokenIds).some(id => !currentTokenIds.has(id));

       if (selectionNeedsCleanup) {
            console.log('[DEBUG] Selected token(s) removed by external action, cleaning up selection.');
            // Filter the selection set to only include existing tokens
            const newSelection = new Set(Array.from(selectedTokenIds).filter(id => currentTokenIds.has(id)));
            // Update selection state using the setter
            setSelectedTokenIds(newSelection); // Directly update state managed by this hook
       }
  }, [getTokens, selectedTokenIds, setSelectedTokenIds]); // Depend on getTokens, selectedTokenIds state, and its setter


  // Cleanup listeners when component unmounts, just in case mouseup didn't fire correctly
  useEffect(() => {
      return () => {
          console.log('[DEBUG] useTokenSelection: Hook unmounting, cleaning up listeners.');
          // Ensure global listeners are removed on unmount using the stable refs
           document.removeEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
           document.removeEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });
           setMarqueeState(null); // Ensure marquee state is reset
           setIsSelecting(false); // Reset selecting flag
           document.body.style.userSelect = ''; // Restore user select
      };
  }, [handleMarqueeMouseMoveRef, handleMarqueeMouseUpRef, setMarqueeState, setIsSelecting]); // Depend on stable refs and state setters


  return {
    selectedTokenIds, // The Set of currently selected token IDs
    selectTokenId, // For single token selection/toggle
    clearSelection, // To clear all selections
    startMarquee, // Call this on mouse down for marquee
    marqueeState, // State to render the Marquee component (provides position/size)
    isSelecting, // Boolean flag indicating marquee is active
    setSelectedTokenIds, // Expose internal setter for the cleanup effect within the hook (used in VT cleanup)
  };
}