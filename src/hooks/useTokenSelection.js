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

   // Refs for the latest values of props/state used in global listeners
   const scaleRef = useRef(scale);
   const positionRef = useRef(position);
   const getTokensRef = useRef(getTokens);
   const tokenSizeRef = useRef(tokenSize);
   const selectedTokenIdsRef = useRef(selectedTokenIds); // Also keep track of selected IDs in ref for check
   const marqueeStateRef = useRef(marqueeState);

   // Update refs whenever dependencies change
   useEffect(() => {
       scaleRef.current = scale;
       positionRef.current = position;
       getTokensRef.current = getTokens;
       tokenSizeRef.current = tokenSize;
       selectedTokenIdsRef.current = selectedTokenIds;
       marqueeStateRef.current = marqueeState;
   }, [scale, position, getTokens, tokenSize, selectedTokenIds, marqueeState]);


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
  }, []);


   // Function to toggle selection of a single token
  const selectTokenId = useCallback((tokenId, additive = false) => {
    console.log('[DEBUG] Toggling/Selecting single token:', { tokenId, additive });

    setSelectedTokenIds(prev => {
      const newSet = new Set(prev); // Always start with a copy of previous selection

      if (additive) {
        // If additive, toggle the state of the clicked token
        if (newSet.has(tokenId)) {
          newSet.delete(tokenId);
        } else {
          newSet.add(tokenId);
        }
      } else {
        // If not additive, clear previous selection and select only this token
        newSet.clear();
        newSet.add(tokenId);
      }

      console.log('[DEBUG] New selection after single toggle:', Array.from(newSet));

      return newSet;
    });
  }, []);


    // Handler for document mousemove during marquee
    // Memoized using ref pattern for adding/removing listeners
    const handleMarqueeMouseMoveRef = useRef(handleMarqueeMouseMove);
    useEffect(() => {
        handleMarqueeMouseMoveRef.current = handleMarqueeMouseMove;
    }, [handleMarqueeMouseMove]); // Depend on the memoized handler logic

    const handleMarqueeMouseMove = useCallback((e) => {
        // Only process if marqueeState is active
        const currentMarqueeState = marqueeStateRef.current; // Use ref
        if (!currentMarqueeState) return;

        // Prevent default text selection
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Update the current mouse position in container coordinates
        const currentX = e.clientX - currentMarqueeState.containerRect.left;
        const currentY = e.clientY - currentMarqueeState.containerRect.top;

        // Update marquee state - This will trigger Marquee component re-render
        // Use functional update form to ensure latest state is used
        setMarqueeState(prev => ({
            ...prev,
            currentX,
            currentY
        }));

    }, []); // No dependencies needed if using refs inside


    // Handler for document mouseup during marquee
    // Memoized using ref pattern for adding/removing listeners
    const handleMarqueeMouseUpRef = useRef(handleMarqueeMouseUp);
    useEffect(() => {
        handleMarqueeMouseUpRef.current = handleMarqueeMouseUp;
    }, [handleMarqueeMouseUp]); // Depend on the memoized handler logic

    const handleMarqueeMouseUp = useCallback((e) => {
        // Only process if marqueeState is active
        const currentMarqueeState = marqueeStateRef.current; // Use ref
        if (!currentMarqueeState) return;

        console.log('[DEBUG] useTokenSelection: handleMouseUp. Marquee ended.');

        // Prevent default
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Get the final marquee screen coordinates relative to the container
        const { startX, startY, currentX, currentY, containerRect } = currentMarqueeState;

        // Calculate marquee bounding box (min/max screen coordinates relative to container)
        const marqueeMinXScreen = Math.min(startX, currentX);
        const marqueeMaxXScreen = Math.max(startX, currentX);
        const marqueeMinYScreen = Math.min(startY, currentY);
        const marqueeMaxYScreen = Math.max(startY, currentY);

        // Get latest state values via refs for calculation
        const currentTokens = getTokensRef.current();
        const currentScale = scaleRef.current || 1;
        const currentPosition = positionRef.current || { x: 0, y: 0 };
        const currentTokenSize = tokenSizeRef.current || 40; // Default if ref is stale

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
        setSelectedIds(intersectingTokenIds, e.shiftKey);

        // Reset marquee state and selecting flag
        setMarqueeState(null);
        setIsSelecting(false);

        // Remove global listeners added in startMarquee
        document.removeEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
        document.removeEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });
         document.body.style.userSelect = ''; // Restore user select

    }, [setSelectedIds]); // Depend on setSelectedIds


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

    // Get container bounds
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
    document.addEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
    document.addEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });

  }, []); // No dependencies needed for startMarquee itself logic


  // Effect to clear selection if a selected token is deleted outside this hook's actions
  // (e.g., via Context Menu delete). This ensures the selection set stays valid.
  useEffect(() => {
       // Get the latest tokens list using the ref
       const currentTokens = getTokensRef.current();
       const currentTokenIds = new Set(currentTokens.map(t => t.id));
       const currentSelectedTokenIds = selectedTokenIdsRef.current; // Use ref for current selection state

       // Check if any token in the selection set no longer exists in the current tokens list
       const selectionNeedsCleanup = Array.from(currentSelectedTokenIds).some(id => !currentTokenIds.has(id));

       if (selectionNeedsCleanup) {
            console.log('[DEBUG] Selected token(s) removed by external action, cleaning up selection.');
            // Filter the selection set to only include existing tokens
            const newSelection = new Set(Array.from(currentSelectedTokenIds).filter(id => currentTokenIds.has(id)));
            // Update selection state using the setter
            setSelectedTokenIds(newSelection); // Directly update state managed by this hook
       }
  }, [getTokens]); // Depend only on the getTokens function reference (should be stable via useCallback)
  // Note: React guarantees state setters are stable. selectedTokenIds state change itself
  // will trigger re-renders where the effect runs again if tokens changed.
  // The dependency on `getTokens` ensures this cleanup runs if the parent's tokens array reference changes.


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
  }, [handleMarqueeMouseMoveRef, handleMarqueeMouseUpRef]); // Depend on stable handler refs


  return {
    selectedTokenIds, // The Set of currently selected token IDs
    selectTokenId, // For single token selection/toggle
    clearSelection, // To clear all selections
    startMarquee, // Call this on mouse down for marquee
    marqueeState, // State to render the Marquee component (provides position/size)
    isSelecting, // Boolean flag indicating marquee is active
    setSelectedTokenIds, // Expose internal setter for the cleanup effect within the hook
  };
}