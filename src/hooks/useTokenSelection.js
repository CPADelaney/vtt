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
  // marqueeState: null when not active, { startX: screenPx, startY: screenPx, currentX: screenPx, currentY: screenPx } when active
  const [marqueeState, setMarqueeState] = useState(null);


  const clearSelection = useCallback(() => {
    console.log('[DEBUG] Clearing selection.');
    setSelectedTokenIds(new Set());
    onSelectTokens?.(new Set(), false); // Notify parent if needed
  }, [onSelectTokens]); // Added onSelectTokens dependency

  const selectTokenId = useCallback((tokenId, additive = false) => {
    console.log('[DEBUG] Toggling selection for token:', { tokenId, additive });

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

      console.log('[DEBUG] New selection after toggle:', Array.from(newSet));
      onSelectTokens?.(newSet, additive); // Notify parent if needed

      return newSet;
    });
  }, [onSelectTokens]); // Added onSelectTokens dependency

  // This function is for setting the selection directly (e.g., after marquee)
  const setSelectedIds = useCallback((tokenIds, additive = false) => {
       console.log('[DEBUG] Setting selection:', { tokenIds: Array.from(tokenIds), additive });
        setSelectedTokenIds(prev => {
             let newSet;
             if (additive) {
                 newSet = new Set(prev);
                 tokenIds.forEach(id => {
                      if (newSet.has(id)) {
                          newSet.delete(id); // Toggle if already selected
                      } else {
                          newSet.add(id); // Add if not selected
                      }
                 });
             } else {
                 newSet = new Set(tokenIds); // Replace selection
             }
            onSelectTokens?.(newSet, additive); // Notify parent
            return newSet;
        });
  }, [onSelectTokens]);


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

    // Add global mouse move/up listeners managed by this hook
    document.addEventListener('mousemove', handleMarqueeMouseMove);
    document.addEventListener('mouseup', handleMarqueeMouseUp);

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
        setMarqueeState(prev => ({
            ...prev,
            currentX,
            currentY
        }));

    }, [marqueeState]); // Depend on marqueeState to access its values


    // Handler for document mouseup during marquee
    const handleMarqueeMouseUp = useCallback((e) => {
        // Only process if marqueeState is active
        if (!marqueeState) return;

        // Prevent default
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Get the final marquee screen coordinates relative to the container
        const { startX, startY, currentX, currentY, containerRect } = marqueeState;

        // Calculate marquee bounding box (min/max screen coordinates)
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

            // Get token's screen bounds. Assuming token size is fixed (e.g., 40px / 20px radius).
            // Get this from CSS or config, or pass as prop. Let's assume a token radius for now.
            const tokenRadius = 20; // Half of the default token size (40px)

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

        // Update the selected tokens state
        // Use shiftKey from the mouseup event for additive selection
        setSelectedIds(intersectingTokenIds, e.shiftKey);

        // Reset marquee state - This will remove the Marquee component
        setMarqueeState(null);

        // Remove global listeners
        document.removeEventListener('mousemove', handleMarqueeMouseMove);
        document.removeEventListener('mouseup', handleMarqueeMouseUp);

    }, [marqueeState, getTokens, scale, position, setSelectedIds, handleMarqueeMouseMove]); // Depend on marqueeState, getTokens, scale, position, setSelectedIds, handleMarqueeMouseMove


  // Cleanup listeners when marqueeState becomes null (effect runs on marqueeState change)
  // This is already handled at the end of handleMarqueeMouseUp, but this ensures cleanup
  // if the component unmounts while marquee is active.
  useEffect(() => {
      // No cleanup needed if marqueeState is null
      if (!marqueeState) return;

      // Cleanup function for this effect
      return () => {
          // If cleanup runs while marqueeState is still active, it means the component unmounted.
          // Remove the global listeners.
          if (marqueeState) {
               console.log('[DEBUG] useTokenSelection: Component unmounting while marquee active, cleaning up listeners.');
               document.removeEventListener('mousemove', handleMarqueeMouseMove);
               document.removeEventListener('mouseup', handleMarqueeMouseUp);
               // If the marquee element was created directly (removed DOM manipulation),
               // it would need removal here too. Now the rendering component handles it.
          }
      };
  }, [marqueeState, handleMarqueeMouseMove, handleMarqueeMouseUp]);


  return {
    selectedTokenIds,
    selectTokenId, // For single token selection toggle
    clearSelection,
    startMarquee, // Call this on mouse down for marquee
    marqueeState, // State to render the Marquee component
    // No need to return mouse move/up handlers for marquee, they are attached globally
    // internally by startMarquee.
  };
}