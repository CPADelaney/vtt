// src/components/VirtualTabletop.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Removed SplitPane import - layout handled by App.jsx
import _ from 'lodash';

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';
import { useAutoSave } from '../hooks/useAutoSave';
import { useStateWithHistory } from '../hooks/useStateWithHistory';
import { useZoomToMouse } from '../hooks/useZoomToMouse';
import { useDiceManager } from '../hooks/useDiceManager'; // Needed for Sidebar - although Sidebar is not rendered here
import { useSystemManager } from '../hooks/useSystemManager'; // Needed for Sidebar - although Sidebar is not rendered here

// Components
import { ZoomableContainer } from './ZoomableContainer';
import { Grid } from './Grid';
import { Token } from './Token';
import { Controls } from './Controls';
import { Ping } from './Ping';
import { Marquee } from './Marquee'; // Use dedicated Marquee file
import { Sidebar } from './Sidebar'; // Import Sidebar - Note: Sidebar is rendered by App.jsx's SplitPane, not here.
import { ContextMenu } from './ContextMenu'; // Import ContextMenu
import '../../css/styles.css'; // Corrected import path for VirtualTabletop.jsx

// Constants
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 0.1;
const DEFAULT_SQUARE_SIZE = 50;
const DEFAULT_HEX_SIZE = 30;
const DRAG_THRESHOLD = 5; // Pixels mouse must move to cancel ping/start drag/marquee
const TOKEN_VISUAL_SIZE = 40; // Matches CSS .token width/height


