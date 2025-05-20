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
  // marqueeState: null when not active, { startX: containerRelPx, startY: containerRelPx, currentX: containerRelPx, currentY: containerRelPx, containerRect } when active
  const [marqueeState, setMarqueeState] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false); // State to indicate if a marquee selection is in progress

   // Refs for the actual listener functions. These need to be stable
   // so they can be added and removed correctly.
   const handleMarqueeMouseMoveRef = useRef();
   const handleMarqueeMouseUpRef = useRef();
   // Added a ref for cancelMarquee itself for potential use in cleanup
   const cancelMarqueeRef = useRef();


  // --- Selection Functions ---

  const clearSelection = useCallback(() => {
    console.log('[DEBUG] Clearing selection.');
    setSelectedTokenIds(new Set());
  }, [setSelectedTokenIds]); // Depend on the setter


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

            // React state setters handle deep comparison on the state value itself.
            // A new Set instance with the same content will trigger an update, which is what we want.
            return newSet;
        });
  }, [setSelectedTokenIds]); // setSelectedTokenIds is a stable setter, additive is an arg. Dependencies are correct ([]).


  // For single token click selection/toggle
  const selectTokenId = useCallback((tokenId, additive = false) => {
      console.log('[DEBUG] useTokenSelection: selectTokenId called for:', tokenId, { additive });
      setSelectedTokenIds(prev => {
          const newSet = new Set(prev);
          const wasSelected = newSet.has(tokenId);

          if (wasSelected) {
              if (additive) {
                  newSet.delete(tokenId);
                  console.log('[DEBUG] Toggling off token:', tokenId);
              } else {
                  // Already selected, non-additive click. No change to selection.
                  console.log('[DEBUG] Token already selected (non-additive), no change.');
                  return prev; // Return previous set for performance
              }
          } else {
              // Not selected, add it.
              newSet.add(tokenId);
              console.log('[DEBUG] Toggling on token:', tokenId);
          }

          // Only return the new set if a change actually occurred
          // (This check covers both additive toggling and non-additive replace scenarios)
          if (newSet.size === prev.size && Array.from(newSet).every(id => prev.has(id))) {
               // console.log('[DEBUG] Selection content unchanged, returning previous set.'); // Too verbose
               return prev; // Return previous set if content is identical
          }

          console.log('[DEBUG] Selection changed to:', Array.from(newSet));
          return newSet; // Return the new set if content changed
      });
  }, [setSelectedTokenIds]); // Dependency on the setter


   // --- Marquee Functions ---

  /**
    * Cancels the current marquee selection if active.
    * Removes global listeners and resets state.
    */
  const cancelMarquee = useCallback(() => {
      console.log('[DEBUG] useTokenSelection: Cancelling marquee.');
      // Check against the latest state using ref if needed in future, but direct state check is fine here
      if (isSelecting) { // Only if selecting is active
           // Remove global listeners (assuming they were added) using refs
           document.removeEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
           document.removeEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });

           // Reset state
           setMarqueeState(null);
           setIsSelecting(false);
           document.body.style.userSelect = ''; // Restore user select globally

            console.log('[DEBUG] useTokenSelection: Marquee cancelled, listeners removed, state reset.');
      }
  }, [isSelecting, setMarqueeState, setIsSelecting, handleMarqueeMouseMoveRef, handleMarqueeMouseUpRef]); // Depend on state, setters, refs

    // Handler for document mousemove during marquee
   const handleMarqueeMouseMove = useCallback((e) => {
        // Only process if marqueeState is active (access latest state via dependency)
        if (!marqueeState) return;

        // Prevent default text selection
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Use marqueeState directly for containerRect
        const { containerRect: initialContainerRect } = marqueeState;

         const container = document.getElementById('tabletop-container');
         if (!container || !initialContainerRect) {
             console.warn('[DEBUG] Marquee container or rect missing during mousemove.');
             // Call cancelMarquee using the stable ref
             cancelMarqueeRef.current?.(); // Use ref for stable call
             return;
         }

        // Get the latest position of the container on screen
        const containerRect = container.getBoundingClientRect();

        // Update the current mouse position relative to container's *initial* top-left
        // Note: If the container moves while dragging (e.g. parent pane resizing),
        // this calculation needs to account for the *initial* container position vs *current*.
        // Storing initial screen pos and using latest containerRect is one way.
        // A simpler way is to store initial mouse screen pos and calculate relative to *current* container rect.
        // Let's refine this: Store start mouse X/Y in SCREEN coords in startMarquee.
        // In move/up, use current mouse screen X/Y and calculate relative to current container rect.

        // Sticking to original model: start/current are relative to the container's *initial* top-left (stored in marqueeState.containerRect).
        // Calculate the mouse position relative to the initial container top-left
        const mouseScreenX = e.clientX;
        const mouseScreenY = e.clientY;

        const currentX = mouseScreenX - initialContainerRect.left;
        const currentY = mouseScreenY - initialContainerRect.top;


        // Update marquee state - This will trigger Marquee component re-render
        setMarqueeState(prev => ({
            ...prev,
            currentX,
            currentY
        }));

   }, [marqueeState, setMarqueeState]); // Depends on state and its setter (cancelMarqueeRef used implicitly)


    // Handler for document mouseup during marquee
   const handleMarqueeMouseUp = useCallback((e) => {
        // Only process if marqueeState is active (access latest state via dependency)
        if (!marqueeState) return;

        console.log('[DEBUG] useTokenSelection: handleMouseUp. Marquee ended.');

        // Prevent default
         e.preventDefault();
         e.stopPropagation(); // Stop propagation

        // Get marquee coordinates and containerRect from state
        const { startX, startY, currentX, currentY, containerRect: initialContainerRect } = marqueeState; // Get from state (access latest via dependency)

         const container = document.getElementById('tabletop-container');
         if (!container || !initialContainerRect) {
             console.warn('[DEBUG] Marquee container or rect missing during mouseup.');
              // Call cancelMarquee using the stable ref
             cancelMarqueeRef.current?.(); // Use ref for stable call
             return;
         }
         // Use the latest containerRect for screen coordinate calculations
         const currentContainerRect = container.getBoundingClientRect();


        // Calculate marquee bounding box in ABSOLUTE SCREEN coordinates
        // Marquee points (startX, startY, currentX, currentY) are relative to the *initial* container top-left (initialContainerRect).
        // To get absolute screen coordinates, add the *initial* container's top/left offset.
        const marqueeMinXAbs = Math.min(startX + initialContainerRect.left, currentX + initialContainerRect.left);
        const marqueeMaxXAbs = Math.max(startX + initialContainerRect.left, currentX + initialContainerRect.left);
        const marqueeMinYAbs = Math.min(startY + initialContainerRect.top, currentY + initialContainerRect.top);
        const marqueeMaxYAbs = Math.max(startY + initialContainerRect.top, currentY + initialContainerRect.top);


        // Get latest state/props (accessed via dependency)
        const currentTokens = getTokens();
        const currentScale = scale || 1;
        const currentPosition = position || { x: 0, y: 0 };
        const currentTokenSize = tokenSize || 40;

        // Check which tokens intersect with the marquee rectangle
        const intersectingTokenIds = new Set();
        // Calculate token visual radius scaled by current zoom
        const tokenRadiusScaled = (currentTokenSize / 2) * currentScale;


        currentTokens.forEach(token => {
            // Get token's center position in ABSOLUTE SCREEN coordinates.
            // Token's position is its center in grid coordinates (world space).
            // Convert grid position to absolute screen position: (gridPos * scale) + panOffset + containerOffset
            const tokenCenterXAbs = (token.position.x * currentScale) + currentPosition.x + currentContainerRect.left;
            const tokenCenterYAbs = (token.position.y * currentScale) + currentPosition.y + currentContainerRect.top;

             // Token's bounding box in ABSOLUTE SCREEN coordinates.
            const tokenLeftAbs = tokenCenterXAbs - tokenRadiusScaled;
            const tokenRightAbs = tokenCenterXAbs + tokenRadiusScaled;
            const tokenTopAbs = tokenCenterYAbs - tokenRadiusScaled;
            const tokenBottomAbs = tokenCenterYAbs + tokenRadiusScaled;


            // Check for intersection between marquee rectangle and token bounding box (AABB intersection)
            const intersects = !(
                marqueeMaxXAbs < tokenLeftAbs ||
                marqueeMinXAbs > tokenRightAbs ||
                marqueeMaxYAbs < tokenTopAbs ||
                marqueeMinYAbs > tokenBottomAbs
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
       marqueeState, // State variable (used for initial values like startX/Y, initialContainerRect)
       getTokens, scale, position, tokenSize, // Props (used for intersection calc)
       setSelectedIds, setMarqueeState, setIsSelecting, // Stable setters/callbacks
       handleMarqueeMouseMoveRef, handleMarqueeMouseUpRef, // Stable refs for listener cleanup
       cancelMarqueeRef // Added dependency for safety if it were used inside handleMouseUp
   ]); // Dependencies for handleMarqueeMouseUp

   // Effect to keep the handler refs updated with the latest memoized function instances
   useEffect(() => {
       handleMarqueeMouseMoveRef.current = handleMarqueeMouseMove;
   }, [handleMarqueeMouseMove]);

   useEffect(() => {
       handleMarqueeMouseUpRef.current = handleMarqueeMouseUp;
   }, [handleMarqueeMouseUp]);

    // Effect to keep the cancelMarquee ref updated
    useEffect(() => {
        cancelMarqueeRef.current = cancelMarquee;
    }, [cancelMarquee]);


  /**
   * Call this function from the tabletop's onMouseDown handler when a click
   * doesn't hit a token and isn't a right-click (pan/context menu), and
   * a drag threshold is met for marquee.
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

    // Store the starting position of the mouse relative to container's top-left
    const startX = startEvent.clientX - containerRect.left;
    const startY = startEvent.clientY - containerRect.top;

    console.log('[DEBUG] Marquee start position (container coords):', { startX, startY });

    // Set marquee state to activate mouse move/up listeners
    setMarqueeState({
      startX,
      startY,
      currentX: startX, // Current position starts the same
      currentY: startY,
      containerRect // Store container rect *at the start* of the marquee
    });
     setIsSelecting(true); // Set selecting flag

     // Prevent user selection globally while selecting
     document.body.style.userSelect = 'none';

    // Add global mouse move/up listeners managed by this hook
    // Using { capture: true } to ensure they run before bubbling handlers
    // Use the .current property of the handler refs
    document.addEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
    document.addEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });
    // Relying on VT's global Escape listener (defined by handleGlobalKeyDown) is simpler for cancellation.


  }, [setMarqueeState, setIsSelecting, handleMarqueeMouseMoveRef, handleMarqueeMouseUpRef]); // Depend on state setters and refs for listeners


  // Effect to clear selection if a selected token is deleted outside this hook's actions
  // (e.g., via Context Menu delete). This ensures the selection set stays valid.
  useEffect(() => {
       // Get the latest tokens list by calling the prop function
       const currentTokens = getTokens();
       const currentTokenIds = new Set(currentTokens.map(t => t.id));

       // Check if any token in the selection set no longer exists in the current tokens list
       const selectionNeedsCleanup = Array.from(selectedTokenIds).some(id => !currentTokenIds.has(id));

       if (selectionNeedsCleanup) {
            console.log('[DEBUG] useTokenSelection: Selected token(s) removed externally, cleaning up selection.');
            // Filter the selection set to only include existing tokens
            const newSelection = new Set(Array.from(selectedTokenIds).filter(id => currentTokenIds.has(id)));
            // Update selection state using the setter managed by this hook
            setSelectedTokenIds(newSelection);
       }
  }, [getTokens, selectedTokenIds, setSelectedTokenIds]); // Depend on getTokens, selectedTokenIds state, and its setter


  // Cleanup listeners when component unmounts, just in case mouseup didn't fire correctly
  useEffect(() => {
      return () => {
          console.log('[DEBUG] useTokenSelection: Hook unmounting, cleaning up listeners.');
          // Ensure global listeners are removed on unmount using the stable refs
           document.removeEventListener('mousemove', handleMarqueeMouseMoveRef.current, { capture: true });
           document.removeEventListener('mouseup', handleMarqueeMouseUpRef.current, { capture: true });
           // Add cleanup for any potential keydown listener attached by this hook itself (if implemented)
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
    // setSelectedTokenIds, // REMOVED: Not needed by parent and potentially related to ReferenceError
    cancelMarquee, // Expose the cancel function
  };
}