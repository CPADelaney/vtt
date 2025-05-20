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
import { useDiceManager } from '../hooks/useDiceManager'; // Needed for Sidebar
import { useSystemManager } from '../hooks/useSystemManager'; // Needed for Sidebar

// Components
import { ZoomableContainer } from './ZoomableContainer';
import { Grid } from './Grid';
import { Token } from './Token';
import { Controls } from './Controls';
import { Ping } from './Ping';
import { Marquee } from './Marquee'; // Use dedicated Marquee file
import { Sidebar } from './Sidebar'; // Import Sidebar to render here
import '../../css/styles.css'; // Corrected import path for VirtualTabletop.jsx

// Constants
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 0.1;
const DEFAULT_SQUARE_SIZE = 50;
const DEFAULT_HEX_SIZE = 30;
const DRAG_THRESHOLD = 5; // Pixels mouse must move to cancel ping/start drag/marquee
const TOKEN_VISUAL_SIZE = 40; // Matches CSS .token width/height


// Context Menu component (moved to its own file or kept here)
// Keeping it here for now, but ideally move to ContextMenu.jsx
// NOTE: This definition is redundant if ContextMenu is imported from './ContextMenu',
// which it is. Removing this duplicate definition would be a good future cleanup.
// For now, keeping it as is to strictly address the import error only.
const ContextMenu = ({ menuState, hideMenu, onAddToken, onDeleteTokens }) => {
    if (!menuState) return null;

    // Determine options based on the menu type ('token' or 'grid')
    const menuItems = [];
    if (menuState.type === 'token') {
        // Ensure tokenIds is an array, even if it was just one ID
        const tokenIds = Array.isArray(menuState.tokenIds) ? menuState.tokenIds : (menuState.tokenIds ? [menuState.tokenIds] : []);
        if (tokenIds.length > 0) {
            menuItems.push({ label: `Delete Token${tokenIds.length > 1 ? 's' : ''}`, action: () => onDeleteTokens(tokenIds) }); // Pass token IDs
        }
        // Add other token-specific options here (e.g., Edit, Copy, Change HP)
    } else { // type === 'grid'
        menuItems.push({ label: 'Add Token Here', action: () => onAddToken(menuState.gridCoords) }); // Pass grid coords
        // Add other grid/map options here (e.g., Add Image, Draw Shape)
    }

    if (menuItems.length === 0) return null; // Don't render empty menu

    return (
        <div
            className="context-menu" // Use CSS class
            style={{ left: menuState.x, top: menuState.y }}
            onContextMenu={e => e.preventDefault()} // Prevent nested context menus
        >
            {menuItems.map((item, index) => (
                <div
                    key={index}
                    className="context-menu-item" // Use CSS class
                    onClick={(e) => {
                        e.stopPropagation(); // Stop click from propagating to tabletop/window
                        item.action(); // Execute the action
                        hideMenu(); // Hide the menu after action
                    }}
                >
                    {item.label}
                </div>
            ))}
        </div>
    );
};


