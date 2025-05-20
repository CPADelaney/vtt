// src/components/VirtualTabletop.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Removed SplitPane import - layout handled by App.jsx

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

// New Context Menu component to render based on state
const ContextMenu = ({ menuState, hideMenu, onAddToken, onDeleteTokens }) => {
    if (!menuState) return null;

    // Determine options based on the menu type ('token' or 'grid')
    const menuItems = [];
    if (menuState.type === 'token') {
        menuItems.push({ label: 'Delete Token(s)', action: onDeleteTokens });
        // Add other token-specific options here (e.g., Edit, Copy, Change HP)
    } else { // type === 'grid'
        menuItems.push({ label: 'Add Token Here', action: onAddToken });
        // Add other grid/map options here (e.g., Add Image, Draw Shape)
    }


    return (
        <div
            className="context-menu" // Use CSS class
            style={{ left: menuState.x, top: menuState.y }}
            onContextMenu={e => e.preventDefault()} // Prevent nested context menus
            // No need for global listeners here, useContextMenu hook manages them
        >
            {menuItems.map((item, index) => (
                <div
                    key={index}
                    className="context-menu-item" // Use CSS class
                    onClick={(e) => {
                        e.stopPropagation(); // Stop click from propagating to tabletop
                        item.action(e); // Pass the event if needed (e.g., for Add Token position)
                        hideMenu();
                    }}
                >
                    {item.label}
                </div>
            ))}
        </div>
    );
};


export default function VirtualTabletop({ isHexGrid, onToggleGrid }) { // Receive props from App.jsx

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
  // Destructure relevant state
  const { tokens, scale, position } = gameState; // isHexGrid is now a prop


  // Update gameState's isHexGrid when the prop changes from App.jsx
  useEffect(() => {
      // Use setDirectState so grid toggling doesn't clutter history
      setGameState(prev => ({ ...prev, isHexGrid: isHexGrid }));
  }, [isHexGrid, setGameState]);


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
      // Use updateGameState to load the state AND add it as the first history entry
      // Or setDirectState if you don't want the *initial* load to be undoable
      // updateGameState(loaded); // If load should be undoable
      setDirectState(loaded); // If load should NOT be undoable
      initialLoadDoneRef.current = true;
    } else {
      console.log('[DEBUG] No saved state found... using defaults');
      initialLoadDoneRef.current = true;
    }
  }, [loadState, setDirectState, initialLoadDoneRef]); // Added setDirectState

  // Auto-save entire gameState, debounced 2s
  // Pass the full gameState object to useAutoSave
  useAutoSave(gameState, persistGameState, 2000);

  // useCallback version of persistGameState for useAutoSave dependency
  const persistGameState = useCallback((full) => {
      // saveState already adds the timestamp and handles comparison
      saveState(full);
  }, [saveState]);


  // Debug watchers (optional, remove for production)
  const prevTokensRef = useRef(tokens);
  useEffect(() => {
    if (prevTokensRef.current !== tokens) {
      console.log('[DEBUG] Tokens changed. Count:', tokens.length);
    }
    prevTokensRef.current = tokens;
  }, [tokens]);

   useEffect(() => {
    // Only log significant changes, not intermediate pan/zoom
    const prevScale = prevTokensRef.current?.scale; // Use prevTokensRef to access previous scale
    const prevPosition = prevTokensRef.current?.position;
    prevTokensRef.current = gameState; // Update ref with current full state

    if (prevScale !== undefined && Math.abs(prevScale - scale) > 0.01) {
       console.log('[DEBUG] Scale changed to', scale);
    }
     if (prevPosition && (Math.abs(prevPosition.x - position.x) > 5 || Math.abs(prevPosition.y - position.y) > 5)) {
        console.log('[DEBUG] Position changed to', position);
    }

  }, [scale, position, gameState]); // Track gameState for all changes


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
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    if (isHexGrid) { // Use the prop
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
     console.log('[DEBUG] Grid dimensions updated:', { vw, vh, isHexGrid, dimensions });
  }, 200), [isHexGrid, gridConfig]); // Depend on prop and config

  // Effect to update grid dimensions on mount and resize
  useEffect(() => {
    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    // Also call updateGridDimensions if isHexGrid changes, as sizes change
    updateGridDimensions();

    return () => {
      updateGridDimensions.cancel();
      window.removeEventListener('resize', updateGridDimensions);
    };
  }, [updateGridDimensions, isHexGrid]); // Depend on prop and memoized function


  // Calculate total grid size for ZoomableContainer
  const { totalWidth, totalHeight } = useMemo(() => {
    if (isHexGrid) { // Use the prop
      // Ensure dimensions are non-zero before calculating
      const currentCols = dimensions.cols > 0 ? dimensions.cols : Math.ceil(window.innerWidth / gridConfig.hexWidth) + 5;
      const currentRows = dimensions.rows > 0 ? dimensions.rows : Math.ceil(window.innerHeight / (gridConfig.hexHeight * 0.75)) + 5;
       return {
        totalWidth: currentCols * gridConfig.hexWidth,
        totalHeight: currentRows * (gridConfig.hexHeight * 0.75),
      };
    } else {
       // Ensure dimensions are non-zero before calculating
      const currentCols = dimensions.cols > 0 ? dimensions.cols : Math.ceil(window.innerWidth / gridConfig.squareSize) + 5;
      const currentRows = dimensions.rows > 0 ? dimensions.rows : Math.ceil(window.innerHeight / gridConfig.squareSize) + 5;
      return {
        totalWidth: currentCols * gridConfig.squareSize,
        totalHeight: currentRows * gridConfig.squareSize,
      };
    }
  }, [dimensions, isHexGrid, gridConfig]); // Depend on prop and dimensions state