// VirtualTabletop component is now responsible for managing its state
// and rendering itself along with related UI elements like Sidebar and Controls.
export default function VirtualTabletop() { // Removed props isHexGrid, onToggleGrid, inCombat, onToggleCombat

  // Refs to hold current state values for use in event handlers without triggering effect re-runs
  // These are crucial for global event listeners attached once and accessing latest state
  const scaleRef = useRef(null);
  const positionRef = useRef(null);
  const selectedTokenIdsRef = useRef(null); // Add ref for selected tokens
  // Add other refs for state values accessed in callbacks (isHexGrid, inCombat etc if needed in global handlers)


  // 1) Single Source of Truth & History
  // gameState now includes isHexGrid and inCombat
  const [gameState, setGameState, updateGameState, undoGameState, historyInfo] = useStateWithHistory({
    isHexGrid: false, // Default initial value
    inCombat: false, // Default initial value
    tokens: [],
    scale: 1, // Initial scale
    position: { x: 0, y: 0 }, // Initial position
    // Add other global state here (initiative, turn, etc.)
  }, {
    maxHistory: 50,
    onUndo: (prevState) => {
       console.log('[DEBUG] Undid to state:', prevState);
       // Apply the full state directly (includes scale/position, isHexGrid, inCombat, tokens etc.)
       // setGameState directly is safe here as it's within the hook's undo logic
       setGameState(prevState);
    },
    onRedo: (nextState) => {
       console.log('[DEBUG] Redid to state:', nextState);
       // Apply the full state directly
       setGameState(nextState);
    }
  });

  // Destructure relevant state directly from gameState
  const { tokens, scale, position, isHexGrid, inCombat } = gameState;

  // setDirectState bypasses history, useful for ephemeral changes like pan/zoom/intermediate drag
  const setDirectState = setGameState; // Alias for clarity

  // Update refs whenever the corresponding state changes
  useEffect(() => {
      scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
      positionRef.current = position;
  }, [position]);


  // Callbacks to toggle grid type and combat status, updating gameState
  // These are passed to the Sidebar (although sidebar prop passing from App is not fully functional yet)
  const onToggleGrid = useCallback(() => {
    updateGameState(prev => ({ ...prev, isHexGrid: !prev.isHexGrid }));
  }, [updateGameState]);

  const onToggleCombat = useCallback(() => {
    updateGameState(prev => ({ ...prev, inCombat: !prev.inCombat }));
  }, [updateGameState]);


  // 2) Load & Save from campaignManager
  const { saveState, loadState } = useCampaignManager('default-campaign');

  const initialLoadDoneRef = useRef(false);

  // Load entire state on mount
  useEffect(() => {
    if (initialLoadDoneRef.current) return;

    console.log('[DEBUG] Loading campaign state on mount...');
    const loaded = loadState();
    if (loaded) {
      console.log('[DEBUG] Loaded fullState:', loaded);
      // Use setGameState directly to load the state without adding to undo history
      setGameState(loaded); // Loading should replace the initial state completely
      initialLoadDoneRef.current = true;
    } else {
      console.log('[DEBUG] No saved state found... using defaults');
      initialLoadDoneRef.current = true;
    }
  }, [loadState, setGameState]); // Depend on loadState and setGameState


  // Auto-save entire gameState, debounced 2s
  useAutoSave(gameState, saveState, 2000);

  // Debug watchers (optional, remove for production)
  const prevGameStateRef = useRef(gameState);
  useEffect(() => {
    const prevState = prevGameStateRef.current;
    // Perform shallow comparisons first for performance
    if (prevState.tokens !== tokens || prevState.scale !== scale || prevState.position !== position ||
        prevState.isHexGrid !== isHexGrid || prevState.inCombat !== inCombat) {
         console.log('[DEBUG] Game state updated:', {
             tokensCount: tokens.length,
             scale,
             position,
             isHexGrid,
             inCombat,
         });
     }
     // Deep comparison only if necessary for specific debugging
     // if (!_.isEqual(prevState.tokens, tokens)) {
     //    console.log('[DEBUG] Tokens content changed.');
     // }

     prevGameStateRef.current = gameState; // Keep ref updated
  }, [gameState]); // Depend on the gameState object itself (shallow comparison by React)


  // Grid config (useMemo is good here)
  const gridConfig = useMemo(() => ({
    squareSize: DEFAULT_SQUARE_SIZE,
    hexSize: DEFAULT_HEX_SIZE,
    hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    hexHeight: DEFAULT_HEX_SIZE * 2
  }), []);

  // Grid snapping hook - depends on gameState.isHexGrid
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid: isHexGrid, // Use state value
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
  });

  // Dimensions for dynamic grid layout based on window size and grid type
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  // Debounced grid dimension update - depends on grid type state and grid config
  const updateGridDimensions = useMemo(() => _.debounce(() => {
    const container = document.getElementById('tabletop-container');
    if (!container) {
        console.warn('[DEBUG] #tabletop-container not found for dimension update.');
        return;
    }
    // Use offsetWidth/offsetHeight which include padding/border
    const vw = container.offsetWidth;
    const vh = container.offsetHeight;

    // Calculate dimensions based on current grid type and container size
    const currentIsHexGrid = gameState.isHexGrid; // Access current state value
    const currentGridConfig = gridConfig; // Access current config

    if (currentIsHexGrid) {
      const effHeight = currentGridConfig.hexHeight * 0.75;
      setDimensions({
        // Add extra rows/cols for panning beyond initial view
        rows: Math.ceil(vh / effHeight) + 5,
        cols: Math.ceil(vw / currentGridConfig.hexWidth) + 5
      });
    } else {
      setDimensions({
        // Add extra rows/cols for panning beyond initial view
        rows: Math.ceil(vh / currentGridConfig.squareSize) + 5,
        cols: Math.ceil(vw / currentGridConfig.squareSize) + 5
      });
     console.log('[DEBUG] Grid dimensions updated based on container:', { vw, vh, isHexGrid: currentIsHexGrid, currentDimensions: dimensions });
    }
  }, 200), [gridConfig, gameState.isHexGrid, dimensions]); // Depend on grid config, isHexGrid state value, and dimensions state


  // Effect to update grid dimensions on mount and resize, and grid type state change
  useEffect(() => {
    console.log('[DEBUG] Attaching resize listener...');
    updateGridDimensions(); // Initial call
    window.addEventListener('resize', updateGridDimensions);

    return () => {
      console.log('[DEBUG] Removing resize listener...');
      updateGridDimensions.cancel(); // Cancel any pending debounced calls
      window.removeEventListener('resize', updateGridDimensions);
    };
  }, [updateGridDimensions]); // Depend only on the memoized function


  // Calculate total grid size for ZoomableContainer - depends on dimensions state
  const { totalWidth, totalHeight } = useMemo(() => {
    // Use latest dimensions state here
    const currentCols = dimensions.cols > 0 ? dimensions.cols : 100; // Fallback
    const currentRows = dimensions.rows > 0 ? dimensions.rows : 100; // Fallback

    if (isHexGrid) { // Use state value
       // Account for the extra height from the last row's full hex height
       const finalHeight = (currentRows - 1) * (gridConfig.hexHeight * 0.75) + gridConfig.hexHeight;
       return {
        totalWidth: currentCols * gridConfig.hexWidth, // Simplified, might need adjustment for hex edge
        totalHeight: finalHeight,
      };
    } else {
      return {
        totalWidth: currentCols * gridConfig.squareSize,
        totalHeight: currentRows * gridConfig.squareSize,
      };
    }
  }, [dimensions, isHexGrid, gridConfig]); // Depend on dimensions, isHexGrid state value, and config