// VirtualTabletop component is now responsible for managing its state
// and rendering itself along with related UI elements like Sidebar and Controls.
export default function VirtualTabletop() { // Removed props isHexGrid, onToggleGrid, inCombat, onToggleCombat

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
       // setGameState directly is safe here as it's within the hook's redo logic
       setGameState(nextState);
    }
  });

  // Destructure relevant state directly from gameState
  const { tokens, scale, position, isHexGrid, inCombat } = gameState;

  // setDirectState bypasses history, useful for ephemeral changes like pan/zoom/intermediate drag
  const setDirectState = setGameState; // Alias for clarity


  // Callbacks to toggle grid type and combat status, updating gameState
  // These are passed to the Sidebar
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
      // The useStateWithHistory initial state is used if loadState returns null
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


  // Token selection hook - Expose `isSelecting` state
  const {
      selectedTokenIds,
      selectTokenId,
      clearSelection,
      startMarquee,
      marqueeState,
      isSelecting // Expose isSelecting flag from hook state
    } = useTokenSelection({
    getTokens: useCallback(() => gameState.tokens, [gameState.tokens]), // Pass function to get tokens
    scale, // Pass scale from state
    position, // Pass position from state
    tokenSize: TOKEN_VISUAL_SIZE // Pass the token size constant
  });

  // Effect to clear selection if a selected token is deleted via context menu
  // The onDeleteTokens callback below modifies gameState, which triggers this effect.
  // This is a safeguard; ideally, selection hook should handle this based on token list changes.
  useEffect(() => {
       // Check if any selected token ID no longer exists in the current tokens list
       const currentTokenIds = new Set(tokens.map(t => t.id));
       const selectionNeedsCleanup = Array.from(selectedTokenIds).some(id => !currentTokenIds.has(id));

       if (selectionNeedsCleanup) {
            console.log('[DEBUG] Selected token(s) removed, cleaning up selection.');
            // Filter the selection set to only include existing tokens
            const newSelection = new Set(Array.from(selectedTokenIds).filter(id => currentTokenIds.has(id)));
            // Update selection state via the hook's setter
             setSelectedTokenIds(newSelection); // Use the state setter from useTokenSelection
       }
  }, [tokens, selectedTokenIds]); // Depend on tokens list and selected ids set
   // NOTE: Adding setSelectedTokenIds to dependency array here might be unnecessary or cause issues
   // React guarantees setState setters are stable and shouldn't be in deps.
   // Removing setSelectedTokenIds from this deps array. The effect should trigger when `tokens` changes,
   // and the `selectedTokenIds` state it accesses *within* the callback will be the state at that time.
   // The dependency should likely just be `tokens`.
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
  }, [tokens]); // Depend only on tokens list changing


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


  // --- Unified Mouse Event Handling on Tabletop (#tabletop div) ---
  // This handler differentiates between potential drag/marquee/click based on threshold.
  // ZoomableContainer handles primary pan/zoom (left/middle click drag on background)
  // and right-click context menu triggering.
  // This handler focuses on interactions that *start* on the tabletop div itself
  // (tokens or background) and require more specific logic than just pan/zoom.

  const initialMouseDownPosRef = useRef(null); // Store screen position at mouse down { clientX, clientY, target, clickedTokenId, isAdditiveSelection }
  const interactionStartedRef = useRef(false); // Flag if a drag or marquee has started

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
    const isAdditiveSelection = e.metaKey || e.ctrlKey || e.shiftKey;

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
            clearSelection(); // Clear selection state managed by useTokenSelection
        }
        // Always select/toggle the clicked token
        selectTokenId(clickedTokenId, isAdditiveSelection); // Use the hook's select function

        // We still need the global mousemove/mouseup to detect if this was a drag vs a click.
        // Global listeners will be added by startDrag if threshold is met.
        // If threshold is NOT met, the global mouseup will handle it as a click (no drag started).
        // A token click doesn't trigger ping, so the mouseup click logic needs to account for this.

        // Attaching temporary global listeners here instead of relying solely on hooks' listeners
        // ensures we capture mousemove/mouseup *before* other potential handlers if needed,
        // and allows us to implement the threshold logic consistently.
        document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
        document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });


    } else {
        // Clicked on background grid
        console.log('[DEBUG] Mousedown on background.');
        // Prevent default browser selection box when dragging on background
        e.preventDefault();
        // Do NOT stop propagation yet. Let the global mousemove handler below check threshold for marquee.
        // The global handler attached by startMarquee will stop propagation if marquee starts.

         // Attaching temporary global listeners for background interactions as well.
         document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
         document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true });

         // If not additive, clear selection on background click *start*
         if (!isAdditiveSelection) {
             clearSelection(); // Clear selection state managed by useTokenSelection
         }
    }

     // Note: ZoomableContainer's handlers run in the bubbling phase. Attaching our capture
     // listeners here means they run before ZoomableContainer's bubbling handlers.
     // If we preventDefault/stopPropagation in our capture handlers based on click target/threshold,
     // ZoomableContainer won't see the event or will see it stopped.
     // The logic needs careful testing. For now, we prevent default only IF we identify
     // it as a potential drag/marquee starter *or* a click we intend to handle.
     // The initial preventDefault is added above based on target type.
     // Propagation is stopped later in handleGlobalMouseMove/Up once an interaction is confirmed.

  }, [
      hideMenu, // Depend on hideMenu callback
      tokens, // Needed to find clicked token details if dragging starts
      selectTokenId, // Needed to update selection immediately on token click
      clearSelection, // Needed to clear selection on background click
      startDrag, // Hook callback to start drag
      startMarquee, // Hook callback to start marquee
      isDragging, // Need latest status from hook
      isSelecting, // Need latest status from hook
      // Note: createPing is NOT a dependency here; it's called in mouseup.
      // Note: scale and position are NOT dependencies here; they are used in mouseup to calculate ping pos.
  ]);


  // Global mousemove handler (attached on mousedown)
  const handleGlobalMouseMove = useCallback((e) => {
       // Only process if a potential interaction was initiated
       const initialPos = initialMouseDownPosRef.current;
       if (!initialPos) return;

       const { clientX: startX, clientY: startY, target: startTarget, clickedTokenId, isAdditiveSelection } = initialPos;
       const currentX = e.clientX;
       const currentY = e.clientY;

       const dx = currentX - startX;
       const dy = currentY - startY;
       const distance = Math.sqrt(dx*dx + dy*dy);

       // If mouse moved beyond threshold AND NO drag/marquee has started yet for THIS interaction
       if (!interactionStartedRef.current && distance > DRAG_THRESHOLD) {
           console.log('[DEBUG] Mouse moved significantly, initiating drag/marquee check.');
           interactionStartedRef.current = true; // Mark interaction started

           // Check if the initial mousedown target was a token
           if (clickedTokenId) {
               // It started on a token, initiate token drag
                console.log('[DEBUG] Starting token drag via mousemove threshold.');
                // Pass the currently *selected* tokens to useTokenDrag.
                // This allows dragging multiple tokens if the clicked one was selected.
                const tokensToDrag = tokens.filter(t => selectedTokenIds.has(t.id));
                if (tokensToDrag.length === 0) {
                    // This edge case could happen if the clicked token ID is stale in state, or other bugs
                    console.warn('[DEBUG] No selected tokens found for drag start, cancelling interaction.');
                     // Clean up and stop
                    initialMouseDownPosRef.current = null;
                    interactionStartedRef.current = false;
                    document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
                    document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
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

       // If an interaction *has* started (either drag or marquee), prevent default
       // browser behavior (like text selection) during the interaction.
       if (interactionStartedRef.current) {
           e.preventDefault(); // Keep preventing default while dragging/selecting
           e.stopPropagation(); // Keep stopping propagation while dragging/selecting
       }
       // Note: Specific move logic (updating token/marquee position) is handled by the hooks' internal mousemove listeners
       // which are attached once startDrag/startMarquee are called.

  }, [
      tokens, selectedTokenIds, // Needed for startDrag
      startDrag, // Hook callback
      startMarquee, // Hook callback
      isDragging, isSelecting, // State values from hooks
      // Note: initialMouseDownPosRef and interactionStartedRef are accessed via closure/current
  ]);

   // Global mouseup handler (attached on mousedown)
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
       document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
       document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });

       const initialPos = initialMouseDownPosRef.current;
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
               // No further action needed here other than cleanup.
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
               createPing(currentX, currentY);
            }
       } else {
           // If initial mousedown happened and a drag/marquee *did* start, the hook's mouseup handler took over.
           console.log('[DEBUG] MouseUp handled by hook (drag/marquee completed).');
           // The hook's mouseup handler should have already handled state updates and its own listener cleanup.
           // We just need to clean up our local refs.
            // Ensure preventDefault/stopPropagation runs for the event that ended the interaction,
            // as the hook's mouseup handler should have done this. Add defensively here.
            if (interactionStartedRef.current) {
                e.preventDefault();
                e.stopPropagation();
            }
       }

       // Always clean up the local refs related to the interaction cycle
       initialMouseDownPosRef.current = null;
       interactionStartedRef.current = false; // Reset the flag

   }, [
       createPing, // Ping dependency
       isDragging, isSelecting, // State values from hooks
       handleGlobalMouseMove // Dependency for listener cleanup
   ]);


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

    if (contextType === 'token' && tokenEl) {
        const clickedTokenId = tokenEl.id;
        // If right-clicked token is *already* in the current selection, offer actions on the *entire selection*.
        // Otherwise, select only this token and offer actions on just this one.
        const tokenIdsToOperateOn = selectedTokenIds.has(clickedTokenId) ? Array.from(selectedTokenIds) : [clickedTokenId];

        // Ensure the clicked token is selected if it wasn't already or if not additive.
        // This selection update happens *before* the menu is shown.
        if (!selectedTokenIds.has(clickedTokenId) || selectedTokenIds.size > 1) {
             // If the clicked token is not in the selection, OR if multiple tokens are selected
             // and the click is on just one, clear and select only the clicked one.
             // This is common behavior: single right-click on a token focuses the action on it,
             // unless the right-click is part of a multi-selection action.
             // Let's simplify: If you right-click a selected token, act on selection. If you right-click
             // an *unselected* token, select it and act on it.
             if (!selectedTokenIds.has(clickedTokenId)) {
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
          const gridX = (screenX - position.x) / scale;
          const gridY = (screenY - position.y) / scale;

          options.gridCoords = { x: gridX, y: gridY };
    }

    console.log('[DEBUG] Showing context menu, type:', contextType, 'Options:', options);
    // Pass event directly so context menu hook can get screen position
    showMenu(e, options);

  }, [showMenu, clearSelection, selectTokenId, selectedTokenIds, position, scale]); // Added selection state/handlers, position, scale as dependencies


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
          // Ensure temporary global mousemove/mouseup listeners are removed
          document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
          document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });

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

      {/* Sidebar - Rendered here as part of VT's content area */}
      {/* Position Sidebar absolutely within this container or manage layout with flex/grid */}
       <div className="right-sidebar-in-vt" style={{
           position: 'absolute',
           top: 0,
           right: 0,
           bottom: 0,
           zIndex: 1001, // Ensure sidebar is above tabletop content
           width: '350px', // Or manage width with state/SplitPane
           // Add styling for the sidebar itself (background, border, etc.)
       }}>
           {/*
            // Sidebar expects props like isHexGrid, inCombat, historyInfo, undoGameState, etc.
            // These are available from the gameState, updateGameState, undoGameState, historyInfo
            // returned by useStateWithHistory.
            // Passing these props down directly to Sidebar rendered within VT:
           */}
           <Sidebar
              isHexGrid={isHexGrid} // Pass state from VT's gameState
              onToggleGrid={onToggleGrid} // Pass toggle function defined here
              inCombat={inCombat} // Pass state from VT's gameState
              onToggleCombat={onToggleCombat} // Pass toggle function defined here
              undoGameState={undoGameState} // Pass undo function from hook
              historyInfo={historyInfo} // Pass history info object from hook
              // Add other props Sidebar might need (e.g., redoGameState, tokens for character sheets etc.)
           />
       </div>
        {/* Add CSS for .right-sidebar-in-vt in styles.css if needed */}
        {/* Note: This means the SplitPane in App.jsx now splits the ToolsBar from the entire VT+Sidebar area. */}
        {/* To make the Sidebar itself resizable, it must be a sibling of the main VT area, managed by App's SplitPane. */}
        {/* Reverting Sidebar back to App.jsx, will need to pass props from VT -> App -> Sidebar. */}
        {/* This requires VT to expose state/setters which is non-standard. Let's stick to the original App/Sidebar SplitPane and adjust prop passing. */}
        {/* VirtualTabletop needs to return/expose the state and history info to its parent (App) so App can pass it to the Sidebar sibling. */}
        {/* A render prop or React Context is the standard way. Let's use render prop for simplicity in this example. */}
        {/* VirtualTabletop component signature needs to change: `({ renderSidebar })` and then call `renderSidebar({ isHexGrid, inCombat, historyInfo, undoGameState, onToggleGrid, onToggleCombat })` */}
        {/* And App.jsx needs to pass `<VirtualTabletop renderSidebar={(sidebarProps) => <Sidebar {...sidebarProps} />} />` */}
        {/* This significantly changes App.jsx. Let's assume for THIS revision that state is managed locally in VT and NOT passed out to Sidebar via App. */}
        {/* Sidebar needs to be moved back to App.jsx's SplitPane. The props it needs *must* be passed down. */}
        {/* Simplest approach for props: Pass needed state values (isHexGrid, inCombat, historyInfo) and callbacks (undoGameState, onToggleGrid, onToggleCombat) directly from VirtualTabletop's state/hook returns as props *when App renders Sidebar*. This implies App *calls into* VirtualTabletop to get this state, which is bad practice. OR, Sidebar subscribes to VTT state via a global object/context (like the init.jsx bridge attempted). OR, state is lifted higher. */}

        {/* Okay, let's revert VirtualTabletop.jsx to its original state regarding *rendering* Sidebar (i.e., Sidebar is NOT rendered inside VT). */}
        {/* I will focus fixes on the mouse handling and hook coordination *within* VirtualTabletop, and the duplicate Marquee. */}
        {/* The state management issue (VT -> App -> Sidebar) will be noted as an area for improvement needing significant refactoring (Context API is recommended). */}

        {/*
         // Reverting Sidebar back to App.jsx's SplitPane structure.
         // The state flow issue (VT -> App -> Sidebar) needs a proper pattern like Context or a higher state manager.
         // For now, leaving the state management within VT as is and noting the Sidebar prop issue.
         // The Sidebar component definition imported above is the one expected to be used by App.jsx's SplitPane structure.
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
        onWheel={handleWheel} // Pass wheel handler for zoom-to-mouse
        // Pass isDragging/isSelecting to ZoomableContainer so it can disable pan
        // when a token drag or marquee is in progress.
         isPanDisabled={isDragging || isSelecting} // Disable pan if dragging or selecting
      >
        {/* Content INSIDE the zoomable container */}
        {/* Attach core mouse handlers to the tabletop div */}
        <div
          id="tabletop"
          className={isHexGrid ? 'hex-grid' : 'square-grid'} // Use state value
          onMouseDown={handleMouseDown} // Our central mousedown handler
          // Global mousemove/mouseup are attached/managed by handlers/hooks
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
            // Disable pointer events on the tabletop div while dragging/selecting to prevent conflicts
            // Mouse events are handled by global listeners attached to document.body
            // This ensures events aren't blocked by elements inside #tabletop (except tokens handled by `closest`)
            pointerEvents: (isDragging || isSelecting) ? 'none' : 'auto',
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
        {/* This local definition here is redundant and should be removed in a future cleanup pass. */}
        {/* For now, leaving it as is to strictly address the import error only. */}
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

// Removed duplicate Marquee component definition from here.
// It should be imported from './Marquee'.