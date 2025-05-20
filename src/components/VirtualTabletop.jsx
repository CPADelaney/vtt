// src/components/VirtualTabletop.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Removed SplitPane import - layout handled by App.jsx
import _ from 'lodash'; // Added lodash import for debounce cancel cleanup

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu'; // Updated hook
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';
import { useAutoSave } from '../hooks/useAutoSave';
import { useStateWithHistory } from '../hooks/useStateWithHistory';
import { useZoomToMouse } from '../hooks/useZoomToMouse'; // Ensure hook is imported and used

// Components
import { ZoomableContainer } from './ZoomableContainer';
import { Grid } from './Grid';
import { Token } from './Token';
import { Controls } from './Controls';
// Sidebar is rendered by App.jsx now
import { Ping } from './Ping'; // Use the dedicated Ping component
import { Marquee } from './Marquee'; // New Marquee component

// Constants
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 0.1;
const DEFAULT_SQUARE_SIZE = 50;
const DEFAULT_HEX_SIZE = 30;
const DRAG_THRESHOLD = 5; // Pixels mouse must move to cancel ping/start drag/marquee


// New Context Menu component to render based on state
const ContextMenu = ({ menuState, hideMenu, onAddToken, onDeleteTokens }) => {
    if (!menuState) return null;

    // Determine options based on the menu type ('token' or 'grid')
    const menuItems = [];
    if (menuState.type === 'token') {
        menuItems.push({ label: 'Delete Token(s)', action: () => onDeleteTokens(menuState.tokenIds) }); // Pass token IDs
        // Add other token-specific options here (e.g., Edit, Copy, Change HP)
    } else { // type === 'grid'
        menuItems.push({ label: 'Add Token Here', action: () => onAddToken(menuState.gridCoords) }); // Pass grid coords
        // Add other grid/map options here (e.g., Add Image, Draw Shape)
    }


    return (
        <div
            className="context-menu" // Use CSS class
            style={{ left: menuState.x, top: menuState.y }}
            onContextMenu={e => e.preventDefault()} // Prevent nested context menus
            // No need for global listeners here, useContextMenu hook manages them
            // The hook also handles click outside for hiding
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


export default function VirtualTabletop({ isHexGrid, onToggleGrid, inCombat, onToggleCombat }) { // Receive props from App.jsx

  // 1) Single Source of Truth & History
  // Pass isHexGrid state into initial state so undo/redo works for it
  const [gameState, setGameState, updateGameState, undoGameState, historyInfo] = useStateWithHistory({
    isHexGrid: isHexGrid, // Initialize with prop
    tokens: [],
    // scale and position are now managed by ZoomableContainer internally
    // They are part of gameState history, but ZoomableContainer can update them directly for smoothness
    scale: 1, // Initial scale
    position: { x: 0, y: 0 }, // Initial position
    // Add other global state here (combat status, initiative, etc.)
    // inCombat: false, // Example: combat state could live here too if global
  }, {
    maxHistory: 50,
    onUndo: (prevState) => { console.log('[DEBUG] Undid to state:', prevState); },
    onRedo: (nextState) => { console.log('[DEBUG] Redid to state:', nextState); }
  });

  // Destructure relevant state directly from gameState (these will be updated by setDirectState from hooks)
  const { tokens, scale, position } = gameState;

  // setDirectState is exposed by useStateWithHistory for bypassing history (e.g., pan/zoom)
  const setDirectState = setGameState; // Alias for clarity


  // Update gameState's isHexGrid, inCombat, etc. when props change from App.jsx
  useEffect(() => {
      // Use setDirectState so grid/combat toggling doesn't clutter history
      setDirectState(prev => ({ ...prev, isHexGrid: isHexGrid, inCombat: inCombat }));
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
      initialLoadDoneRef.current = true;
    }
  }, [loadState, setDirectState]); // Dependencies ensure effect runs only when loadState or setDirectState change (should be once)


  // Auto-save entire gameState, debounced 2s
  // Pass the full gameState object to useAutoSave
  useAutoSave(gameState, saveState, 2000);

  // No need for a useCallback version of persistGameState if saveState is already memoized by useCampaignManager


  // Debug watchers (optional, remove for production)
  const prevGameStateRef = useRef(gameState);
  useEffect(() => {
    // Deep comparison can be expensive, log only structure or relevant fields
    if (prevGameStateRef.current.tokens !== tokens) {
      console.log('[DEBUG] Tokens array reference changed. Count:', tokens.length);
    }
     if (prevGameStateRef.current.scale !== scale || prevGameStateRef.current.position !== position) {
         console.log('[DEBUG] Scale/Position changed. Scale:', scale, 'Pos:', position);
     }
    if (prevGameStateRef.current.isHexGrid !== isHexGrid) {
         console.log('[DEBUG] isHexGrid changed to', isHexGrid);
     }
     if (prevGameStateRef.current.inCombat !== inCombat) {
         console.log('[DEBUG] inCombat changed to', inCombat);
     }
     // Keep prevGameStateRef updated with the new state object
     prevGameStateRef.current = gameState;
  }, [gameState, tokens, scale, position, isHexGrid, inCombat]); // Depend on the state slices


  // Grid config (useMemo is good here)
  const gridConfig = useMemo(() => ({
    squareSize: DEFAULT_SQUARE_SIZE,
    hexSize: DEFAULT_HEX_SIZE,
    hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    hexHeight: DEFAULT_HEX_SIZE * 2
  }), []);

  // Grid snapping hook
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid: isHexGrid, // Use the prop
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
  });

  // Dimensions for dynamic grid layout based on window size
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  // Debounced grid dimension update
  const updateGridDimensions = useMemo(() => _.debounce(() => {
    // Consider the size of the tabletop container, not just window
    const container = document.getElementById('tabletop-container');
    if (!container) {
        console.warn('[DEBUG] #tabletop-container not found for dimension update.');
        return;
    }
    const rect = container.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    // Calculate dimensions based on the current grid type prop
    if (isHexGrid) {
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
     console.log('[DEBUG] Grid dimensions updated based on container:', { vw, vh, isHexGrid, currentDimensions: dimensions });
  }, 200), [isHexGrid, gridConfig, dimensions]); // Depend on prop and config, AND current dimensions to avoid stale closure


  // Effect to update grid dimensions on mount and resize, and grid type change
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
    const currentCols = dimensions.cols > 0 ? dimensions.cols : Math.ceil(window.innerWidth / (isHexGrid ? gridConfig.hexWidth : gridConfig.squareSize)) + 5;
    const currentRows = dimensions.rows > 0 ? dimensions.rows : Math.ceil(window.innerHeight / (isHexGrid ? gridConfig.hexHeight * 0.75 : gridConfig.squareSize)) + 5;

    if (isHexGrid) {
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
  }, [dimensions, isHexGrid, gridConfig]); // Depend on dimensions, prop, and config


