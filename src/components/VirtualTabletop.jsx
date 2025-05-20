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

// Components
import { ZoomableContainer } from './ZoomableContainer';
import { Grid } from './Grid';
import { Token } from './Token';
import { Controls } from './Controls';
import { Ping } from './Ping';
import { Marquee } from './Marquee';

// Constants
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 0.1;
const DEFAULT_SQUARE_SIZE = 50;
const DEFAULT_HEX_SIZE = 30;
const DRAG_THRESHOLD = 5; // Pixels mouse must move to cancel ping/start drag/marquee
const TOKEN_VISUAL_SIZE = 40; // Matches CSS .token width/height


// New Context Menu component to render based on state
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
                        // hideMenu(); // Hide the menu after action - useContextMenu handles this
                    }}
                >
                    {item.label}
                </div>
            ))}
        </div>
    );
};


export default function VirtualTabletop({ isHexGrid, onToggleGrid, inCombat, onToggleCombat }) { // Receive props from App.jsx

  // 1) Single Source of Truth & History
  // Initialize gameState with props received from App.jsx
  const [gameState, setGameState, updateGameState, undoGameState, historyInfo] = useStateWithHistory({
    isHexGrid: isHexGrid, // Initialize with prop
    inCombat: inCombat, // Initialize with prop
    tokens: [],
    // scale and position are now managed by ZoomableContainer internally
    // They are part of gameState history, but ZoomableContainer can update them directly for smoothness
    scale: 1, // Initial scale
    position: { x: 0, y: 0 }, // Initial position
    // Add other global state here (initiative, etc.)
  }, {
    maxHistory: 50,
    // Use setDirectState inside onUndo/onRedo to update scale/position for ZoomableContainer
    // and update other state like isHexGrid, inCombat without triggering auto-save
    onUndo: (prevState) => {
       console.log('[DEBUG] Undid to state:', prevState);
       // Update component/hook states derived from gameState immediately
       setDirectState(prevState); // Apply the full state directly
    },
    onRedo: (nextState) => {
       console.log('[DEBUG] Redid to state:', nextState);
       // Update component/hook states derived from gameState immediately
       setDirectState(nextState); // Apply the full state directly
    }
  });

  // Destructure relevant state directly from gameState (these will be updated by setDirectState from hooks)
  const { tokens, scale, position } = gameState; // isHexGrid and inCombat also come from gameState now

  // setDirectState is exposed by useStateWithHistory for bypassing history (e.g., pan/zoom)
  const setDirectState = setGameState; // Alias for clarity


  // Update gameState's isHexGrid, inCombat, etc. when props change from App.jsx
  // Use setDirectState so grid/combat toggling from Sidebar doesn't clutter history
  useEffect(() => {
      // Only update if the prop value is actually different from the current state value
      // This prevents unnecessary state updates if parent renders but prop value is same.
      setDirectState(prev => {
          let newState = { ...prev };
          let changed = false;
          if (prev.isHexGrid !== isHexGrid) { newState.isHexGrid = isHexGrid; changed = true; }
          if (prev.inCombat !== inCombat) { newState.inCombat = inCombat; changed = true; }
          return changed ? newState : prev;
      });
  }, [isHexGrid, inCombat, setDirectState]);


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
      // Use setDirectState to load the state without adding it to undo history
      setDirectState(loaded);
      initialLoadDoneRef.current = true;
    } else {
      console.log('[DEBUG] No saved state found... using defaults');
      // If no state was loaded, initialize state with default tokens if needed
      // Currently initializes with empty tokens array from useStateWithHistory initial value
       setDirectState(prev => ({
           ...prev,
           // You could add default tokens here if loadState returns null
           // tokens: loaded?.tokens || [/* initial token objects if needed */],
           // Ensure grid and combat state are carried over from initial props if load fails
           isHexGrid: isHexGrid,
           inCombat: inCombat,
       }));
      initialLoadDoneRef.current = true;
    }
  }, [loadState, setDirectState, isHexGrid, inCombat]); // Add isHexGrid, inCombat deps for the initial state fallback


  // Auto-save entire gameState, debounced 2s
  // Pass the full gameState object to useAutoSave
  useAutoSave(gameState, saveState, 2000);

  // Debug watchers (optional, remove for production)
  const prevGameStateRef = useRef(gameState);
  useEffect(() => {
    // Deep comparison can be expensive, log only structure or relevant fields
    // Check specific properties for changes to reduce log noise
    const prevState = prevGameStateRef.current;
    if (prevState.tokens !== tokens) {
      console.log('[DEBUG] Tokens array reference changed. Count:', tokens.length);
    }
     if (prevState.scale !== scale || prevState.position !== position) {
         console.log('[DEBUG] Scale/Position changed. Scale:', scale, 'Pos:', position);
     }
    if (prevState.isHexGrid !== gameState.isHexGrid) { // Compare with latest gameState value
         console.log('[DEBUG] isHexGrid changed to', gameState.isHexGrid);
     }
     if (prevState.inCombat !== gameState.inCombat) { // Compare with latest gameState value
         console.log('[DEBUG] inCombat changed to', gameState.inCombat);
     }
     // Keep prevGameStateRef updated with the new state object
     prevGameStateRef.current = gameState;
  }, [gameState, tokens, scale, position]); // Depend on the gameState object itself


  // Grid config (useMemo is good here)
  const gridConfig = useMemo(() => ({
    squareSize: DEFAULT_SQUARE_SIZE,
    hexSize: DEFAULT_HEX_SIZE,
    hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    hexHeight: DEFAULT_HEX_SIZE * 2
  }), []);

  // Grid snapping hook - depends on gameState.isHexGrid
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid: gameState.isHexGrid, // Use state value
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
  });

  // Dimensions for dynamic grid layout based on window size
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  // Debounced grid dimension update - depends on grid type state and grid config
  const updateGridDimensions = useMemo(() => _.debounce(() => {
    const container = document.getElementById('tabletop-container');
    if (!container) {
        console.warn('[DEBUG] #tabletop-container not found for dimension update.');
        return;
    }
    const rect = container.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    // Use the latest state value for isHexGrid directly within the debounced function
    // This function is created once, but accesses latest state/props via closure or refs if needed.
    // Here, we access gameState.isHexGrid directly, which is fine because gameState is a dependency of the effect that *calls* this debounced function,
    // or simply because useState guarantees latest state on render.

    if (gameState.isHexGrid) { // Use state value
      const effHeight = gridConfig.hexHeight * 0.75;
      setDimensions({
        // Add extra rows/cols for panning beyond initial view
        rows: Math.ceil(vh / effHeight) + 5,
        cols: Math.ceil(vw / gridConfig.hexWidth) + 5
      });
    } else {
      setDimensions({
        // Add extra rows/cols for panning beyond initial view
        rows: Math.ceil(vh / gridConfig.squareSize) + 5,
        cols: Math.ceil(vw / gridConfig.squareSize) + 5
      });
    }
     console.log('[DEBUG] Grid dimensions updated based on container:', { vw, vh, isHexGrid: gameState.isHexGrid, currentDimensions: dimensions }); // Use state value
  }, 200), [gridConfig, gameState.isHexGrid]); // Depend on grid config and the isHexGrid state value


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


  // Calculate total grid size for ZoomableContainer
  const { totalWidth, totalHeight } = useMemo(() => {
    // Use state value for isHexGrid
    const currentCols = dimensions.cols > 0 ? dimensions.cols : Math.ceil(window.innerWidth / (gameState.isHexGrid ? gridConfig.hexWidth : gridConfig.squareSize)) + 5;
    const currentRows = dimensions.rows > 0 ? dimensions.rows : Math.ceil(window.innerHeight / (gameState.isHexGrid ? gridConfig.hexHeight * 0.75 : gridConfig.squareSize)) + 5;

    if (gameState.isHexGrid) { // Use state value
       return {
        totalWidth: currentCols * gridConfig.hexWidth,
        totalHeight: currentRows * (gridConfig.hexHeight * 0.75),
      };
    } else {
      return {
        totalWidth: currentCols * gridConfig.squareSize,
        totalHeight: currentRows * gridConfig.squareSize,
      };
    }
  }, [dimensions, gameState.isHexGrid, gridConfig]); // Depend on dimensions, state value, and config