// Token drag hook
const { startDrag, isDragging } = useTokenDrag({
  scale: scale, // Pass current scale from state
  getSnappedPosition, // Pass the snapping function
  onDragMove: (tokenId, newPos, isFinal = false) => {
    // console.log('[DEBUG] onDragMove triggered for', tokenId, '=>', newPos, 'isFinal:', isFinal);
    // Use setDirectState for frequent intermediate updates
    setDirectState(prev => ({
      ...prev,
      tokens: prev.tokens.map(t =>
        t.id === tokenId ? { ...t, position: newPos } : t
      )
    }));
  },
  onDragEnd: (tokenId, finalPos) => {
    // Use updateGameState for the final, history-tracked update
     console.log('[DEBUG] onDragEnd triggered for', tokenId, '=>', finalPos);
    if (finalPos) {
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
          t.id === tokenId ? { ...t, position: finalPos } : t
        )
      }));
    }
  }
});


  // Token selection hook (updated to use React state for marquee)
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee, marqueeState, handleMarqueeMouseMove, handleMarqueeMouseUp } = useTokenSelection({
    // Pass function to get tokens currently in the state
    getTokens: useCallback(() => gameState.tokens, [gameState.tokens]),
    // Pass scale and position for screen->grid conversion in marquee logic
    scale,
    position,
    // Callback to update selected token IDs in the main state
    onSelectTokens: useCallback((ids, additive) => {
         // Update state to reflect selected status if needed elsewhere
         // For now, just update the selectedTokenIds set
         // Or we could add a 'isSelected' property to tokens in gameState
         // Let's stick to the Set for now for simplicity in gameState
        clearSelection(); // Assuming marquee replaces selection if not additive
         ids.forEach(id => selectTokenId(id, additive)); // Use the hook's select function
    }, [clearSelection, selectTokenId]),
  });


  // Context menu hook (updated to use React state)
  const { menuState, showMenu, hideMenu } = useContextMenu({
    // Pass callbacks that interact with the main gameState
    onAddToken: useCallback((e) => { // e is the mouse event from the context menu click
      // Need the grid position where the menu was opened.
      // The showMenu function in the hook should pass this.
      // Let's assume showMenu passes gridX, gridY in menuState options
      const container = document.getElementById('tabletop-container');
      const containerRect = container.getBoundingClientRect();

      // Use the stored click position from the context menu event (e.clientX, e.clientY)
      // Convert screen coordinates to grid coordinates
      const screenX = e.clientX - containerRect.left;
      const screenY = e.clientY - containerRect.top;

      const gridX = (screenX - position.x) / scale;
      const gridY = (screenY - position.y) / scale;

      const snappedPos = getSnappedPosition(gridX, gridY);

      updateGameState(prev => ({
        ...prev,
        tokens: [
          ...prev.tokens,
          {
            id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            position: snappedPos,
            stats: { hp: 100, maxHp: 100, name: 'New Token' },
          }
        ]
      }));
    }, [getSnappedPosition, position, scale, updateGameState]),

    onDeleteTokens: useCallback(() => {
      console.log('[DEBUG] Deleting tokens', Array.from(selectedTokenIds));
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.filter(t => !selectedTokenIds.has(t.id))
      }));
      clearSelection();
    }, [selectedTokenIds, clearSelection, updateGameState]),
  });

  // PING LOGIC
  const [pings, setPings] = useState([]);
  const pingTimeoutRef = useRef(null);
  const isPingingRef = useRef(false);
  const mouseDownRef = useRef(null); // Used for detecting click vs drag (ping/marquee)

  const playerColor = '#ff0066'; // Example color
  const createPing = useCallback((gridX, gridY) => {
      console.log('[DEBUG] Creating ping at grid:', { gridX, gridY });
    const newPing = { id: Date.now() + Math.random(), x: gridX, y: gridY, color: playerColor };
    setPings(prev => [...prev, newPing]);
    // Ping component itself will handle the removal via its onComplete prop
  }, [playerColor]);


  // --- Mouse Event Handling on Tabletop ---
  // This needs careful orchestration between pan, drag, select, ping, context menu

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

    // Important: Do NOT preventDefault here initially unless absolutely necessary.
    // Let browser handle default drag/selection unless we start a specific action.

    hideMenu(); // Hide context menu on any mouse down

    const tokenEl = e.target.closest('.token');
    const isAdditive = e.metaKey || e.ctrlKey || e.shiftKey; // Shift, Ctrl, Meta for additive selection

    // If Right-click (button 2), let ZoomableContainer handle pan or trigger ContextMenu
    if (e.button === 2) {
        // ZoomableContainer's onMouseDown will handle preventDefault/stopPropagation for pan.
        // If it doesn't pan (i.e., no significant move), it will trigger its onContextMenu prop.
        // So, we don't need to handle context menu start here directly on button 2.
        // Just capture the initial position for potential later checks if needed.
         mouseDownRef.current = {
            startScreenX: e.clientX,
            startScreenY: e.clientY,
            initialTimestamp: Date.now(),
            hasDragged: false,
        };
        // Do nothing else for button 2 here. ZoomableContainer takes over.
        return;
    }


    // Left-click (button 0) logic
    if (e.button === 0) {

      if (tokenEl) {
        // --- TOKEN INTERACTION (Drag/Select) ---
        console.log('[DEBUG] Token clicked');
        e.stopPropagation(); // Prevent click from propagating to tabletop background

        const clickedTokenId = tokenEl.id;
        const clickedToken = tokens.find(t => t.id === clickedTokenId);
        if (!clickedToken) {
            console.warn('[DEBUG] Clicked token not found in state:', clickedTokenId);
            return;
        }

        const wasSelected = selectedTokenIds.has(clickedTokenId);
        const selectedTokens = tokens.filter(t => selectedTokenIds.has(t.id));

        if (wasSelected && !isAdditive && selectedTokenIds.size === 1) {
           // If clicking on the *already* single selected token without additive key, start drag immediately
           console.log('[DEBUG] Starting drag of single selected token');
           startDrag(clickedToken, e, [clickedToken]);

        } else if (wasSelected && !isAdditive && selectedTokenIds.size > 1) {
            // If clicking on one of *multiple* selected tokens without additive key,
            // Start dragging *all* selected tokens. Selection remains the same.
            console.log('[DEBUG] Starting drag of multiple selected tokens');
            startDrag(clickedToken, e, selectedTokens);

        } else {
            // If clicking on an unselected token (additive or not), or clicking on an already selected
            // token *with* additive key (to toggle its selection), update selection state.
             console.log('[DEBUG] Updating selection state');
             // Select the clicked token (toggling if additive)
            selectTokenId(clickedTokenId, isAdditive);

            // Then, if NOT additive selection (meaning this token is now the *only* selected one),
            // start dragging THIS token. If additive, we wait for the drag hook's global listener
            // to potentially start a multi-drag if the mouse moves significantly while holding
            // multiple tokens. Or simplify and always start drag on mouse down if selection
            // includes the clicked token? Let's simplify: Start drag *if* the clicked token
            // is *part of the selection after this click*.
            // Calculate the *new* selection state before starting drag
            const newSelection = isAdditive ? new Set(selectedTokenIds) : new Set();
             if (isAdditive && selectedTokenIds.has(clickedTokenId)) {
                 newSelection.delete(clickedTokenId);
             } else {
                 newSelection.add(clickedTokenId);
             }

            if (newSelection.has(clickedTokenId)) {
                 // Find the tokens corresponding to the *new* selection
                 const tokensToDrag = tokens.filter(t => newSelection.has(t.id));
                 if (tokensToDrag.length > 0) {
                     console.log('[DEBUG] Starting drag based on new selection');
                     startDrag(clickedToken, e, tokensToDrag);
                 }
             }
        }

         // Prevent default only *after* deciding it was a token interaction we're handling
        e.preventDefault();


      } else {
        // --- TABLETOP INTERACTION (Marquee/Ping) ---
        console.log('[DEBUG] Tabletop background clicked');
        e.preventDefault(); // Prevent default browser drag/selection on background

         // Start a potential marquee or ping
        if (!isAdditive) {
           clearSelection(); // Clear selection if not additive
        }

        // Get container relative position for marquee/ping calculation
        const container = document.getElementById('tabletop-container');
        const containerRect = container.getBoundingClientRect();
        const startScreenX = e.clientX - containerRect.left;
        const startScreenY = e.clientY - containerRect.top;

        // Store initial mouse position and start ping timer
        mouseDownRef.current = {
          startScreenX: startScreenX,
          startScreenY: startScreenY,
          initialTimestamp: Date.now(),
          hasDragged: false, // Flag to determine if it becomes a drag/marquee
        };

        isPingingRef.current = true; // Assume it's a ping initially
        if (pingTimeoutRef.current) {
          clearTimeout(pingTimeoutRef.current);
        }
        // Set a timer to create a ping if the mouse hasn't moved enough by then
        pingTimeoutRef.current = setTimeout(() => {
          // Check if the mouse is still down (using mouseDownRef)
          // AND hasn't moved significantly (hasDragged is false)
          if (isPingingRef.current && mouseDownRef.current && !mouseDownRef.current.hasDragged) {
              console.log('[DEBUG] Ping timer elapsed, creating ping.');
               // Convert screen coords to grid coords for ping
               const gridX = (startScreenX - position.x) / scale;
               const gridY = (startScreenY - position.y) / scale;
              createPing(gridX, gridY);
          }
           isPingingRef.current = false; // Reset ping state after timer
           pingTimeoutRef.current = null; // Clear the ref
        }, 300); // Adjust delay as needed (e.g., 300ms)
      }
    }
  }, [
    clearSelection,
    selectTokenId,
    tokens,
    selectedTokenIds,
    startDrag,
    position, // Dependency for screen->grid conversion
    scale, // Dependency for screen->grid conversion
    createPing,
    hideMenu // Added hideMenu
  ]);


  const handleMouseMove = useCallback((e) => {
     // Handle marquee move if marqueeState is active
     if (marqueeState) {
         handleMarqueeMouseMove(e); // Delegate to useTokenSelection hook
         // Prevent default text selection while marquee is active
         e.preventDefault();
         return; // Don't proceed with ping/drag distance check if marquee is active
     }

    // Check for potential drag/marquee start if mouse is down on background
    if (mouseDownRef.current && !mouseDownRef.current.hasDragged && e.button === 0) {
        const dx = e.clientX - (mouseDownRef.current.startScreenX + document.getElementById('tabletop-container').getBoundingClientRect().left);
        const dy = e.clientY - (mouseDownRef.current.startScreenY + document.getElementById('tabletop-container').getBoundingClientRect().top);
        const distance = Math.sqrt(dx*dx + dy*dy);

        // If mouse moves beyond a small threshold, it's a drag/marquee, not a click/ping
        if (distance > 5) { // Threshold distance (e.g., 5 pixels)
            console.log('[DEBUG] Mouse moved significantly, canceling ping, starting potential marquee/drag.');

            // Cancel the ping timer if it hasn't fired yet
            if (pingTimeoutRef.current) {
                clearTimeout(pingTimeoutRef.current);
                pingTimeoutRef.current = null;
            }
            isPingingRef.current = false;

            // Start marquee selection
            startMarquee(e); // Delegate to useTokenSelection hook

            // Mark that drag/marquee has started
            mouseDownRef.current.hasDragged = true;

             // Prevent default text selection
            e.preventDefault();
        }
    }

     // handleMouseMove for token drag is handled by a global listener in useTokenDrag, no need here.

  }, [marqueeState, handleMarqueeMouseMove, startMarquee]); // Added marqueeState, handleMarqueeMouseMove, startMarquee as dependencies


   const handleMouseUp = useCallback((e) => {
       console.log('[DEBUG-TABLETOP] MouseUp event:', {
         button: e.button,
         target: e.target,
         defaultPrevented: e.defaultPrevented,
         className: e.target.className,
         id: e.target.id,
         hasDragged: mouseDownRef.current?.hasDragged
       });

       // Handle marquee end if marqueeState is active
       if (marqueeState) {
           handleMarqueeMouseUp(e); // Delegate to useTokenSelection hook
           // e.preventDefault(); // Prevent default *may* be needed depending on browser/element
           return; // Don't proceed with ping check if marquee was active
       }

      // If this mouse up corresponds to a click (not drag/marquee) AND it was button 0 on background, and ping timer is active
      if (mouseDownRef.current && !mouseDownRef.current.hasDragged && e.button === 0 && isPingingRef.current) {
          console.log('[DEBUG] MouseUp detected as click (no drag/marquee). Triggering ping if timer pending.');
          // The timeout itself checks isPingingRef.current and hasDragged, so no need to trigger ping here.
          // Just ensure the refs are cleaned up.
      }

       // Clean up ping/marquee refs
       if (pingTimeoutRef.current) {
         clearTimeout(pingTimeoutRef.current);
         pingTimeoutRef.current = null;
       }
       isPingingRef.current = false;
       mouseDownRef.current = null;

        // handleMouseUp for token drag is handled by a global listener in useTokenDrag, no need here.

   }, [marqueeState, handleMarqueeMouseUp, isPingingRef]); // Added marqueeState, handleMarqueeMouseUp, isPingingRef as dependencies


  const handleContextMenu = useCallback((e) => {
      console.log('[DEBUG-TABLETOP] ContextMenu event:', {
          target: e.target,
          className: e.target.className,
          id: e.target.id,
          defaultPrevented: e.defaultPrevented,
          button: e.button,
           hasDragged: mouseDownRef.current?.hasDragged // Check if context menu followed a drag
      });

    // Prevent default browser context menu always
    e.preventDefault();
    e.stopPropagation();

    // Do NOT show custom menu if a drag/pan occurred just before (checked by ZoomableContainer)
    // ZoomableContainer is configured to call this handler *only* if it didn't pan.
    // We still need to check if a *token drag* occurred within the tabletop area though.
    // The useTokenDrag hook manages its own isDragging state (though it's ref-based).
    // A more robust check might be needed if conflicts arise.
    // For now, trust ZoomableContainer to filter out pan-induced context menus.

    const tokenEl = e.target.closest('.token');
    const contextType = tokenEl ? 'token' : 'grid';

    console.log('[DEBUG] Showing context menu, type:', contextType);
    // Pass event directly so context menu hook can get position
    showMenu(e, { type: contextType });

  }, [showMenu]);

   // Handlers for zoom buttons (passed to Controls component)
   const handleZoomIn = useCallback(() => {
     console.log('[DEBUG] Zoom In button clicked');
     // Use setDirectState for scale/position updates from buttons to not clutter history
     setGameState(prev => {
         const container = document.getElementById('tabletop-container');
         const rect = container.getBoundingClientRect();
         const centerX = rect.width / 2;
         const centerY = rect.height / 2;

         const currentScale = prev.scale || 1;
         const newScale = Math.min(currentScale * (1 + ZOOM_FACTOR * 2), MAX_SCALE); // Increased factor for buttons

         if (newScale === currentScale) return prev; // Avoid unnecessary updates

         const currentPosition = prev.position || { x: 0, y: 0 };
         const worldX = (centerX - currentPosition.x) / currentScale;
         const worldY = (centerY - currentPosition.y) / currentScale;

         const scaledX = worldX * newScale;
         const scaledY = worldY * newScale;

         return {
             ...prev,
             scale: newScale,
             position: {
                 x: centerX - scaledX,
                 y: centerY - scaledY
             }
         };
     });
   }, [setGameState]); // setGameState is stable

   const handleZoomOut = useCallback(() => {
     console.log('[DEBUG] Zoom Out button clicked');
      // Use setDirectState for scale/position updates from buttons
     setGameState(prev => {
          const container = document.getElementById('tabletop-container');
         const rect = container.getBoundingClientRect();
         const centerX = rect.width / 2;
         const centerY = rect.height / 2;

         const currentScale = prev.scale || 1;
         const newScale = Math.max(currentScale * (1 - ZOOM_FACTOR * 2), MIN_SCALE); // Increased factor

         if (newScale === currentScale) return prev; // Avoid unnecessary updates

         const currentPosition = prev.position || { x: 0, y: 0 };
         const worldX = (centerX - currentPosition.x) / currentScale;
         const worldY = (centerY - currentPosition.y) / currentScale;

         const scaledX = worldX * newScale;
         const scaledY = worldY * newScale;

         return {
             ...prev,
             scale: newScale,
             position: {
                 x: centerX - scaledX,
                 y: centerY - scaledY
             }
         };
     });
   }, [setGameState]); // setGameState is stable


  // Cleanup mouse down ref on component unmount
  useEffect(() => {
      return () => {
          if (pingTimeoutRef.current) {
            clearTimeout(pingTimeoutRef.current);
          }
          isPingingRef.current = false;
          mouseDownRef.current = null;
      };
  }, []);


  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Controls overlay (Zoom, Undo, etc.) */}
      {/* Positioned fixed or absolute within this wrapper */}
      <Controls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
       {/* Undo button example - could be in controls or DM tools */}
        <button
            onClick={undoGameState}
            disabled={!historyInfo.canUndo}
            style={{
                position: 'fixed',
                top: '10px',
                left: '100px',
                zIndex: 1000,
                padding: '5px 10px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #ccc',
                 borderRadius: '4px',
                 cursor: 'pointer',
                 opacity: historyInfo.canUndo ? 1 : 0.5
            }}
            title="Undo (Ctrl+Z)"
        >
            Undo
        </button>


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
      >
        {/* Content INSIDE the zoomable container */}
        <div
          id="tabletop"
          className={isHexGrid ? 'hex-grid' : 'square-grid'} // Use prop
          // Mouse events are primarily handled here or by hooks/ZoomableContainer
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove} // For detecting marquee start
          onMouseUp={handleMouseUp} // For detecting click vs drag/marquee
          // onContextMenu handled by ZoomableContainer prop
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
              // Token's own click handler - just stop propagation if clicked,
              // Mousedown on token handled by VT's handleMouseDown
              onClick={(e) => { console.log('[DEBUG] Token click event'); e.stopPropagation(); }}
              // onMouseDown handled by VT's handleMouseDown (uses event delegation)
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
             onAddToken={showMenu} // Pass showMenu position, actual add logic is in hook callback
             onDeleteTokens={hideMenu} // Delete logic is in hook callback
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
     const minY = Math.min(currentY, startY);
     const maxY = Math.max(currentY, startY);

    return (
        <div
            className="marquee" // Use CSS class
            style={{
                left: minX,
                top: minY,
                width: maxX - minX,
                height: maxY - minY,
            }}
        />
    );
};