// Token drag hook
const { startDrag, isDragging } = useTokenDrag({
  scale: scale, // Pass current scale from state
  getSnappedPosition, // Pass the snapping function
  // onDragMove and onDragEnd use setDirectState/updateGameState internally in the hook
  onDragMove: useCallback((tokenId, newPos) => { // Simplified callback signature
     // Callback receives snapped position, update state
     setDirectState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
            t.id === tokenId ? { ...t, position: newPos } : t
        )
     }));
  }, [setDirectState]), // Depend on setDirectState

  onDragEnd: useCallback((tokenId, finalPos) => { // Simplified callback signature
    // Callback receives final snapped position, update state (adds to history)
     if (finalPos) {
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
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee, marqueeState, handleMarqueeMouseMove, handleMarqueeMouseUp, isSelecting } = useTokenSelection({
    // Pass function to get tokens currently in the state
    getTokens: useCallback(() => gameState.tokens, [gameState.tokens]),
    // Pass scale and position for screen->grid conversion in marquee logic
    scale,
    position,
    // Callback to update selected token IDs in the main state
    // This hook manages the `selectedTokenIds` state internally now
    // onSelectTokens: useCallback((ids, additive) => { ... }, []) // Removed as selection is managed internally
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
            stats: { hp: 100, maxHp: 100, name: 'New Token' },
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
      clearSelection(); // Clear selection after deletion
    }, [clearSelection, updateGameState]), // Depend on clearSelection and updateGameState
  });

  // PING LOGIC
  const [pings, setPings] = useState([]);
  const mouseDownRef = useRef(null); // Used for detecting click vs drag/marquee

  const playerColor = '#ff0066'; // Example color
  const createPing = useCallback((gridX, gridY) => {
      console.log('[DEBUG] Creating ping at grid:', { gridX, gridY });
    const newPing = { id: Date.now() + Math.random(), x: gridX, y: gridY, color: playerColor };
    setPings(prev => [...prev, newPing]);
    // Ping component itself will handle the removal via its onComplete prop
  }, [playerColor]);


  // --- Mouse Event Handling on Tabletop Container ---
  // This needs careful orchestration between pan, drag, select, ping, context menu
  // ZoomableContainer handles primary pan/zoom and right-click context menu triggering.
  // We attach other listeners to the #tabletop-container to manage drag, selection, and ping.

  const handleMouseDown = useCallback((e) => {
    console.log('[DEBUG-TABLETOP] MouseDown event:', {
      button: e.button,
      target: e.target,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      defaultPrevented: e.defaultPrevented,
      className: e.target.className,
      id: e.target.id,
    });

    // Ignore right-clicks (button 2) - ZoomableContainer handles pan/context menu for these
    if (e.button === 2) {
        return;
    }

    // Hide context menu on any left mouse down inside the container
    hideMenu();

    // Get container relative position
    const container = document.getElementById('tabletop-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const startScreenX = e.clientX - containerRect.left;
    const startScreenY = e.clientY - containerRect.top;

    // Store initial mouse position and context
    mouseDownRef.current = {
      startScreenX: startScreenX,
      startScreenY: startScreenY,
      initialTimestamp: Date.now(),
      didHandleInteraction: false, // Flag to see if drag/marquee starts
      isAdditiveSelection: e.metaKey || e.ctrlKey || e.shiftKey, // Shift, Ctrl, Meta for additive selection
      clickedTokenId: e.target.closest('.token')?.id, // Store ID if a token was clicked
    };


    const tokenEl = e.target.closest('.token');

    if (tokenEl) {
        // --- TOKEN INTERACTION (Drag/Select) ---
        console.log('[DEBUG] Token mousedown');
        e.preventDefault(); // Prevent default browser drag behavior on elements
        e.stopPropagation(); // Stop propagation to the tabletop background handler

        const clickedTokenId = tokenEl.id;
        const clickedToken = tokens.find(t => t.id === clickedTokenId);
        if (!clickedToken) { console.warn('[DEBUG] Clicked token not found:', clickedTokenId); return; }

        // Update selection state immediately based on click type
        selectTokenId(clickedTokenId, mouseDownRef.current.isAdditiveSelection);

        // Start drag *if* the clicked token is part of the selection *after* the click.
        // The useTokenDrag hook needs the full list of *currently selected* tokens to drag.
        // We'll handle the drag start in handleMouseMove if the mouse moves, or in handleMouseUp if it was just a click (no drag).
        // Let useTokenDrag's global listeners handle the drag itself based on a startDrag call.
        // Just mark that we started a potential token interaction.
         mouseDownRef.current.didHandleInteraction = true;

         // Let the global mousemove listener decide if it becomes a drag
         // We pass the initial token and current selection state via mouseDownRef
         // The useTokenDrag hook's global listeners will check if isDraggingRef is true
         // We don't set isDraggingRef here. It's set inside useTokenDrag's startDrag.

    } else {
      // --- TABLETOP BACKGROUND INTERACTION (Marquee/Ping) ---
       console.log('[DEBUG] Tabletop background mousedown');
       e.preventDefault(); // Prevent default browser drag/selection on background
       // Don't stopPropagation yet, ZoomableContainer needs to see the event for pan setup

       // Clear selection *if* not additive, and mousedown wasn't on a token
       if (!mouseDownRef.current.isAdditiveSelection) {
            clearSelection();
       }

       // Store the start position for potential marquee/ping
        mouseDownRef.current.didHandleInteraction = false; // Reset for background clicks
    }

     // Attach temporary listeners to document body for drag/marquee tracking
     // These are attached here and removed in handleMouseUp
     document.body.addEventListener('mousemove', handleMouseMove, { capture: true }); // Capture mousemove on body
     document.body.addEventListener('mouseup', handleMouseUp, { capture: true }); // Capture mouseup on body

  }, [
    tokens, // Dependency for finding the clicked token
    selectTokenId, // Dependency for updating selection state
    clearSelection, // Dependency for clearing selection
    hideMenu // Dependency for hiding menu
    // Other dependencies like scale, position, startDrag, startMarquee are now handled by refs/callbacks in the hooks
  ]);


  const handleMouseMove = useCallback((e) => {
     // Only process if mouse is down on the container
     if (!mouseDownRef.current) return;

     // If an interaction (token drag or marquee) has already been handled, just let it continue
     if (mouseDownRef.current.didHandleInteraction) {
         // If a marquee is active, delegate the event to its handler
         if (marqueeState) {
              handleMarqueeMouseMove(e);
         }
         // If a token drag is active, useTokenDrag's global listener handles it.
         // Just ensure we prevent default text selection during any potential drag/marquee
         e.preventDefault();
         return;
     }

    // --- Check if click-and-hold on background becomes a drag/marquee ---

    const container = document.getElementById('tabletop-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const currentScreenX = e.clientX - containerRect.left;
    const currentScreenY = e.clientY - containerRect.top;

    const dx = currentScreenX - mouseDownRef.current.startScreenX;
    const dy = currentScreenY - mouseDownRef. mouseDownRef.current.startScreenY;
    const distance = Math.sqrt(dx*dx + dy*dy);

    // If mouse moves beyond threshold AND we haven't handled an interaction yet
    if (distance > DRAG_THRESHOLD) {
        console.log('[DEBUG] Mouse moved significantly, initiating drag/marquee.');

        mouseDownRef.current.didHandleInteraction = true; // Mark that we are handling an interaction

        // If we started the mousedown on a token, this is a token drag
        if (mouseDownRef.current.clickedTokenId) {
             console.log('[DEBUG] Starting token drag.');
             const clickedToken = tokens.find(t => t.id === mouseDownRef.current.clickedTokenId);
             if (clickedToken) {
                  // Pass the currently *selected* tokens to useTokenDrag
                 const tokensToDrag = tokens.filter(t => selectedTokenIds.has(t.id));
                 startDrag(clickedToken, e, tokensToDrag); // Pass the original event and tokens to drag
             } else {
                 console.warn('[DEBUG] Clicked token not found for drag start.');
             }

        } else {
            // Otherwise, this is a marquee selection on the background
            console.log('[DEBUG] Starting marquee selection.');
            // startMarquee requires the original mousedown event (or equivalent screen coordinates)
            // Pass the original start coords stored in mouseDownRef.current
            startMarquee({
                clientX: mouseDownRef.current.startScreenX + containerRect.left,
                clientY: mouseDownRef.current.startScreenY + containerRect.top,
                shiftKey: mouseDownRef.current.isAdditiveSelection // Pass shift key state for additive
            });
        }

        // Prevent default browser selection during drag/marquee
        e.preventDefault();
        e.stopPropagation(); // Stop propagation now that we know we're handling it

    }

    // If distance is small and didn't pass threshold, do nothing - could still be a ping

  }, [
    marqueeState, handleMarqueeMouseMove, startMarquee, // useTokenSelection dependencies
    tokens, selectedTokenIds, startDrag // useTokenDrag dependencies
  ]); // Depend on states/callbacks needed to potentially start drag/marquee


   const handleMouseUp = useCallback((e) => {
       console.log('[DEBUG-TABLETOP] MouseUp event:', {
         button: e.button,
         target: e.target,
         defaultPrevented: e.defaultPrevented,
         className: e.target.className,
         id: e.target.id,
         didHandleInteraction: mouseDownRef.current?.didHandleInteraction // Check flag
       });

       // Remove the temporary document listeners
       document.body.removeEventListener('mousemove', handleMouseMove, { capture: true });
       document.body.removeEventListener('mouseup', handleMouseUp, { capture: true });

       // Handle marquee end if marqueeState is active (meaning handleMouseMove started it)
       if (marqueeState) {
           handleMarqueeMouseUp(e); // Delegate to useTokenSelection hook
           // useTokenSelection hook will remove its own global listeners
           // e.preventDefault(); // Prevent default *may* be needed depending on browser/element
           // Don't return, clean up mouseDownRef
       }
       // Handle token drag end is managed by useTokenDrag's global mouseup listener, no need here.

      // --- Check if it was a CLICK (not drag/marquee) ---
      // If mouse was down, and *no* interaction (drag/marquee) was handled by handleMouseMove
      if (mouseDownRef.current && !mouseDownRef.current.didHandleInteraction) {
          console.log('[DEBUG] MouseUp detected as a click.');

           const container = document.getElementById('tabletop-container');
           if (!container) {
               mouseDownRef.current = null; // Clean up ref
               return;
           }
            const containerRect = container.getBoundingClientRect();
           const endScreenX = e.clientX - containerRect.left;
           const endScreenY = e.clientY - containerRect.top;

           // Check if the click was on a token (even if not dragged)
           const tokenEl = e.target.closest('.token');
           if (tokenEl) {
              // If it was a click on a token but no drag started (distance < threshold),
              // the selection was already updated in handleMouseDown.
              console.log('[DEBUG] Token click finalized.');
              // No further action needed here, selection is updated, drag didn't start.
              e.preventDefault(); // Prevent default browser stuff if it was a handled click
              e.stopPropagation();

           } else {
              // If it was a click on the background (no token, no drag/marquee)
              console.log('[DEBUG] Background click finalized. Creating ping.');
              e.preventDefault(); // Prevent default browser stuff on background click
              e.stopPropagation();

              // Convert screen coords to grid coords for ping using the *end* position
              const gridX = (endScreenX - position.x) / scale;
              const gridY = (endScreenY - position.y) / scale;
              createPing(gridX, gridY);
           }
      }

       // Always clean up mouseDownRef after mouseup
       mouseDownRef.current = null;

   }, [
       marqueeState, handleMarqueeMouseUp, createPing, // Marquee/Ping dependencies
       position, scale, // For converting click position to grid
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
    // e.stopPropagation(); // Stop propagation to prevent other context menu listeners

    const tokenEl = e.target.closest('.token');
    const contextType = tokenEl ? 'token' : 'grid';

    let options = { type: contextType };

    if (contextType === 'token' && tokenEl) {
        // If right-clicked on a token, select it and pass its ID(s) to the menu handler
        const clickedTokenId = tokenEl.id;
        // Decide whether to select only this token, or use the current selection
        // Simple approach: right-clicking *always* selects *only* that token
        // More complex: if right-clicked token is *already* in selection, use the selection; otherwise select only that token.
        // Let's go with the simpler approach for now: Right-click selects only that token.
        clearSelection(); // Clear existing selection
        selectTokenId(clickedTokenId, false); // Select only this one
        options.tokenIds = [clickedTokenId]; // Pass the ID to the menu state

         // If using the complex approach (use current selection if present):
         // const tokenIdsTo OperateOn = selectedTokenIds.has(clickedTokenId) ? Array.from(selectedTokenIds) : [clickedTokenId];
         // if (!selectedTokenIds.has(clickedTokenId)) selectTokenId(clickedTokenId, false); // Select only if not already selected
         // options.tokenIds = tokenIdsToOperateOn;

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
       setScale: newScale => setDirectState(prev => ({ ...prev, scale: newScale })),
       setPosition: newPosition => setDirectState(prev => ({ ...prev, position: newPosition })),
       minScale: MIN_SCALE,
       maxScale: MAX_SCALE,
       zoomFactor: ZOOM_FACTOR,
   });

   // Pass the button handlers down
   const handleZoomIn = useCallback(() => handleZoomButtons(1 + ZOOM_FACTOR * 2), [handleZoomButtons]);
   const handleZoomOut = useCallback(() => handleZoomButtons(1 - ZOOM_FACTOR * 2), [handleZoomButtons]);


  // Cleanup mouse down ref and temporary listeners on component unmount
  useEffect(() => {
      return () => {
          // Ensure temporary mousemove/mouseup listeners are removed if component unmounts mid-interaction
          document.body.removeEventListener('mousemove', handleMouseMove, { capture: true });
          document.body.removeEventListener('mouseup', handleMouseUp, { capture: true });
          mouseDownRef.current = null;
      };
  }, [handleMouseMove, handleMouseUp]); // Depend on the memoized handlers


  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Controls overlay (Zoom, Undo, etc.) */}
      {/* Positioned fixed or absolute within this wrapper */}
      <Controls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
       {/* Undo button example - This is also in Sidebar DM Tools now, keep one place? */}
        {/* Removed duplicate Undo button */}

      {/* The main container for panning and zooming */}
      <ZoomableContainer
        containerId="tabletop-container" // ID is important for hooks
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
      >
        {/* Content INSIDE the zoomable container */}
        {/* Attach core mouse handlers to the tabletop container */}
        <div
          id="tabletop"
          className={isHexGrid ? 'hex-grid' : 'square-grid'} // Use prop
          // Mouse events are handled by the handlers attached to the container element (#tabletop-container)
          // The handlers themselves use event delegation or global listeners attached by hooks.
          // Keeping handlers on #tabletop-container or document.body allows them to intercept
          // events before React's synthetic event system fully processes them on deeply nested children.
           // Or you can attach them directly to the #tabletop div if you prefer React's synthetic events.
           // Attaching to #tabletop-container is often simpler as it's the direct child of the ZoomableContainer.
           // Let's attach them to the #tabletop div instead, as it's the actual scroll/zoom target area
           // Re-attaching to the #tabletop div:
           onMouseDown={handleMouseDown}
           // MouseMove/MouseUp/ContextMenu are handled by global listeners or ZoomableContainer's props
           // onMouseMove={handleMouseMove} // Now handled by body listener attached in handleMouseDown
           // onMouseUp={handleMouseUp} // Now handled by body listener attached in handleMouseDown
           // onContextMenu handled by ZoomableContainer prop -> handleContextMenu

          style={{
            width: totalWidth,
            height: totalHeight,
            position: 'relative',
            // User select moved to CSS class
            // Pointer events might be controlled by ZoomableContainer during pan
          }}
        >
          {/* Grid layer */}
          <Grid
            isHexGrid={isHexGrid} // Use prop
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
              isSelected={selectedTokenIds.has(token.id)} // Check against selected set
              // Token's own click/mousedown handlers can be empty or just stop propagation
              // Mousedown on token is handled by VT's handleMouseDown using event delegation via closest('.token')
               onClick={(e) => e.stopPropagation()}
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
             hideMenu={hideMenu}
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