// Token drag hook - Expose `isDragging` state
const { startDrag, isDragging } = useTokenDrag({
  scale: scale, // Pass current scale from state
  getSnappedPosition, // Pass the snapping function
  // onDragMove and onDragEnd update gameState directly using setDirectState/updateGameState
  onDragMove: useCallback((tokenId, newPos) => {
     // Callback receives snapped position, update state directly (no history)
     // Ensure position structure is consistent {x, y}
     setDirectState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
            t.id === tokenId ? { ...t, position: { x: newPos.x, y: newPos.y } } : t
        )
     }));
  }, [setDirectState]), // Depend on setDirectState

  onDragEnd: useCallback((tokenIds, finalPositions) => { // onDragEnd now receives map/array of {id, pos}
      console.log('[DEBUG] VirtualTabletop: onDragEnd called with final positions:', Array.from(finalPositions.entries()));
    // Callback receives final snapped position, update state (adds to history)
     if (finalPositions.size > 0) {
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t => {
             const finalPos = finalPositions.get(t.id);
             // Only update tokens that were dragged
             return finalPos ? { ...t, position: { x: finalPos.x, y: finalPos.y } } : t;
        })
      }));
    } else {
         console.log('[DEBUG] VirtualTabletop: onDragEnd called with no token final positions.');
    }
  }, [updateGameState]) // Depend on updateGameState
});


  // Token selection hook - Expose `isSelecting` state and selection methods
  const {
      selectedTokenIds,
      selectTokenId, // <<< Need this function
      clearSelection, // <<< Need this function
      startMarquee,
      isSelecting, // Expose isSelecting flag from hook state
      setSelectedTokenIds, // Needed for cleanup effect within VT
      cancelMarquee, // Added cancelMarquee from useTokenSelection
    } = useTokenSelection({
    getTokens: useCallback(() => gameState.tokens, [gameState.tokens]), // Pass function to get tokens
    scale, // Pass scale from state
    position, // Pass position from state
    tokenSize: TOKEN_VISUAL_SIZE // Pass the token size constant
  });

  // Update ref whenever selectedTokenIds state changes
  useEffect(() => {
      selectedTokenIdsRef.current = selectedTokenIds;
  }, [selectedTokenIds]);


  // Effect to clear selection if a selected token is deleted via context menu
  // The onDeleteTokens callback below modifies gameState, which triggers this effect.
  // This is a safeguard; ideally, selection hook should handle this based on token list changes.
  useEffect(() => {
       const currentTokenIds = new Set(tokens.map(t => t.id));
       const selectionNeedsCleanup = Array.from(selectedTokenIds).some(id => !currentTokenIds.has(id));

       if (selectionNeedsCleanup) {
            console.log('[DEBUG] Selected token(s) removed, cleaning up selection.');
            const newSelection = new Set(Array.from(selectedTokenIds).filter(id => currentTokenIds.has(id)));
             // Use the state setter from useTokenSelection (which should be stable)
             // Assuming setSelectedTokenIds is returned by useTokenSelection. Let's check useTokenSelection.js - yes it is.
            setSelectedTokenIds(newSelection);
       }
  }, [tokens, selectedTokenIds, setSelectedTokenIds]); // Depend on tokens list, selectedTokenIds state, and its setter


  // Context menu hook - Pass callbacks that update gameState
  const { menuState, showMenu, hideMenu } = useContextMenu({}); // Callbacks are now passed to the ContextMenu component directly


    // --- Handlers for Context Menu actions ---
    // These are defined here because they modify gameState
    const handleAddToken = useCallback((gridCoords) => {
      console.log('[DEBUG] Adding token at grid coords:', gridCoords);

      updateGameState(prev => ({
        ...prev,
        tokens: [
          ...prev.tokens,
          {
            id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            position: getSnappedPosition(gridCoords.x, gridCoords.y), // Snap the exact grid coords
            stats: { hp: 100, maxHp: 100, name: 'New Token' }, // Example stats
            color: '#3498db', // Default blue color
            size: TOKEN_VISUAL_SIZE // Store size if needed for hit detection etc.
          }
        ]
      }));
    }, [getSnappedPosition, updateGameState]); // Depend on getSnappedPosition and updateGameState

    const handleDeleteTokens = useCallback((tokenIds) => {
      console.log('[DEBUG] Deleting tokens', Array.from(tokenIds));
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.filter(t => !tokenIds.includes(t.id)) // Filter based on passed IDs
      }));
      clearSelection(); // Clear selection of deleted tokens
    }, [updateGameState, clearSelection]); // Depend on updateGameState and clearSelection


  // PING LOGIC
  const [pings, setPings] = useState([]);
  const playerColor = '#ff0066'; // Example color

  const createPing = useCallback((screenX, screenY) => {
      const container = document.getElementById('tabletop-container');
      if (!container) {
          console.warn('[DEBUG] Container not found for ping coordinate calculation.');
          return;
      }
      const containerRect = container.getBoundingClientRect();

      // Convert screen coords relative to viewport to screen coords relative to container
      const containerRelX = screenX - containerRect.left;
      const containerRelY = screenY - containerRect.top;

      // Store ping position in container coordinates (relative to container top-left)
      // Ping component will handle positioning based on this
      const newPing = { id: Date.now() + Math.random(), x: containerRelX, y: containerRelY, color: playerColor };
      setPings(prev => [...prev, newPing]);
      // Ping component itself will handle the removal via its onComplete prop
  }, [playerColor]);


  // --- Global Mouse Event Handling on Document (for drag/marquee threshold) ---
  // These handlers are attached on the initial mousedown and removed on mouseup
  // regardless of where the mouse moves, to track drag/marquee start.

  const initialMouseDownPosRef = useRef(null); // Store screen position at mouse down { clientX, clientY, target, clickedTokenId, isAdditiveSelection }
  const interactionStartedRef = useRef(false); // Flag if a drag or marquee has started

  // Define handlers using useCallback to get stable references for add/removeEventListener
   const handleGlobalMouseMove = useCallback((e) => {
        // Only process if a potential interaction was initiated and no interaction has started yet
        const initialPos = initialMouseDownPosRef.current;
        if (!initialPos || interactionStartedRef.current) return; // Only check threshold if no interaction started

        const { clientX: startX, clientY: startY, target: startTarget, clickedTokenId, isAdditiveSelection } = initialPos;
        const currentX = e.clientX;
        const currentY = e.clientY;

        const dx = currentX - startX;
        const dy = currentY - startY;
        const distance = Math.sqrt(dx*dx + dy*dy);

        // If mouse moved beyond threshold
        if (distance > DRAG_THRESHOLD) {
            console.log('[DEBUG] Mouse moved significantly, initiating drag/marquee check.');
            interactionStartedRef.current = true; // Mark interaction started

            // Check if the initial mousedown target was a token
            if (clickedTokenId) {
                // It started on a token, initiate token drag
                 console.log('[DEBUG] Starting token drag via mousemove threshold.');
                 // Pass the currently *selected* tokens to useTokenDrag.
                 // IMPORTANT: Access the LATEST `selectedTokenIds` state via its ref
                 const tokensToDrag = tokens.filter(t => selectedTokenIdsRef.current.has(t.id)); // Use ref here!

                 if (tokensToDrag.length === 0) {
                     // This edge case could happen if the clicked token ID is stale in state, or other bugs
                     console.warn('[DEBUG] No selected tokens found for drag start, cancelling interaction.');
                      // Clean up and stop the tracking listeners
                     initialMouseDownPosRef.current = null;
                     interactionStartedRef.current = false;
                     // These handlers are attached in handleMouseDown
                     document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
                     document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
                     // Note: Keydown listener cleanup is handled by its own effect or handler
                     return;
                 }
                 // Start the drag using the hook's startDrag function
                 startDrag(tokensToDrag, e); // startDrag takes tokens array and event

                 // Now that an interaction (drag) has definitely started, prevent defaults/propagation
                  e.preventDefault();
                  e.stopPropagation();

            } else {
                // It started on the background, initiate marquee selection
                 console.log('[DEBUG] Starting marquee selection via mousemove threshold.');
                 // Start the marquee using the hook's startMarquee function
                 startMarquee({ // Pass screen coordinates directly to startMarquee
                     clientX: startX,
                     clientY: startY,
                     shiftKey: isAdditiveSelection // Pass shift/additive state
                 });
                  // Now that an interaction (marquee) has definitely started, prevent defaults/propagation
                  e.preventDefault(); // Prevent default browser selection box
                  e.stopPropagation(); // Stop propagation
            }
        }
        // If an interaction *has* started (checked by the hooks' internal listeners),
        // prevent default browser behavior (like text selection) during the interaction.
        // Hooks' internal mousemove handlers should be doing this, but adding defensively.
        if (isDragging || isSelecting) { // Check state flags from hooks
             e.preventDefault();
             e.stopPropagation();
        }


   }, [
       tokens, // Used to filter tokensToDrag
       selectedTokenIdsRef, // Used to access latest selection state
       startDrag, // Hook callback
       startMarquee, // Hook callback
       isDragging, // State flag from hook
       isSelecting, // State flag from hook
       // Dependencies needed for recursive call in cleanup (removed, cleanup is explicit now)
       // Dependencies needed for logic (removed, accessed via ref/state)
   ]); // Dependencies for handleGlobalMouseMove


    const handleGlobalMouseUp = useCallback((e) => {
        console.log('[DEBUG-TABLETOP] handleGlobalMouseUp:', {
          button: e.button,
          target: e.target,
          defaultPrevented: e.defaultPrevented,
          className: e.target.className,
          id: e.target.id,
          isDragging: isDragging, // State from hook
          isSelecting: isSelecting, // State from hook
          interactionStarted: interactionStartedRef.current // Flag from ref
        });

        // Remove the temporary global listeners attached in handleMouseDown
        // Use a slight delay to ensure any hook mouseup logic runs first
        setTimeout(() => {
            document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true }); // Use stable ref
            document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });   // Use stable ref
            // Note: Keydown listener is managed by a separate effect or hook
             console.log('[DEBUG] Removed temporary global mousemove/mouseup listeners.');

            // Clean up local refs related to the interaction cycle
            initialMouseDownPosRef.current = null;
            interactionStartedRef.current = false; // Reset the flag
             console.log('[DEBUG] Cleared interaction refs.');

        }, 0); // Delay allows other mouseup listeners to run

        const initialPos = initialMouseDownPosRef.current; // Note: This might be null after the timeout if not careful, but accessed here before timeout
        // If initial mousedown happened AND NO drag or marquee started during this interaction cycle
        if (initialPos && !interactionStartedRef.current) {
             console.log('[DEBUG] MouseUp detected as a click (no drag/marquee started based on threshold).');

             const { clientX: startX, clientY: startY, clickedTokenId, isAdditiveSelection } = initialPos;
              const currentX = e.clientX; // Use final mouse position for click location
              const currentY = e.clientY;

             // Check if the click was on a token
             if (clickedTokenId) {
                // It was a click on a token. Selection was already handled in handleMouseDown.
                console.log('[DEBUG] Token click finalized (selection handled).');
                // No further action needed here other than cleanup handled by the timeout.
                // Prevent default/stop propagation for the handled click event
                e.preventDefault();
                e.stopPropagation();

             } else {
                // It was a click on the background (no token, no drag/marquee started)
                console.log('[DEBUG] Background click finalized. Creating ping.');
                // Prevent default/stop propagation for the handled click event
                e.preventDefault();
                e.stopPropagation();

                // Create a ping at the *final* mouse up screen coordinates
                createPing(currentX, currentY); // Use stable ref or dependency
             }
        } else {
            // If initial mousedown happened and a drag/marquee *did* start, the hook's mouseup handler took over.
            console.log('[DEBUG] MouseUp handled by hook (drag/marquee completed).');
            // The hook's mouseup handler should have already handled state updates and its own listener cleanup.
            // Ensure preventDefault/stopPropagation runs for the event that ended the interaction.
             if (interactionStartedRef.current || isDragging || isSelecting) {
                 e.preventDefault();
                 e.stopPropagation();
             }
        }
    }, [
        createPing, // Callback needed
        isDragging, // State flag from hook
        isSelecting, // State flag from hook
        // Dependencies for recursive call in cleanup (removed, cleanup is explicit now)
    ]); // Dependencies for handleGlobalMouseUp


    // Define a global keydown handler for cancelling interactions (Escape key)
    const handleGlobalKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
             console.log('[DEBUG] Escape key pressed globally in VT.');
             // Check if any interaction that can be cancelled is currently active
             if (isDragging) { // Check drag state from hook
                 console.log('[DEBUG] Drag active, useTokenDrag should handle Escape.');
                 // useTokenDrag hook attaches its OWN Escape handler during drag.
                 // We rely on it handling the Escape key and its own cleanup.
             } else if (isSelecting) { // Check selecting state from hook
                 console.log('[DEBUG] Marquee active, cancelling via useTokenSelection.');
                 e.preventDefault();
                 e.stopPropagation(); // Stop propagation

                  // Call the cancel function exposed by useTokenSelection
                 cancelMarquee(); // <<< Use stable hook function

                 // Also clean up VT's local interaction state/listeners
                 // This is needed because the marquee mousemove/mouseup are global,
                 // and the keydown needs to also stop the process initiated by mousedown.
                 // (Although cancelMarquee also removes its move/up listeners, VT's mousedown also added them)
                 if (initialMouseDownPosRef.current || interactionStartedRef.current) {
                     initialMouseDownPosRef.current = null;
                     interactionStartedRef.current = false;
                     // Remove the temporary mouse listeners added in handleMouseDown
                     document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
                     document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
                     console.log('[DEBUG] Cleared interaction refs and removed temporary mouse listeners.');
                 }

             }
             // If neither isDragging nor isSelecting, let the Escape event propagate for other uses.
        }
    }, [
        isDragging, // State flag from hook
        isSelecting, // State flag from hook
        cancelMarquee, // Stable hook function
         handleGlobalMouseMove, // Needed for cleanup listener
         handleGlobalMouseUp, // Needed for cleanup listener
    ]); // Dependencies for handleGlobalKeyDown


  // --- Unified Mouse Event Handling on Tabletop (#tabletop div) ---
  // This handler attaches global mousemove/mouseup/keydown listeners to track the interaction.
  // ZoomableContainer handles primary pan/zoom (left/middle click drag on background)
  // and right-click context menu triggering.
  // This handler focuses on interactions that *start* on the tabletop div itself
  // (tokens or background) and require more specific logic than just pan/zoom.

  const handleMouseDown = useCallback((e) => {
    console.log('[DEBUG-TABLETOP] handleMouseDown on #tabletop:', {
      button: e.button,
      target: e.target,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      defaultPrevented: e.defaultPrevented,
      className: e.target.className,
      id: e.target.id,
      isDragging: isDragging, // State from hook
      isSelecting: isSelecting, // State from hook
    });

    // Ignore right-clicks (button 2) - ZoomableContainer handles these for context menu
    if (e.button === 2) {
         hideMenu(); // Ensure our context menu is hidden on any right mousedown
         // Let ZoomableContainer handle the rest for context menu
         return;
    }

    // Ignore middle-clicks (button 1) - ZoomableContainer handles middle-click pan
    if (e.button === 1) {
        // Let ZoomableContainer handle middle-click pan
        return;
    }

    // --- Handle Left Clicks (button 0) ---
    hideMenu(); // Hide context menu on any left mouse down

    const tokenEl = e.target.closest('.token');
    const clickedTokenId = tokenEl?.id || null;
    const isAdditiveSelection = e.metaKey || e.ctrlKey || e.shiftKey; // Check modifiers for additive selection

    // Store initial mouse position and context for threshold check and event handling
    initialMouseDownPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      target: e.target, // The element where mousedown occurred
      clickedTokenId: clickedTokenId,
      isAdditiveSelection: isAdditiveSelection,
    };
     // Reset interaction started flag
    interactionStartedRef.current = false;

    // If clicked on a token, handle selection logic immediately
    if (clickedTokenId) {
        console.log('[DEBUG] Mousedown on token:', clickedTokenId);
        // Prevent default browser drag on token images etc.
        e.preventDefault();
        // Do NOT stop propagation yet. Let the global mousemove handler below check threshold for drag.
        // The global handler attached by startDrag will stop propagation if drag starts.

        // Handle selection update on token click
        // If not additive, clear existing selection first
        if (!isAdditiveSelection) {
            clearSelection(); // <<< This uses the stable hook function
        }
        // Always select/toggle the clicked token
        selectTokenId(clickedTokenId, isAdditiveSelection); // <<< This uses the stable hook function
        // THIS IS LINE ~289 in the original file (line numbers shifted due to modifications)
    }

    // Attach global listeners *immediately* on mousedown to track movement for threshold check
    // Use the .current property of the handler refs or the useCallback results directly if stable.
    // handleGlobalMouseMove and handleGlobalMouseUp are useCallback results, they are stable refs.
    document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
    document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });
    // Keydown listener is managed by a separate effect based on interaction flags.


  }, [ // <-- Dependency array for handleMouseDown
      hideMenu, // Used directly
      clearSelection, // Stable hook function
      selectTokenId, // Stable hook function
      startDrag, // Stable hook function
      startMarquee, // Stable hook function
      isDragging, // Used directly
      isSelecting, // Used directly
      handleGlobalMouseMove, // Callback ref (stable)
      handleGlobalMouseUp, // Callback ref (stable)
       // tokens, selectedTokenIdsRef are used *inside* the attached handleGlobalMouseMove
       // but handleGlobalMouseMove is a useCallback with its own dependencies/refs,
       // so VT's handleMouseDown does not need to depend on them directly.
  ]); // Closing parenthesis follows bracket


   // Attach the global Escape listener ONLY when an interaction might be cancellable
   // This listener calls handleGlobalKeyDown which checks isSelecting and calls cancelMarquee.
  useEffect(() => {
      // Check if any interaction that can be cancelled by Escape is currently active
      // Currently, only marquee cancellation is handled by VT's handleGlobalKeyDown.
      // Drag cancellation is handled internally by useTokenDrag's own keydown listener.
      const isAnyCancellableInteractionActive = isSelecting;

      if (isAnyCancellableInteractionActive) {
          console.log('[DEBUG] Attaching global Escape listener for marquee.');
           // Use the stable reference to the handler
           document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
      } else {
           console.log('[DEBUG] Removing global Escape listener for marquee.');
            // Use the stable reference to the handler
           document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      }

      // Cleanup: Always ensure listener is removed on unmount
      return () => {
           console.log('[DEBUG] VirtualTabletop unmounting, removing global Escape listener.');
            // Use the stable reference to the handler
           document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
      };
  }, [isSelecting, handleGlobalKeyDown]); // Re-run when isSelecting flag changes OR the handleGlobalKeyDown handler reference changes (which happens if its dependencies change)


   // Right-click handler for context menu - Called by ZoomableContainer's onContextMenu prop
  const handleContextMenu = useCallback((e) => {
      console.log('[DEBUG-TABLETOP] ContextMenu event from ZoomableContainer:', {
          target: e.target,
          className: e.target.className,
          id: e.target.id,
          defaultPrevented: e.defaultPrevented,
          button: e.button,
      });

    // ZoomableContainer already prevented default browser menu if it didn't pan.
    // We just need to determine the context and show our custom menu.
    e.stopPropagation(); // Stop propagation to prevent other context menu listeners

    const tokenEl = e.target.closest('.token');
    const contextType = tokenEl ? 'token' : 'grid';

    let options = { type: contextType };

    // Access latest selected tokens state via ref
    const currentSelectedTokenIds = selectedTokenIdsRef.current;

    if (contextType === 'token' && tokenEl) {
        const clickedTokenId = tokenEl.id;
        // If right-clicked token is *already* in the current selection, offer actions on the *entire selection*.
        // Otherwise, select only this token and offer actions on just this one.
        const tokenIdsToOperateOn = currentSelectedTokenIds?.has(clickedTokenId) ? Array.from(currentSelectedTokenIds) : [clickedTokenId];

        // Ensure the clicked token is selected if it wasn't already or if not additive.
        // This selection update happens *before* the menu is shown.
        if (!(currentSelectedTokenIds?.has(clickedTokenId)) || (currentSelectedTokenIds?.size ?? 0) > 1) {
             // If the clicked token is not in the selection, OR if multiple tokens are selected
             // and the click is on just one, clear and select only the clicked one.
             // This is common behavior: single right-click on a token focuses the action on it,
             // unless the right-click is part of a multi-selection action.
             // Let's simplify: If you right-click a selected token, act on selection. If you right-click
             // an *unselected* token, select it and act on it.
             if (!currentSelectedTokenIds?.has(clickedTokenId)) { // Use ref
                 clearSelection(); // Clear existing
                 selectTokenId(clickedTokenId, false); // Select just this one non-additively
             }
             // The tokenIdsToOperateOn logic above already determines whether to act on the single token or the selection.
             // The selection state change here ensures the UI *shows* the correct selection before the menu opens.
        }
         // If the clicked token WAS already selected and it was the only one selected, no selection change needed.

        options.tokenIds = tokenIdsToOperateOn; // Pass the relevant ID(s) to the menu state

    } else if (contextType === 'grid') {
         // If right-clicked on grid background, clear selection
         clearSelection();

         // Pass grid coordinates to the menu handler for "Add Token"
         const container = document.getElementById('tabletop-container');
         const containerRect = container.getBoundingClientRect();

         // Convert screen coordinates to grid coordinates relative to grid origin (0,0)
          const screenX = e.clientX - containerRect.left;
          const screenY = e.clientY - containerRect.top;
          // Access latest position and scale via refs
          const currentScale = scaleRef.current || 1;
          const currentPosition = positionRef.current || { x: 0, y: 0 };

          const gridX = (screenX - currentPosition.x) / currentScale;
          const gridY = (screenY - currentPosition.y) / currentScale;

          options.gridCoords = { x: gridX, y: gridY };
    }

    console.log('[DEBUG] Showing context menu, type:', contextType, 'Options:', options);
    // Pass event directly so context menu hook can get screen position
    showMenu(e, options);

  }, [
      showMenu, clearSelection, selectTokenId,
      // Dependencies needed for calculations/logic inside:
      // scale, position, selectedTokenIds are now accessed via refs.
      // Need callbacks as dependencies:
      selectedTokenIdsRef, scaleRef, positionRef // Add refs here
   ]);


   // Handlers for zoom buttons (passed to Controls component)
   // These are handled by the useZoomToMouse hook now, exposed via handleZoomButtons
   const { handleWheel, handleZoomButtons } = useZoomToMouse({
       containerId: "tabletop-container",
       scale,
       position,
       setScale: newScale => setDirectState(prev => ({ ...prev, scale: newScale })),
       setPosition: newPosition => setDirectState(prev => ({ ...prev, position: newPosition })),
       minScale: MIN_SCALE,
       maxScale: MAX_SCALE,
       zoomFactor: ZOOM_FACTOR,
       isPanDisabled: isDragging || isSelecting, // Pass the disabled flag
   });

   // Pass the button handlers down
   const handleZoomIn = useCallback(() => handleZoomButtons(1 + ZOOM_FACTOR * 2), [handleZoomButtons]);
   const handleZoomOut = useCallback(() => handleZoomButtons(1 - ZOOM_FACTOR * 2), [handleZoomButtons]);

   // Undo handler - exposed for sidebar button
   const handleUndo = useCallback(() => {
       console.log('[DEBUG] Calling undo...');
       undoGameState();
       // Clear selection after undo as state structure might have changed significantly
       clearSelection();
   }, [undoGameState, clearSelection]);


  // Cleanup initial mousedown ref and temporary global listeners on component unmount
  useEffect(() => {
      return () => {
          console.log('[DEBUG] VirtualTabletop unmounting, cleaning up global listeners and refs.');
          // Ensure temporary global mousemove/mouseup listeners added in handleMouseDown are removed
          document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true }); // Use stable ref
          document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });   // Use stable ref
           // Global Keydown listener cleanup handled by its own effect

          // Clear refs
          initialMouseDownPosRef.current = null;
          interactionStartedRef.current = false;
          updateGridDimensions.cancel(); // Cancel debounced function
      };
  }, [handleGlobalMouseMove, handleGlobalMouseUp, updateGridDimensions]); // Depend on memoized handlers and debounced function


  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Controls overlay (Zoom, Undo, etc.) - Positioned fixed or absolute within this wrapper */}
      <Controls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} /> {/* Undo handled by Sidebar */}

      {/* Sidebar is NOT rendered here to maintain App.jsx SplitPane structure */}
      {/* It will need state passed down from App.jsx */}
      {/* Note: The props expected by Sidebar (isHexGrid, inCombat, historyInfo, etc.) */}
      {/* are available here in VirtualTabletop's state/hook returns. Passing them */}
      {/* up to App and then down to Sidebar is the structural challenge. */}
      {/*
           // Conceptual Sidebar rendering here if App.jsx didn't use SplitPane:
           <Sidebar
               isHexGrid={isHexGrid}
               onToggleGrid={onToggleGrid}
               inCombat={inCombat}
               onToggleCombat={onToggleCombat}
               undoGameState={undoGameState}
               historyInfo={historyInfo}
               // Add other props like combat state, initiative, etc.
           />
        */}


      {/* The main container for panning and zooming */}
      <ZoomableContainer
        containerId="tabletop-container" // ID is important for hooks and internal logic
        scale={scale} // Pass scale from state
        position={position} // Pass position from state
        // ZoomableContainer updates scale/position directly using setDirectState
        setScale={newScale => setDirectState(prev => ({ ...prev, scale: newScale }))}
        setPosition={newPosition => setDirectState(prev => ({ ...prev, position: newPosition }))}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        zoomFactor={ZOOM_FACTOR}
        onContextMenu={handleContextMenu} // Context menu trigger from ZoomableContainer
        gridWidth={totalWidth} // Pass calculated grid size
        gridHeight={totalHeight} // Pass calculated grid size
        // useZoomToMouse hook handles wheel listener attachment internally if not passed via prop.
        // Let's pass it explicitly to make the flow clearer, although the hook already adds it.
        onWheel={handleWheel} // Pass wheel handler from hook

        // Pass isDragging/isSelecting to ZoomableContainer so it can disable pan
        // when a token drag or marquee is in progress.
         isPanDisabled={isDragging || isSelecting} // Disable pan if dragging or selecting
      >
        {/* Content INSIDE the zoomable container */}
        {/* Attach core mouse handlers to the tabletop div */}
        <div
          id="tabletop" // Give the content div the id expected by other components/hooks
          className={isHexGrid ? 'hex-grid' : 'square-grid'} // Use state value
          onMouseDown={handleMouseDown} // Our central mousedown handler
          // Global mousemove/mouseup/keydown are attached/managed by handlers/hooks
          style={{
            width: totalWidth,
            height: totalHeight,
            position: 'relative',
            // Cursor handled by useZoomToMouse hook during pan and useTokenDrag during drag
            // Pointer events might be controlled by ZoomableContainer during pan
            userSelect: 'none', // Already in CSS, but good practice here too
            MozUserSelect: 'none',
            WebkitUserSelect: 'none',
            msUserSelect: 'none',
            // Disable pointer events on the content *while dragging or selecting* via ZoomableContainer prop
             pointerEvents: 'auto', // Let mouse handlers determine behavior instead of blocking
          }}
        >
          {/* Grid layer */}
          <Grid
            isHexGrid={isHexGrid} // Use state value
            rows={dimensions.rows}
            cols={dimensions.cols}
            squareSize={gridConfig.squareSize}
            hexSize={gridConfig.hexSize}
            hexWidth={gridConfig.hexWidth}
            hexHeight={gridConfig.hexHeight}
          />

          {/* Tokens layer */}
          {tokens.map(token => (
            <Token
              key={token.id}
              id={token.id} // Pass id explicitly
              position={token.position} // Pass position
              stats={token.stats} // Pass stats
              color={token.color || '#3498db'} // Pass color, default if missing
              isSelected={selectedTokenIds.has(token.id)} // Check against selected set
              // Token's own click/mousedown handlers can be empty or just stop propagation
              // Mousedown on token is handled by VT's handleMouseDown using event delegation via closest('.token')
              // If token *did* have its own onMouseDown, it should e.stopPropagation() to prevent VT's handler
               onClick={(e) => e.stopPropagation()} // Ensure token click doesn't trigger background logic
               onDoubleClick={(e) => { e.stopPropagation(); /* Handle token double click, e.g., open sheet */ console.log('Double clicked token', token.id); }}
            />
          ))}

          {/* Pings layer */}
          {pings.map(ping => (
            <Ping
              key={ping.id}
              x={ping.x}
              y={ping.y}
              color={ping.color}
              onComplete={() => setPings(prev => prev.filter(p => p.id !== ping.id))} // Remove ping after animation
            />
          ))}

          {/* Other layers (map, drawing, etc.) would go here */}

        </div>
      </ZoomableContainer>

        {/* Marquee component, rendered if marqueeState is active */}
        {/* This component is rendered by the Marquee.jsx file */}
        <Marquee marqueeState={marqueeState} />

        {/* Context Menu component, rendered if menuState is active */}
        {/* This component is rendered using the definition above or imported */}
        {/* NOTE: The ContextMenu component is imported from './ContextMenu' at the top. */}
        <ContextMenu
             menuState={menuState}
             hideMenu={hideMenu} // Pass hide function from hook
             onAddToken={handleAddToken} // Pass the actual handler defined here
             onDeleteTokens={handleDeleteTokens} // Pass the actual handler defined here
        />

        {/* Sidebar is NOT rendered here to maintain App.jsx SplitPane structure */}
        {/* It will need state passed down from App.jsx */}
        {/* Note: The props expected by Sidebar (isHexGrid, inCombat, historyInfo, etc.) */}
        {/* are available here in VirtualTabletop's state/hook returns. Passing them */}
        {/* up to App and then down to Sidebar is the structural challenge. */}


    </div>
  );
}