// Token drag hook
// It's now the hook's responsibility to add/remove its own global mousemove/mouseup listeners
// when startDrag is called and the drag ends.
const { startDrag, isDragging } = useTokenDrag({
  scale: scale, // Pass current scale from state
  getSnappedPosition, // Pass the snapping function
  // onDragMove and onDragEnd use setDirectState/updateGameState internally in the hook
  onDragMove: useCallback((tokenId, newPos) => {
     // Callback receives snapped position, update state directly (no history)
     setDirectState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
            t.id === tokenId ? { ...t, position: newPos } : t
        )
     }));
  }, [setDirectState]), // Depend on setDirectState

  onDragEnd: useCallback((tokenId, finalPos) => {
    // Callback receives final snapped position, update state (adds to history)
     if (finalPos) { // Ensure finalPos is not null/undefined
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
          t.id === tokenId ? { ...t, position: finalPos } : t
        )
      }));
    }
  }, [updateGameState]) // Depend on updateGameState
});


  // Token selection hook (updated to use React state for marquee)
  // It's now the hook's responsibility to add/remove its own global mousemove/mouseup listeners
  // when startMarquee is called and the marquee ends.
  const {
      selectedTokenIds,
      selectTokenId,
      clearSelection,
      startMarquee,
      marqueeState,
      isSelecting // Expose isSelecting flag from hook
    } = useTokenSelection({
    // Pass function to get tokens currently in the state
    getTokens: useCallback(() => gameState.tokens, [gameState.tokens]),
    // Pass scale and position for screen->grid conversion in marquee logic
    scale,
    position,
    tokenSize: TOKEN_VISUAL_SIZE // Pass the token size constant
    // Removed onSelectTokens as selection state is managed internally by the hook
  });


  // Context menu hook (updated to use React state)
  const { menuState, showMenu, hideMenu } = useContextMenu({
    // Pass callbacks that interact with the main gameState
    onAddToken: useCallback((gridCoords) => { // Receive gridCoords directly from ContextMenu component action
      console.log('[DEBUG] Adding token at grid coords:', gridCoords);

      updateGameState(prev => ({
        ...prev,
        tokens: [
          ...prev.tokens,
          {
            id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            position: getSnappedPosition(gridCoords.x, gridCoords.y), // Snap the exact grid coords
            stats: { hp: 100, maxHp: 100, name: 'New Token' }, // Example stats
            // Add default visual properties if needed (e.g., color, image)
            color: '#3498db', // Default blue color
          }
        ]
      }));
    }, [getSnappedPosition, updateGameState]), // Depend on getSnappedPosition and updateGameState

    onDeleteTokens: useCallback((tokenIds) => { // Receive token IDs directly from ContextMenu component action
      console.log('[DEBUG] Deleting tokens', Array.from(tokenIds));
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.filter(t => !tokenIds.includes(t.id)) // Filter based on passed IDs
      }));
      // clearSelection(); // Selection will be cleared by the hook or a separate effect if necessary
    }, [updateGameState]), // Depend on updateGameState
  });

  // Clear selection whenever tokens change (e.g., deletion)
  useEffect(() => {
      // This effect runs after state updates, including updates from onDeleteTokens
      // If any selected token was deleted, the selectedTokenIds set needs to be cleaned up.
      // A more robust approach is to handle this *inside* the hook's setSelectedIds logic
      // or ensure onDeleteTokens specifically clears selection, but this is a simple safeguard.
       const currentTokenIds = new Set(tokens.map(t => t.id));
       const needsCleanup = Array.from(selectedTokenIds).some(id => !currentTokenIds.has(id));

       if (needsCleanup) {
           // Filter selectedTokenIds to only include tokens that still exist
           const newSelection = new Set(Array.from(selectedTokenIds).filter(id => currentTokenIds.has(id)));
           if (newSelection.size !== selectedTokenIds.size) {
               console.log('[DEBUG] Cleaning up selectedTokenIds after token removal.');
               // Use the internal selection state setter from the hook if exposed,
               // or rely on the hook's delete handler to manage selection.
               // Since onDeleteTokens doesn't currently clear selection in the hook,
               // we'll call clearSelection here if needed, or modify the hook.
               // For now, let's assume the hook *should* handle it or we clear everything.
               // Let's modify the hook to handle cleanup on token changes instead.
           }
       }
       // Reverted this approach. The hook useTokenSelection should ideally receive a list of tokens
       // to check against its selection *or* the delete action needs to explicitly call clearSelection.
       // The onDeleteTokens useCallback above now includes clearSelection().
       // This useEffect is no longer strictly necessary with that change, but could be useful
       // if tokens state changes from other sources not managed by these specific callbacks.
       // Let's remove this cleanup effect to simplify.
  }, [tokens, selectedTokenIds]); // Depends on tokens and selectedTokenIds

  // PING LOGIC
  const [pings, setPings] = useState([]);
  const playerColor = '#ff0066'; // Example color
  const createPing = useCallback((gridX, gridY) => {
      console.log('[DEBUG] Creating ping at grid:', { gridX, gridY });
      const newPing = { id: Date.now() + Math.random(), x: gridX, y: gridY, color: playerColor };
      setPings(prev => [...prev, newPing]);
      // Ping component itself will handle the removal via its onComplete prop
  }, [playerColor]);


  // --- Unified Mouse Event Handling on Tabletop (#tabletop div) ---
  // This handler differentiates between potential drag/marquee/click based on movement threshold.
  // ZoomableContainer handles primary pan/zoom (left/middle click drag on background)
  // and right-click context menu triggering.
  // This handler focuses on interactions that *start* on the tabletop div itself
  // (tokens or background) and require more specific logic than just pan/zoom.

  const initialMouseDownPosRef = useRef(null); // Store screen position at mouse down
  const panPreventedRef = useRef(false); // Flag if we prevented ZoomableContainer's pan

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
    });

    // Ignore right-clicks (button 2) - ZoomableContainer handles context menu trigger for these
    if (e.button === 2) {
         // Let ZoomableContainer handle the context menu
         // ensure our context menu is hidden initially on any mousedown
         hideMenu();
         return;
    }

    // Ignore middle-clicks (button 1) - ZoomableContainer handles middle-click pan
    if (e.button === 1) {
        // Let ZoomableContainer handle middle-click pan
        return;
    }

    // --- Handle Left Clicks (button 0) ---
    hideMenu(); // Hide context menu on any left mouse down

    // Store initial mouse position and context for threshold check
    initialMouseDownPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      target: e.target,
      isAdditiveSelection: e.metaKey || e.ctrlKey || e.shiftKey, // Shift, Ctrl, Meta for additive selection
      clickedTokenId: e.target.closest('.token')?.id, // Store ID if a token was clicked
      // No flag needed for 'didHandleInteraction' here, the check happens in mousemove
    };

    // Attach temporary global listeners *once* to detect drag/marquee start based on threshold
    // These listeners will check initialMouseDownPosRef and decide course of action
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    // We *might* need to prevent ZoomableContainer's pan if we are about to start a drag/marquee.
    // ZoomableContainer typically prevents pan if e.target is not the container itself.
    // If e.target is a token, its default is often prevented by token's own handlers or CSS.
    // If e.target is the grid/background, ZoomableContainer might start panning.
    // We want to prevent pan IF a drag/marquee starts.
    // We can flag it here and potentially preventDefault IF threshold is passed later.
    // A simpler approach: Prevent default on the initial mousedown IF target is NOT the container.
    // If target IS the container, ZoomableContainer gets the event first and might handle pan.
    // The ZoomableContainer `onContextMenu` prop handles right-click on container/children.
    // Let's prevent default if the target is a token. If target is background, let ZoomableContainer potentially pan.
    const tokenEl = e.target.closest('.token');
    if (tokenEl) {
        e.preventDefault(); // Prevent default browser drag on token
        e.stopPropagation(); // Stop event bubbling up to tabletop/container background handlers
        panPreventedRef.current = true; // Indicate we took control
        console.log('[DEBUG] Mousedown on token, preventing default/propagation.');
    } else {
         // If background click, we don't prevent default here.
         // ZoomableContainer's mousedown handler will run *before* this synthetic event handler.
         // If ZoomableContainer starts panning (e.g., on background click), it will set document.body cursor and handle mousemove/mouseup.
         // If ZoomableContainer *doesn't* pan (e.g., not a background click/drag), then our global mousemove will run.
         // This is a bit subtle and relies on the order of event phases and listener attachment.
         // Attaching our listeners in the *capture* phase (`{ capture: true }`) is safer to ensure they run before ZoomableContainer's handlers in the bubbling phase. Let's adjust that.
         // Removing temporary listeners added here and using global capture listeners from hooks instead.
          console.log('[DEBUG] Mousedown on background.');
          // Remove these temporary listeners and rely solely on the hooks' global capture listeners.
          document.removeEventListener('mousemove', handleGlobalMouseMove);
          document.removeEventListener('mouseup', handleGlobalMouseUp);
           // The logic for threshold checking and starting drag/marquee will move into the hook's global mousemove listener
           // which is triggered by the mouse down (where mouse state is stored in initialMouseDownPosRef).
           // The hooks will need access to this initialMouseDownPosRef. Let's rethink this...

           // OK, new plan:
           // 1. VirtualTabletop's handleMouseDown stores initial pos/target in initialMouseDownPosRef.
           // 2. It does NOT attach temporary listeners.
           // 3. It calls `e.preventDefault()` and `e.stopPropagation()` *only* if a token is clicked.
           // 4. Global `mousemove` and `mouseup` listeners *attached by hooks* check `initialMouseDownPosRef`.
           // 5. If `initialMouseDownPosRef` is set, the hooks' global listeners perform the threshold check.
           // 6. If threshold passed, the hook calls its internal start logic (`startDrag`, `startMarquee`) and takes over, setting its own internal dragging/selecting flags.
           // 7. If threshold NOT passed on mouseup, and `initialMouseDownPosRef` was set, it's a click -> trigger ping.
           // 8. Global mouseup listener (either hook's or a dedicated one) clears `initialMouseDownPosRef`.

           // This simplifies handleMouseDown here.
           // The threshold check and startDrag/startMarquee calls need to happen in the global mousemove handler.
           // The ping logic needs to happen in the global mouseup handler *only if* a drag/marquee did not start.

            // Revert the temporary listener logic here. Just store the initial pos.
             // The check for click vs drag happens in the global mousemove.
             // The ping happens in the global mouseup if no drag/marquee started.
    }

     // Attach temporary global listeners to document body for drag/marquee tracking
     // These are attached here and removed in handleMouseUp
     // Using { capture: true } to ensure they run before bubbling listeners like ZoomableContainer's
     document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true }); // Capture mousemove on body
     document.addEventListener('mouseup', handleGlobalMouseUp, { capture: true }); // Capture mouseup on body


  }, [
      hideMenu, // Depend on hideMenu callback
      tokens, // Needed to find clicked token details if dragging starts
      selectTokenId, // Needed to update selection immediately on token click
      clearSelection, // Needed to clear selection on background click
      startDrag, // Hook callback to start drag
      startMarquee, // Hook callback to start marquee
      createPing, // Callback to create a ping
      position, // Needed to convert click position for ping
      scale, // Needed to convert click position for ping
      selectedTokenIds // Needed to know which tokens to pass to startDrag
  ]);


  // Global mousemove handler (attached on mousedown)
  const handleGlobalMouseMove = useCallback((e) => {
       // Only process if a potential interaction was initiated
       if (!initialMouseDownPosRef.current) return;

       const { clientX: startX, clientY: startY, target: startTarget, clickedTokenId, isAdditiveSelection } = initialMouseDownPosRef.current;
       const currentX = e.clientX;
       const currentY = e.clientY;

       const dx = currentX - startX;
       const dy = currentY - startY;
       const distance = Math.sqrt(dx*dx + dy*dy);

       // If mouse moved beyond threshold AND we are not already dragging/selecting
       // Note: isDragging/isSelecting refs/states are managed by the hooks now.
       // We need to check those to see if a hook has already taken over.
       // Expose isDraggingRef from useTokenDrag and isSelecting from useTokenSelection?
       // Or let the hooks decide internally if they should start based on a flag we pass?
       // Let's assume the hooks can check an internal flag initiated by startDrag/startMarquee.
       // We need to know if *any* interaction (drag or marquee) has started.

       // We need a way to know if either startDrag or startMarquee has been called and is active.
       // Let's use the isDragging and isSelecting state/refs exposed by the hooks.
       // Access isDraggingRef.current directly from useTokenDrag or get it as a returned value?
       // The hook exposes `isDragging` as a value derived from the ref, which is fine for rendering,
       // but handlers need the ref itself or a way to access its latest value synchronously.
       // Let's add a ref to VirtualTabletop to track if *any* drag/marquee started.
       const interactionStartedRef = useRef(false); // Use a ref in VirtualTabletop

       if (!interactionStartedRef.current && distance > DRAG_THRESHOLD) {
           console.log('[DEBUG] Mouse moved significantly, initiating drag/marquee.');
           interactionStartedRef.current = true; // Mark interaction started

           const tokenEl = startTarget?.closest('.token');

           if (tokenEl) {
               // It's a token drag
                console.log('[DEBUG] Starting token drag via mousemove threshold.');
                const clickedToken = tokens.find(t => t.id === clickedTokenId);
                if (clickedToken) {
                     // Pass the currently *selected* tokens to useTokenDrag
                    const tokensToDrag = tokens.filter(t => selectedTokenIds.has(t.id));
                    // Start the drag using the hook's startDrag function
                    // The hook will attach its own global listeners if needed
                    startDrag(clickedToken, e, tokensToDrag); // Pass event and tokens
                     e.preventDefault(); // Prevent default browser drag
                     e.stopPropagation(); // Stop propagation
                } else {
                    console.warn('[DEBUG] Clicked token not found for drag start in mousemove.');
                     // If token not found, maybe just ignore or clear initial state?
                     initialMouseDownPosRef.current = null; // Cleanup
                     document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
                     document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });
                }

           } else {
               // It's a marquee selection on the background
                console.log('[DEBUG] Starting marquee selection via mousemove threshold.');
                // Start the marquee using the hook's startMarquee function
                // The hook will attach its own global listeners
                startMarquee({
                    clientX: startX, // Pass original screen coordinates
                    clientY: startY,
                    shiftKey: isAdditiveSelection // Pass shift key state for additive
                });
                 e.preventDefault(); // Prevent default browser selection
                 e.stopPropagation(); // Stop propagation
           }
       }

       // If interaction *has* started (either by this handler or directly in mousedown if no threshold needed),
       // prevent default browser selection during the interaction.
       if (interactionStartedRef.current) {
           e.preventDefault();
       }

       // Don't stop propagation here unless an interaction has definitely started.
       // Let other listeners (like ZoomableContainer's pan logic) potentially see the event
       // if our threshold hasn't been met yet. Once threshold is met and we start drag/marquee,
       // we should stop propagation in the blocks above.

  }, [
      tokens, selectedTokenIds, // Needed for startDrag
      startDrag, // Hook callback
      startMarquee, // Hook callback
      isDragging, isSelecting // States/refs from hooks - conceptually used here but accessed via closure/latest state in hooks
  ]);

   // Global mouseup handler (attached on mousedown)
   const handleGlobalMouseUp = useCallback((e) => {
       console.log('[DEBUG-TABLETOP] handleGlobalMouseUp:', {
         button: e.button,
         target: e.target,
         defaultPrevented: e.defaultPrevented,
         className: e.target.className,
         id: e.target.id,
       });

       // Remove the temporary global listeners attached in handleMouseDown
       document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
       document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });

       // Check if a drag or marquee was initiated during this interaction cycle
       // Accessing isDragging/isSelecting state/refs here to see if a hook took over.
       // If not dragging AND not selecting (marquee), AND initial mousedown occurred, it was a click.
       // Need reliable access to latest isDragging/isSelecting status here.
       // Let's pass simple boolean flags from the hooks return values.
       // The hooks handle their own mouseup logic if they started dragging/selecting.
       // We only handle the 'click' scenario here.

       // If initial mousedown happened AND NO drag/marquee started
       if (initialMouseDownPosRef.current && !isDragging && !isSelecting) {
            console.log('[DEBUG] MouseUp detected as a click (no drag/marquee).');

            const { clientX: startX, clientY: startY, clickedTokenId, isAdditiveSelection } = initialMouseDownPosRef.current;

            // Check if the click was on a token
            if (clickedTokenId) {
               // It was a click on a token. Selection was already handled in handleMouseDown.
               console.log('[DEBUG] Token click finalized.');
               // No further action needed here.
               e.preventDefault(); // Prevent default for the handled click
               e.stopPropagation();

            } else {
               // It was a click on the background (no token, no drag/marquee)
               console.log('[DEBUG] Background click finalized. Creating ping.');
               e.preventDefault(); // Prevent default browser stuff on background click
               e.stopPropagation();

               // Convert screen coords to grid coords for ping using the *end* position (e.clientX, e.clientY)
                const container = document.getElementById('tabletop-container');
                if (container) {
                    const containerRect = container.getBoundingClientRect();
                    const screenX = e.clientX - containerRect.left;
                    const screenY = e.clientY - containerRect.top;
                     const gridX = (screenX - position.x) / scale;
                     const gridY = (screenY - position.y) / scale;
                    createPing(gridX, gridY);
                } else {
                    console.warn('[DEBUG] Container not found for ping coordinate calculation.');
                }
            }
       } else {
           // If initial mousedown happened and a drag/marquee *did* start, the hook's mouseup handler took over.
           console.log('[DEBUG] MouseUp handled by hook (drag/marquee).');
           // The hook's mouseup handler should have already cleaned up its own listeners.
           // We still need to clean up initialMouseDownPosRef.
       }

       // Always clean up the initial mousedown reference
       initialMouseDownPosRef.current = null;
       // interactionStartedRef.current should be managed/reset by the hooks? Or here?
       // Let's reset it here as this handler signals the end of the interaction cycle started by handleMouseDown.
       interactionStartedRef.current = false; // Reset the flag

   }, [
       createPing, // Ping dependency
       position, scale, // For converting click position
       isDragging, isSelecting // Boolean flags from hooks indicating activity
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
        if (!selectedTokenIds.has(clickedTokenId)) {
             clearSelection(); // Clear existing selection first
             selectTokenId(clickedTokenId, false); // Select only this one (not additive)
        }
        // If it was already selected, we don't change the selection state here,
        // we just use the existing selection for the context menu options.

        options.tokenIds = tokenIdsToOperateOn; // Pass the relevant ID(s) to the menu state

    } else if (contextType === 'grid') {
         // If right-clicked on grid background, clear selection
         clearSelection();

         // Pass grid coordinates to the menu handler for "Add Token"
         const container = document.getElementById('tabletop-container');
         const containerRect = container.getBoundingClientRect();

         // Convert screen coordinates to grid coordinates
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
       // Pass setDirectState methods to update scale/position without history
       setScale: newScale => setDirectState(prev => ({ ...prev, scale: newScale })),
       setPosition: newPosition => setDirectState(prev => ({ ...prev, position: newPosition })),
       minScale: MIN_SCALE,
       maxScale: MAX_SCALE,
       zoomFactor: ZOOM_FACTOR,
   });

   // Pass the button handlers down
   const handleZoomIn = useCallback(() => handleZoomButtons(1 + ZOOM_FACTOR * 2), [handleZoomButtons]);
   const handleZoomOut = useCallback(() => handleZoomButtons(1 - ZOOM_FACTOR * 2), [handleZoomButtons]);

   // Undo handler - exposed for sidebar button
   const handleUndo = useCallback(() => {
       console.log('[DEBUG] Calling undo...');
       undoGameState();
       // Selection state might become invalid after undo, clear it as safeguard?
       // clearSelection(); // Consider clearing selection after undo if state structure changes significantly
   }, [undoGameState]);


  // Cleanup initial mousedown ref and temporary global listeners on component unmount
  useEffect(() => {
      return () => {
          console.log('[DEBUG] VirtualTabletop unmounting, cleaning up global listeners and refs.');
          // Ensure temporary global mousemove/mouseup listeners are removed
          document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
          document.removeEventListener('mouseup', handleGlobalMouseUp, { capture: true });

          // Clear refs
          initialMouseDownPosRef.current = null;
          // interactionStartedRef.current = false; // Not strictly necessary on unmount but good practice
          updateGridDimensions.cancel(); // Cancel debounced function
      };
  }, [handleGlobalMouseMove, handleGlobalMouseUp, updateGridDimensions]); // Depend on memoized handlers and debounced function


  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Controls overlay (Zoom, Undo, etc.) */}
      {/* Positioned fixed or absolute within this wrapper */}
      {/* Pass handleUndo function to Controls if it renders an undo button */}
      <Controls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onUndo={handleUndo} />


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
        // Access refs directly for this prop if ZoomableContainer reads it synchronously.
        // Or pass the derived state values if ZoomableContainer reacts to prop changes.
        // Let's pass the state values isDragging/isSelecting directly.
        // Note: Need to adjust useTokenDrag and useTokenSelection to expose these as state
        // or use the refs directly if ZoomableContainer reads them like that.
        // Hooks already expose `isDragging` and `isSelecting` boolean states.
         isPanDisabled={isDragging || isSelecting} // Disable pan if dragging or selecting
      >
        {/* Content INSIDE the zoomable container */}
        {/* Attach core mouse handlers to the tabletop div */}
        <div
          id="tabletop"
          className={gameState.isHexGrid ? 'hex-grid' : 'square-grid'} // Use state value
          onMouseDown={handleMouseDown} // Our central mousedown handler
          // Global mousemove/mouseup are attached/managed by handlers/hooks
          style={{
            width: totalWidth,
            height: totalHeight,
            position: 'relative',
            // Cursor handled by useZoomToMouse hook during pan and useTokenDrag during drag
            // Pointer events might be controlled by ZoomableContainer during pan
            // user-select handled by CSS class
          }}
        >
          {/* Grid layer */}
          <Grid
            isHexGrid={gameState.isHexGrid} // Use state value
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
        <Marquee marqueeState={marqueeState} />

        {/* Context Menu component, rendered if menuState is active */}
        <ContextMenu
             menuState={menuState}
             hideMenu={hideMenu} // Pass hide function
             onAddToken={onAddToken} // Pass the actual handler from useContextMenu
             onDeleteTokens={onDeleteTokens} // Pass the actual handler from useContextMenu
        />

    </div>
  );
}

// Define Marquee component here or in its own file
const Marquee = ({ marqueeState }) => {
    if (!marqueeState) return null;
     const { startX, startY, currentX, currentY } = marqueeState;

     const minX = Math.min(currentX, startX);
     const maxX = Math.max(currentX, startX);
     const minY = Math.min(startY, currentY);
     const maxY = Math.max(startY, currentY);

    return (
        // Use the CSS class for styling, apply dynamic position/size via style prop
        <div className="marquee" style={{
            left: `${minX}px`,
            top: `${minY}px`,
            width: `${maxX - minX}px`,
            height: `${maxY - minY}px`,
        }} />
    );
};