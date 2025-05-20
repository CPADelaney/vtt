import { useState, useCallback, useEffect } from 'react';
// Removed direct DOM manipulation of marquee element

/**
 * Hook to manage token selection via clicks and marquee selection.
 *
 * @param {object} options
 * @param {Function} options.getTokens - Function that returns the current array of token objects (e.g., from gameState).
 * @param {number} options.scale - The current zoom scale of the tabletop.
 * @param {object} options.position - The current pan position {x, y} of the tabletop.
 * @param {Function} [options.onSelectTokens] - Optional callback when selection changes (e.g., to update token state if needed).
 */
export function useTokenSelection({ getTokens, scale, position, onSelectTokens }) {
  const [selectedTokenIds, setSelectedTokenIds] = useState(new Set());
  // marqueeState: null when not active, { startX: screenPx, startY: screenPx, currentX: screenPx, currentY: screenPx, containerRect } when active
  const [marqueeState, setMarqueeState] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false); // State to indicate if a marquee selection is in progress


  const clearSelection = useCallback(() => {
    console.log('[DEBUG] Clearing selection.');
    setSelectedTokenIds(new Set());
    // onSelectTokens?.(new Set(), false); // Notify parent if needed - selection state is managed internally now
  }, []); // No dependencies needed


  // This function is for setting the selection directly (e.g., after marquee or token click)
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

            // onSelectTokens?.(newSet, additive); // Notify parent - selection state managed internally
            return newSet;
        });
  }, []); // No dependencies needed


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
       // onSelectTokens?.(newSet, additive); // Notify parent - selection state managed internally

      return newSet;
    });
  }, []); // No dependencies needed


  /**
   * Call this function from the tabletop's onMouseDown handler when a click
   * doesn't hit a token and isn't a right-click (pan/context menu).
   * It starts the marquee selection process.
   *
   * @param {MouseEvent} e - The mouse down event.
   */
  const startMarquee = useCallback((e) => {
    console.log('[DEBUG] startMarquee called on mouse down.');
    // Prevent default text selection behavior immediately
     e.preventDefault();
     e.stopPropagation(); // Stop propagation so parent listeners don't interfere

    // Get container and verify
    const container = document.getElementById('tabletop-container');
    if (!container) {
      console.error('[DEBUG] Container not found for marquee.');
      return;
    }

    // Get container bounds
    const containerRect = container.getBoundingClientRect();

    // Store the starting position of the mouse in container coordinates
    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;

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

    // Add global mouse move/up listeners managed by this hook
    // Using { capture: true } to ensure they run before other handlers on the way down
    document.addEventListener('mousemove', handleMarqueeMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMarqueeMouseUp, { capture: true });

  }, [/* No dependencies needed for startMarquee itself, state/handlers are stable */]);


    // Handler for document mousemove during marquee
    const handleMarqueeMouseMove = useCallback((e) => {
        // Only process if marqueeState is active
        if (!marqueeState) return;

        // Prevent default text selection
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Update the current mouse position in container coordinates
        const currentX = e.clientX - marqueeState.containerRect.left;
        const currentY = e.clientY - marqueeState.containerRect.top;

        // Update marquee state - This will trigger Marquee component re-render
        // Use functional update form to ensure latest state is used
        setMarqueeState(prev => ({
            ...prev,
            currentX,
            currentY
        }));

    }, [marqueeState]); // Depend on marqueeState to access its values

    // Use useRef for the mouseup handler to avoid re-creating the handler function
    // every time marqueeState changes, which would cause issues with removing the listener.
    // The handler logic still needs to access the latest marqueeState, getTokens, etc.
    // This is a common pattern when global listeners need access to changing state/props.
    const handleMarqueeMouseUpRef = useRef(handleMarqueeMouseUp); // Ref for the stable handler identity
    useEffect(() => {
        // Update the ref whenever the actual handleMarqueeMouseUp logic changes
        handleMarqueeMouseUpRef.current = handleMarqueeMouseUp;
    }, [handleMarqueeMouseUp]); // Depend on the logic function


    // Handler for document mouseup during marquee
    // This function is memoized, but the Ref pattern above ensures the *listener* added/removed is stable.
    const handleMarqueeMouseUp = useCallback((e) => {
        // Access the latest marqueeState *via a ref* if needed outside the immediate closure,
        // but here it's fine as it's used when state is active.
        if (!marqueeState) return;

        // Prevent default
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Get the final marquee screen coordinates relative to the container
        const { startX, startY, currentX, currentY, containerRect } = marqueeState;

        // Calculate marquee bounding box (min/max screen coordinates relative to container)
        const marqueeMinXScreen = Math.min(startX, currentX);
        const marqueeMaxXScreen = Math.max(startX, currentX);
        const marqueeMinYScreen = Math.min(startY, currentY);
        const marqueeMaxYScreen = Math.max(startY, currentY);

        // Check which tokens intersect with the marquee rectangle
        const tokens = getTokens(); // Get current tokens from the provided function
        const intersectingTokenIds = new Set();

        tokens.forEach(token => {
            // Get token's screen position relative to the container.
            // Token's position is its center in grid coordinates.
            // Convert grid position to screen position: (gridPos * scale) + panOffset
            const tokenCenterXScreen = (token.position.x * scale) + position.x;
            const tokenCenterYScreen = (token.position.y * scale) + position.y;

            // Get token's screen bounds. Assuming token size is based on CSS .token width/height.
            // Better to get this from a constant or prop if possible, but 40px is in CSS.
            // A token's "hotspot" or click area might be slightly smaller than the visual.
            // Let's use the visual size (40px) as the bounding box dimensions.
            const tokenVisualSize = 40; // From CSS
            const tokenRadius = tokenVisualSize / 2; // Assuming tokens are round

            const tokenLeftScreen = tokenCenterXScreen - tokenRadius;
            const tokenRightScreen = tokenCenterXScreen + tokenRadius;
            const tokenTopScreen = tokenCenterYScreen - tokenRadius;
            const tokenBottomScreen = tokenCenterYScreen + tokenRadius;


            // Check for intersection between marquee rectangle and token bounding box (AABB intersection)
            // Intersection occurs if !(rectangle A is entirely to the right of rectangle B OR B is entirely to the right of A
            // OR A is entirely below B OR B is entirely below A)
            const intersects = !(
                marqueeMaxXScreen < tokenLeftScreen || // Marquee right edge is left of token left edge
                marqueeMinXScreen > tokenRightScreen || // Marquee left edge is right of token right edge
                marqueeMaxYScreen < tokenTopScreen || // Marquee bottom edge is above token top edge
                marqueeMinYScreen > tokenBottomScreen // Marquee top edge is below token bottom edge
            );


            if (intersects) {
                intersectingTokenIds.add(token.id);
            }
        });

        console.log('[DEBUG] Marquee selection complete. Intersecting tokens:', Array.from(intersectingTokenIds));

        // Update the selected tokens state using the additive flag from the mouse event (Shift key)
        // This now ADDS to selection if additive=true, instead of toggling.
        setSelectedIds(intersectingTokenIds, e.shiftKey);

        // Reset marquee state - This will remove the Marquee component
        setMarqueeState(null);
        setIsSelecting(false); // Reset selecting flag

        // Remove global listeners attached in startMarquee
        document.removeEventListener('mousemove', handleMarqueeMouseMove, { capture: true });
        document.removeEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true }); // Use the ref here!

    }, [marqueeState, getTokens, scale, position, setSelectedIds, handleMarqueeMouseMove]); // Depend on marqueeState, getTokens, scale, position, setSelectedIds, handleMarqueeMouseMove


  // Cleanup listeners when component unmounts, just in case mouseup didn't fire correctly
  // This effect runs once on mount and cleanup runs on unmount.
  // The listeners added in startMarquee are removed in handleMarqueeMouseUp.
  // This final cleanup is a safeguard.
  useEffect(() => {
      return () => {
          // Ensure global listeners are removed on unmount
           console.log('[DEBUG] useTokenSelection: Hook unmounting, cleaning up listeners.');
           document.removeEventListener('mousemove', handleMarqueeMouseMove, { capture: true });
           document.removeEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true }); // Use the ref!
           setMarqueeState(null); // Ensure marquee state is reset
           setIsSelecting(false);
      };
  }, [handleMarqueeMouseMove, handleMarqueeMouseUpRef]); // Depend on stable handler refs


  return {
    selectedTokenIds, // The Set of currently selected token IDs
    selectTokenId, // For single token selection/toggle
    clearSelection, // To clear all selections
    startMarquee, // Call this on mouse down for marquee
    marqueeState, // State to render the Marquee component (provides position/size)
    handleMarqueeMouseMove, // Expose to parent if parent attaches global mousemove listener
    handleMarqueeMouseUp, // Expose to parent if parent attaches global mouseup listener
    isSelecting, // Boolean flag indicating marquee is active
  };
}