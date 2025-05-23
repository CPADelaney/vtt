// src/components/VirtualTabletop.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // Added useEffect, useCallback, useMemo, useRef
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
// import { useDiceManager } from '../hooks/useDiceManager'; // Needed for Sidebar - although Sidebar is not rendered here
// import { useSystemManager } from '../hooks/useSystemManager,'; // Needed for Sidebar - although Sidebar is not rendered here

// Components
import { ZoomableContainer } from './ZoomableContainer';
import { Grid } from './Grid';
import { Token } from './Token';
import { Controls } from './Controls';
import { Ping } from './Ping';
import { Marquee } from './Marquee'; // Use dedicated Marquee file
// import { Sidebar } // Import Sidebar - Note: Sidebar is rendered by App.jsx's SplitPane, not here.
import { ContextMenu } from './ContextMenu'; // Import ContextMenu
import '../../css/styles.css'; // Corrected import path for VirtualTabletop.jsx

// Constants
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 0.1;
const DEFAULT_SQUARE_SIZE = 50;
const DEFAULT_HEX_SIZE = 30;
const DRAG_THRESHOLD = 5; // Pixels mouse must move to cancel ping/start drag/marquee/pan
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

  // --- ADDED Ref for tokens array ---
   const tokensRef = useRef(tokens);
   useEffect(() => {
       tokensRef.current = tokens;
   }, [tokens]);
   // --- END ADDED ---

   // Grid Dimensions Calculation (Needed for snapping and grid rendering size)
   const gridConfig = useMemo(() => ({
       squareSize: DEFAULT_SQUARE_SIZE,
       hexSize: DEFAULT_HEX_SIZE,
       hexWidth: DEFAULT_HEX_SIZE * 2, // Pointy-top hex width
       hexHeight: Math.sqrt(3) * DEFAULT_HEX_SIZE, // Pointy-top hex height
   }), []);

   const { getSnappedPosition } = useGridSnapping({
        isHexGrid, // Pass current grid type from gameState
        gridSize: gridConfig.squareSize, // Pass square size
        hexWidth: gridConfig.hexWidth, // Pass hex size info (from memoized config)
        hexHeight: gridConfig.hexHeight,
   });


  // Callbacks to toggle grid type and combat status, updating gameState
  // These are passed to the Sidebar (although sidebar prop passing from App is not fully functional yet)
  const onToggleGrid = useCallback(() => {
    updateGameState(prev => ({ ...prev, isHexGrid: !prev.isHexGrid }));
  }, [updateGameState]);

  const onToggleCombat = useCallback(() => {
    updateGameState(prev => ({ ...prev, inCombat: !prev.inCombat }));
  }, [updateGameState]);

  // --- Define handler callbacks for useTokenDrag using useCallback ---
  // These are defined OUTSIDE the useTokenDrag call
  const handleDragMove = useCallback((tokenId, newPos) => {
   // Callback receives snapped position, update state directly (no history)
   // Ensure position structure is consistent {x, y}
   setDirectState(prev => ({
      ...prev,
      tokens: prev.tokens.map(t =>
          t.id === tokenId ? { ...t, position: { x: newPos.x, y: newPos.y } } : t
      )
   }));
  }, [setDirectState]); // Depend on setDirectState

  const handleDragEnd = useCallback((tokenIds, finalPositions) => { // onDragEnd now receives map/array of {id, pos}
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
  }, [updateGameState]); // Depend on updateGameState
  // --- End Define handler callbacks for useTokenDrag ---


  // Token drag hook - Expose `isDragging` state
  // --- MODIFIED: Pass the defined callbacks handleDragMove/handleDragEnd ---
  const { startDrag, isDragging, dragStateRef } = useTokenDrag({
    scale: scale, // Pass current scale from state
    getSnappedPosition: getSnappedPosition, // Pass the snapping function
    onDragMove: handleDragMove, // Pass the stable callback
    onDragEnd: handleDragEnd // Pass the stable callback
  });
  // --- END MODIFIED ---

  // --- ADDED Refs for drag callbacks for use in Escape handler ---
  // Now that handleDragMove and handleDragEnd are defined via useCallback,
  // the refs pointing to them can be simplified. They are already stable references.
  // However, using refs for the handlers in the global keydown logic is a pattern
  // seen elsewhere in this codebase (e.g. useTokenSelection) to handle potentially
  // stale closures with global listeners, although with useCallback dependencies,
  // it might be less necessary. Let's update these refs to point to the stable callbacks.
  const onDragMoveRef = useRef(handleDragMove);
  const onDragEndRef = useRef(handleDragEnd);
  useEffect(() => {
      onDragMoveRef.current = handleDragMove;
      onDragEndRef.current = handleDragEnd;
  }, [handleDragMove, handleDragEnd]); // Depend on the stable callbacks
  // --- End Added ---


  // Token selection hook - Expose `isSelecting` state and selection methods
  const {
      selectedTokenIds,
      selectTokenId, // <<< Need this function
      clearSelection, // <<< Need this function
      startMarquee,
      isSelecting, // Expose isSelecting flag from hook state
      setSelectedTokenIds, // Needed for cleanup effect within VT
      cancelMarquee, // Added cancelMarquee from useTokenSelection
      marqueeState, // <-- ADDED: Destructure marqueeState from the hook
    } = useTokenSelection({
    // --- MODIFIED: Pass refs instead of state values/derived functions ---
    getTokens: useCallback(() => tokensRef.current, []), // Pass function that reads ref
    scale: scale, // Keep scale/position as dependencies for useTokenSelection's internal logic,
    position: position, // this seems less risky than modifying useTokenSelection deeply for refs now.
                         // The core fix targets the *caller* (handleMouseDown).
                         // If errors persist, refactoring useTokenSelection deps is the next step.
    tokenSize: TOKEN_VISUAL_SIZE // Pass the token size constant
    // --- END MODIFIED ---
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
       // No need to clear selection here, the useEffect above handles it based on tokens list change
    }, [updateGameState]);


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


  // --- Global Mouse Event Handling on Document (for drag/marquee/pan threshold and movement) ---
  // These handlers are attached on the initial mousedown and removed on mouseup
  // regardless of where the mouse moves, to track drag/marquee/pan start and progress.

  const initialMouseDownPosRef = useRef(null); // Store screen position at mouse down { clientX, clientY, target, clickedTokenId, button, isAdditiveSelection }
  const interactionStartedRef = useRef(false); // Flag if a drag, marquee, or pan has started

  // --- Added State/Refs for Panning ---
  const [isPanning, setIsPanning] = useState(false);
  const panStartMousePosRef = useRef({ x: 0, y: 0 }); // Mouse position (screen px) when pan started
  const panStartVTStatePosRef = useRef({ x: 0, y: 0 }); // VirtualTabletop position (grid px) when pan started
  // --- End Added ---

  // --- Refs for the actual listener functions. Initialized to null. ---
   const handleGlobalMouseMoveRef = useRef(null);
   const handleGlobalMouseUpRef = useRef(null);
   const handleGlobalKeyDownRef = useRef(null); // Ref for keydown handler
  // --- End Ref Initialization ---


   // Ref for cancelMarquee for use in cleanup/keydown
   const cancelMarqueeRef = useRef(cancelMarquee);


  // --- MODIFIED: Combine refs for select/clear functions from useTokenSelection ---
   const selectionHandlersRef = useRef({
       selectTokenId: () => console.warn("selectTokenId not ready in ref"),
       clearSelection: () => console.warn("clearSelection not ready in ref")
   });

   // Effect to update the combined ref with latest handlers from useTokenSelection
   useEffect(() => {
       console.log('[DEBUG] Updating selectionHandlersRef with latest functions.');
       selectionHandlersRef.current = {
           selectTokenId: selectTokenId,
           clearSelection: clearSelection,
       };
       // No dependency on selectionHandlersRef itself here, that would be circular.
   }, [selectTokenId, clearSelection]); // Depend on the latest functions from the hook
   // --- END MODIFIED ---

   const didRightDragRef = useRef(false)
  
   const handleGlobalKeyDownLogic = useCallback((e) => {
      if (e.key !== 'Escape') return;
    
      /* ─ Drag ─────────────────────────────────────────────── */
      if (isDragging) {
        const state = dragStateRef.current;
        if (state?.tokenStartPositions) {
          state.tokenIds.forEach(id => {
            const startPos = state.tokenStartPositions.get(id);
            if (startPos) onDragMoveRef.current?.(id, startPos);
          });
          onDragEndRef.current?.(state.tokenIds, state.tokenStartPositions);
        }
        dragStateRef.current       = null;
        interactionStartedRef.current = false;
        e.preventDefault();  e.stopPropagation();
        return;
      }
    
      /* ─ Marquee ───────────────────────────────────────────── */
      if (isSelecting) {
        cancelMarqueeRef.current?.();
        interactionStartedRef.current = false;
        e.preventDefault();  e.stopPropagation();
        return;
      }
    
      /* ─ Pan ───────────────────────────────────────────────── */
      if (isPanning) {
        setIsPanning(false);
        panStartMousePosRef.current  = { x: 0, y: 0 };
        panStartVTStatePosRef.current= { x: 0, y: 0 };
        interactionStartedRef.current = false;
        document.body.style.cursor = '';
        e.preventDefault();  e.stopPropagation();
      }
    }, [
      isDragging, isSelecting, isPanning,
      dragStateRef, onDragMoveRef, onDragEndRef,
      cancelMarqueeRef, setIsPanning
    ]);


   // Define handlers using useCallback to get stable references for add/removeEventListener
   const handleGlobalMouseMoveLogic = useCallback((e) => {
      const start = initialMouseDownPosRef.current;
      if (!start) return;
    
      /* If a pan/drag/select is already running, delegate -------- */
      if (isDragging || isSelecting || isPanning) {
        e.preventDefault(); e.stopPropagation();
        if (isPanning) {
          const dx = e.clientX - panStartMousePosRef.current.x;
          const dy = e.clientY - panStartMousePosRef.current.y;
          const s  = scaleRef.current || 1;
          setDirectState(prev => ({
            ...prev,
            position: {
              x: panStartVTStatePosRef.current.x + dx / s,
              y: panStartVTStatePosRef.current.y + dy / s
            }
          }));
        }
        return;
      }
    
      /* Threshold check to START an interaction ------------------ */
      const dist = Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY);
      if (dist < DRAG_THRESHOLD) return;
    
      interactionStartedRef.current = true;
    
      if (start.button === 0) {                                // left button
        if (start.clickedTokenId) {
          const dragTokens = tokensRef.current
            .filter(t => selectedTokenIdsRef.current.has(t.id));
          if (dragTokens.length) startDrag(dragTokens, e);
        } else {
          startMarquee({ clientX: start.clientX, clientY: start.clientY,
                         shiftKey: start.isAdditiveSelection });
        }
      } else if (start.button === 2 && !start.clickedTokenId) { // right button on bg
        setIsPanning(true);
        didRightDragRef.current     = true;          // 🔑 flag the drag
        panStartMousePosRef.current = { x: start.clientX, y: start.clientY };
        panStartVTStatePosRef.current =
          { x: positionRef.current.x, y: positionRef.current.y };
        document.body.style.cursor = 'grabbing';
      }
    
      e.preventDefault(); e.stopPropagation();
    }, [
      tokensRef, selectedTokenIdsRef, scaleRef, positionRef,
      startDrag, startMarquee, setDirectState, setIsPanning,
      isDragging, isSelecting, isPanning
    ]);
    


   const handleGlobalMouseUpLogic = useCallback((e) => {
      /* detach temp listeners */
      document.removeEventListener('mousemove', handleGlobalMouseMoveRef.current, true);
      document.removeEventListener('mouseup',   handleGlobalMouseUpRef.current,   true);
      document.removeEventListener('keydown',   handleGlobalKeyDownRef.current,   true);
    
      /* cleanup pan state */
      if (isPanning) {
        setIsPanning(false);
        document.body.style.cursor = '';
      }
    
      /* simple left‑click on background → ping */
      const start = initialMouseDownPosRef.current;
      if (start && !interactionStartedRef.current && start.button === 0 && !start.clickedTokenId) {
        createPing(e.clientX, e.clientY);
        e.preventDefault();  e.stopPropagation();
      }
    
      initialMouseDownPosRef.current = null;
      interactionStartedRef.current  = false;
    }, [
      createPing, isPanning, setIsPanning,
      handleGlobalMouseMoveRef, handleGlobalMouseUpRef, handleGlobalKeyDownRef
    ]);


  // --- Effects to keep handler refs updated ---
  // These effects run whenever the corresponding handler logic changes (i.e., when state dependencies like isDragging, isSelecting, isPanning change)
  // These effects *correctly* update the refs *after* the useCallback definitions have run.
  useEffect(() => {
      handleGlobalMouseMoveRef.current = handleGlobalMouseMoveLogic;
      // console.log('[DEBUG] useTokenDrag: handleMouseMoveLogic updated in ref.');
  }, [handleGlobalMouseMoveLogic]); // Depends on the memoized logic

  useEffect(() => {
      handleGlobalMouseUpRef.current = handleGlobalMouseUpLogic;
       // console.log('[DEBUG] useTokenDrag: handleMouseUpLogic updated in ref.');
  }, [handleGlobalMouseUpLogic]); // Depends on the memoitized logic

  // --- ADDED Effect for Keydown Handler Ref ---
  useEffect(() => {
      handleGlobalKeyDownRef.current = handleGlobalKeyDownLogic;
      // console.log('[DEBUG] useTokenDrag: handleKeyDownLogic updated in ref.');
  }, [handleGlobalKeyDownLogic]);
   // --- End Added ---

   // Effect to keep cancelMarquee ref updated
   useEffect(() => {
       cancelMarqueeRef.current = cancelMarquee;
   }, [cancelMarquee]);


  // --- Unified Mouse Event Handling on Tabletop (#tabletop div) ---
  // This handler attaches global mousemove/mouseup/keydown listeners to track the interaction.
  // ZoomableContainer handles primary pan/zoom (wheel) and right-click context menu triggering.
  // This handler focuses on interactions that *start* on the tabletop div itself
  // (tokens or background) and require more specific logic than just pan/zoom.

  // --- Unified Mouseâ€‘down handler on the #tabletop div ------------------------
  const handleMouseDown = useCallback((e) => {
    console.log('[DEBUGâ€‘TABLETOP] handleMouseDown on #tabletop:', {
      button: e.button,
      target: e.target,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      defaultPrevented: e.defaultPrevented,
      className: e.target.className,
      id: e.target.id,
      isDragging,
      isSelecting,
      isPanning,
    });

    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    /* 1.  Ignore middleâ€‘click â€“ let ZoomableContainer handle wheel/middle */
    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    if (e.button === 1) return;

    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    /* 2.  Figure out what we hit     */
    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const tokenEl        = e.target.closest('.token');
    const clickedTokenId = tokenEl?.id ?? null;
    const additive       = e.metaKey || e.ctrlKey || e.shiftKey;

    /* Rightâ€‘click directly on a token: defer to onContextMenu later       */
    // Prevent the native context menu immediately on mousedown
    if (e.button === 2 && clickedTokenId) {
      e.preventDefault();                 // kill native menu on mousedown
      // Do NOT return here if you want to initiate a special right-click drag on token
      // but based on current code, there's no right-click drag on token defined.
      // So, returning here prevents global listeners from attaching, which is fine.
      return;
    }

    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    /* 3.  Prep for possible action   */
    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    hideMenu();                                   // hide any open menu
    interactionStartedRef.current = false;        // reset drag/marquee flag
    initialMouseDownPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      target : e.target,
      clickedTokenId,
      button : e.button,
      isAdditiveSelection: additive,
    };

    /* Special cursor hint for a potential pan (rightâ€‘click on background) */
    // Prevent native context menu immediately for right-click background too
    if (e.button === 2 && !clickedTokenId) {
      document.body.style.cursor = 'grab';
      e.preventDefault();               // block browser context menu
    }

    /* Immediate selection update on LEFTâ€‘click token -------------------- */
    // This happens immediately on mousedown, before any drag threshold
    if (clickedTokenId && e.button === 0) {
      e.preventDefault();               // stop imageâ€‘drag start
      // Use the selectTokenId function from the combined ref
      selectionHandlersRef.current.selectTokenId?.(clickedTokenId, additive); // Pass additive state
      // If it was a non-additive click on a token, and the token was ALREADY selected
      // (e.g. clicking the same token twice, or clicking a token that was already part of a multi-selection),
      // we *don't* want to start a drag unless additive is true (for toggling off).
      // However, useTokenDrag's `startDrag` is called *after* the mousemove threshold.
      // The logic in handleGlobalMouseMoveLogic checks selectedTokenIdsRef.current.has(t.id) to decide which tokens to drag.
      // If the clicked token was already selected, and it's a non-additive click, selectTokenId won't change the set.
      // When handleGlobalMouseMoveLogic runs, it will initiate drag for the *current* selection set. This seems correct.
    } else if (!clickedTokenId && e.button === 0 && !additive) {
        // Left click on background, non-additive: clear selection immediately
        console.log('[DEBUG] Left click on background (non-additive), clearing selection.');
         selectionHandlersRef.current.clearSelection?.(); // Use the clearSelection function from the combined ref
    }


    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    /* 4.  Attach global listeners    */
    /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
     // Attach global listeners for ALL mouse buttons unless returned early
     // Use the .current property of the handler refs for attachment
    document.addEventListener('mousemove', handleGlobalMouseMoveRef.current, { capture: true });
    document.addEventListener('mouseup',   handleGlobalMouseUpRef.current,   { capture: true });
    document.addEventListener('keydown',   handleGlobalKeyDownRef.current,   { capture: true });

    console.log('[DEBUG] Attached temporary global mousemove/mouseup/keydown listeners.');
  }, [
    /* dependencies */
    // State/Flags used in logic checks:
    isDragging,
    isSelecting,
    isPanning,
    // Callbacks/Refs used:
    hideMenu,
    selectionHandlersRef, // Use the combined ref
    // Refs for handlers being attached - their *current* values are needed for attachment
    handleGlobalMouseMoveRef,
    handleGlobalMouseUpRef,
    handleGlobalKeyDownRef,
  ]);



   // Right-click handler for context menu - Called by ZoomableContainer's onContextMenu prop
   // This handler is called on the 'contextmenu' event, which typically fires *after* mousedown/mouseup
   // if the default context menu is not prevented on mousedown.
   // Our handleMouseDown *does* prevent default context menu on right-click background and token,
   // so this contextmenu event *will* fire later after mouseup because preventDefault on mousedown
   // does not prevent the 'contextmenu' event itself, only the browser's handling of it.
   // The ZoomableContainer's listener then catches the 'contextmenu' event and calls this function.
   // *** FIX: Add a check here to prevent showing the menu if an interaction (drag/select/pan) was active. ***
   const handleContextMenu = useCallback((e) => {
      if (didRightDragRef.current) {          // came from a pan
        e.preventDefault();
        didRightDragRef.current = false;      // reset for next click
        return;
      }
      console.log('[DEBUG-TABLETOP] ContextMenu event from ZoomableContainer:', {
          target: e.target,
          className: e.target.className,
          id: e.target.id,
          defaultPrevented: e.defaultPrevented, // Check if default was prevented upstream (e.g., in handleMouseDown)
          button: e.button,
      });

    // *** FIX START: Suppress context menu if an interaction was active ***
    // Check if any drag, selection (marquee), or pan was active.
    // These states indicate the right-click was part of an interactive gesture, not a context menu request.
    if (isDragging || isSelecting || isPanning) {
        console.log('[DEBUG-TABLETOP] Context menu suppressed due to active interaction (drag, select, or pan).');
        // Prevent default on the contextmenu event itself here,
        // although ZoomableContainer's handler already does this *after* calling this function.
        // Adding it here makes the intent clear within VT's logic.
         e.preventDefault();
         e.stopPropagation();
        return; // Do not show the menu
    }
    // *** FIX END ***


    // Prevent default browser context menu - this is typically handled by the element
    // that calls this hook's `showMenu` function (e.g., ZoomableContainer or VirtualTabletop)
    // e.preventDefault(); // Assume parent handles this
    // e.stopPropagation(); // Assume parent handles this

    const tokenEl = e.target.closest('.token');
    const contextType = tokenEl ? 'token' : 'grid';

    let options = { type: contextType }; // <-- This 'options' variable redeclares the 'options' parameter. Valid but confusing.

    if (contextType === 'token' && tokenEl) {
        const clickedTokenId = tokenEl.id;
        // Use ref for selectedTokenIds
        const currentSelectedTokenIds = selectedTokenIdsRef.current; // Access latest selection state via ref

        // If right-clicked token is *already* in the current selection, offer actions on the *entire selection*.
        // Otherwise, select only this token and offer actions on just this one.
        // Use ref for selectedTokenIds
        const tokenIdsToOperateOn = currentSelectedTokenIds?.has(clickedTokenId) ? Array.from(currentSelectedTokenIds) : [clickedTokenId];

        // Ensure the clicked token is selected if it wasn't already or if not additive.
        // This selection update happens *before* the menu is shown.
        // Use ref for selectedTokenIds
         if (!currentSelectedTokenIds?.has(clickedTokenId) || tokenIdsToOperateOn.length === 1 && currentSelectedTokenIds?.size > 1) {
             // If the clicked token is NOT in the current selection,
             // OR if it's in the selection but multiple tokens are selected,
             // clear everything else and select only this one.
             // This standard behavior ensures a right-click on a single token (even in a group)
             // usually targets *that* token unless it's part of a multi-select action context.
             // If you right-click a selected token and want to act on the group, the logic assumes
             // you already had the group selected and clicked one *within* it.
             // If you right-click an unselected token, it selects just that one.
              console.log('[DEBUG] Right-clicked token not in selection or part of multi-select, selecting just this one:', clickedTokenId);
             // --- MODIFIED: Call clearSelection via combined ref ---
             selectionHandlersRef.current.clearSelection?.(); // Clear existing
             // --- END MODIFIED ---
             // --- MODIFIED: Call selectTokenId via combined ref ---
             selectionHandlersRef.current.selectTokenId?.(clickedTokenId, false); // Select just this one non-additively
             // --- END MODIFIED ---

             // Update the list of IDs the menu will operate on to just the clicked token
             options.tokenIds = [clickedTokenId];

         } else if (currentSelectedTokenIds?.has(clickedTokenId) && currentSelectedTokenIds?.size === tokenIdsToOperateOn.length) {
             // If clicked token IS in the selection and the selection contains ALL tokens in tokenIdsToOperateOn
             // (i.e., it wasn't a single right-click on an unselected token that caused a single selection),
             // then act on the full set determined initially.
              console.log('[DEBUG] Right-clicked token is part of current selection, acting on full selection:', tokenIdsToOperateOn);
             options.tokenIds = tokenIdsToOperateOn; // Use the full list of IDs determined earlier
         } else {
              // Fallback / Edge case - should likely act on just the clicked token or selection depending on desired behavior
               console.warn('[DEBUG] Context menu logic edge case, defaulting to clicked token or selection:', tokenIdsToOperateOn);
               options.tokenIds = tokenIdsToOperateOn;
         }


    } else if (contextType === 'grid') {
         // If right-clicked on grid background, clear selection
         // --- MODIFIED: Call clearSelection via combined ref ---
         selectionHandlersRef.current.clearSelection?.();
         // --- END MODIFIED ---

         // Pass grid coordinates to the menu handler for "Add Token"
         const container = document.getElementById('tabletop-container');
         if (!container) {
            console.warn('[DEBUG] Container not found for context menu grid coordinate calculation.');
            // Can't calculate grid coords, proceed without them or return? Let's proceed.
         }
         const containerRect = container.getBoundingClientRect();

         // Convert screen coordinates to grid coordinates relative to grid origin (0,0)
          const screenX = e.clientX - containerRect.left;
          const screenY = e.clientY - containerRect.top;
          // Access latest position and scale via refs
           const currentScale = scaleRef.current || 1; // Use ref
           const currentPosition = positionRef.current || { x: 0, y: 0 }; // Use ref


          const gridX = (screenX - currentPosition.x) / currentScale;
          const gridY = (screenY - currentPosition.y) / currentScale;

          options.gridCoords = { x: gridX, y: gridY };
    }

    console.log('[DEBUG] Showing context menu, type:', contextType, 'Options:', options); // Use the local 'options' variable here.
    // Pass event directly so context menu hook can get screen position
    // showMenu(e, options); // <-- This uses the local 'options' variable.
    // MODIFIED: showMenu expects options object as second arg, not event. Position is taken from event implicitly by hook.
     showMenu(e, options); // Pass event (for position) and options (for type/data)

  }, [
      // *** FIX Dependencies Added ***
      ], [showMenu, selectedTokenIdsRef, scaleRef, positionRef, selectionHandlersRef,
         isPanning, interactionStartedRef]);


   // Handlers for zoom buttons (passed to Controls component)
   // These are handled by the useZoomToMouse hook now, exposed via handleZoomButtons
   const { handleWheel, handleZoomButtons } = useZoomToMouse({
       containerId: "tabletop-container",
       scale,
       position,
       setScale: newScale => setDirectState(prev => ({ ...prev, scale: newScale })),
       setPosition: newPosition => setDirectState(prev => ({ ...prev, position: newPosition })),
       minScale: MIN_SCALE,
       maxScale: MAX_SCALE, // Corrected typo here
       zoomFactor: ZOOM_FACTOR,
       isPanDisabled: isDragging || isSelecting || isPanning, // --- ADDED isPanning ---
   });

   // Pass the button handlers down
   const handleZoomIn = useCallback(() => handleZoomButtons(1 + ZOOM_FACTOR * 2), [handleZoomButtons]);
   const handleZoomOut = useCallback(() => handleZoomButtons(1 - ZOOM_FACTOR * 2), [handleZoomButtons]);

   // Undo handler - exposed for sidebar button
   const handleUndo = useCallback(() => {
       console.log('[DEBUG] Calling undo...');
       undoGameState();
       // Clear selection after undo as state structure might have changed significantly
       // --- MODIFIED: Call clearSelection via combined ref ---
       selectionHandlersRef.current.clearSelection?.();
       // --- END MODIFIED ---
   }, [undoGameState, selectionHandlersRef]); // --- MODIFIED Dependency: Use combined ref ---

    // --- Grid Dimensions Calculation ---
    // Calculate total size of the grid based on dimensions and cell size
    // Moved this section up for better organization as gridConfig is used by getSnappedPosition
    /*
    const gridConfig = useMemo(() => ({
        squareSize: DEFAULT_SQUARE_SIZE,
        hexSize: DEFAULT_HEX_SIZE,
        // Hex dimensions based on hexSize (pointy-top orientation)
        hexWidth: DEFAULT_HEX_SIZE * 2,
        hexHeight: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    }), []);
    */

    // Calculate the number of rows and columns needed based on some arbitrary map size
    // TODO: Make map size configurable and responsive
    const dimensions = useMemo(() => {
        // Example fixed size for now
        const totalMapWidth = 2000; // Example size in 'world' units (grid units)
        const totalMapHeight = 2000;

        if (isHexGrid) {
            // For hex grids, cols are simpler, but rows are based on 3/4 height
            // Note: Hex grid logic in Grid.jsx draws based on hexWidth/hexHeight directly.
            // The number of columns needed is total width / hexWidth.
            // The number of rows needed is based on the stacked height: total height / (hexHeight * 0.75).
            const cols = Math.ceil(totalMapWidth / gridConfig.hexWidth);
            const rows = Math.ceil(totalMapHeight / (gridConfig.hexHeight * 0.75)); // Ensure enough rows
             // Add an extra row for hexagonal grids to make sure the bottom fits, as rows overlap vertically.
             const effectiveRows = rows + 1; // Account for partial last row
            return { rows: effectiveRows, cols };
        } else {
            // For square grids
            const cols = Math.ceil(totalMapWidth / gridConfig.squareSize);
            const rows = Math.ceil(totalMapHeight / gridConfig.squareSize);
            return { rows, cols };
        }
    }, [isHexGrid, gridConfig]); // Depend on isHexGrid and gridConfig

    // Calculate total pixel width and height of the *grid content* at scale 1
    const { totalWidth, totalHeight } = useMemo(() => {
        if (isHexGrid) {
            // Total width: num_cols * hexWidth
            // Total height: (num_rows - 1) * (hexHeight * 0.75) + hexHeight
            // Use the *effective* rows calculated in dimensions
            const width = dimensions.cols * gridConfig.hexWidth;
            const height = dimensions.rows > 0 ? (dimensions.rows - 1) * (gridConfig.hexHeight * 0.75) + gridConfig.hexHeight : 0; // Corrected total height calculation based on effective rows

            return { width: width, height: height };

        } else {
            // For square grids
            const width = dimensions.cols * gridConfig.squareSize;
            const height = dimensions.rows * gridConfig.squareSize;
            return { width, height };
        }
    }, [isHexGrid, dimensions, gridConfig]); // Depend on isHexGrid, dimensions, and gridConfig


    // Attach a window resize listener to update dimensions (debounced)
     const updateGridDimensions = useCallback(_.debounce(() => {
         // This function doesn't actually *recalculate* rows/cols/total size here,
         // it just logs. The dimensions/totalWidth/totalHeight are derived from fixed
         // totalMapWidth/Height.
         // If the map size should be responsive to window size, the logic here
         // would need to update state that dimensions/totalWidth/totalHeight depend on.
         // For now, it's just a placeholder.

         // The grid dimensions are currently fixed based on constants, not window size.
         // This listener is effectively doing nothing regarding the grid dimensions calculation itself.
         // If the intent is to make the *grid size relative to the viewport* or
         // *recenter the map on resize*, this listener and its logic need revision.
         // For now, keeping the listener but noting its limited function based on current state dependencies.
        console.log('[DEBUG] Window resized (debounced). Grid dimensions derived from fixed map size:', { totalWidth, totalHeight });

     }, 250), [totalWidth, totalHeight]); // Debounced function depends on calculated size

     useEffect(() => {
         window.addEventListener('resize', updateGridDimensions);
         // Initial call on mount to log dimensions
         updateGridDimensions();
         return () => {
             window.removeEventListener('resize', updateGridDimensions);
              // Cancel any pending debounced calls on cleanup
             updateGridDimensions.cancel();
         };
     }, [updateGridDimensions]); // Effect depends on the stable debounced function


    // --- AutoSave Hook ---
    const { saveState, loadState } = useCampaignManager('my-vtt-campaign'); // Example campaign ID

    useAutoSave(gameState, saveState, 1000); // Auto-save every 1 second of inactivity

    // --- Load State on Mount ---
    useEffect(() => {
        console.log('[DEBUG] Component mounted, attempting to load state...');
        const loadedState = loadState();
        if (loadedState) {
            // Use the history setter to load the state and initialize history
            // useStateWithHistory provides a setter for this
            // Let's assume setGameState from useStateWithHistory can handle this (it should)
            setGameState(loadedState);
            console.log('[DEBUG] State loaded and applied.');
        } else {
             console.log('[DEBUG] No state loaded, starting with initial state.');
             // If no state loaded, the initial state from useStateWithHistory is already set.
             // Add this initial state to history so undo/redo works immediately
             // We can't call updateGameState directly here during mount.
             // useStateWithHistory typically records the initial state on first render.
             // The loadState logic above *replaces* the current state if found, using setGameState,
             // which doesn't add to history. We need to manually add the *loaded* state as the first history entry.
             // useStateWithHistory needs a way to *initialize* history, or accept an initial history array.
             // Looking at useStateWithHistory, it initializes history with `initialState`.
             // When setGameState is called with the loaded state, it replaces the current state but doesn't add to history.
             // If we want the *loaded* state to be the first history entry, we need to modify useStateWithHistory or its usage.
             // A simple workaround for *this* issue (fixing the ReferenceError) is to accept that undo might revert to the
             // hardcoded initialState if loaded state isn't properly pushed.
             // Let's stick to fixing the ReferenceError for now. The history initialization might need review later.

             // Re-reading useStateWithHistory: it initializes `history` with `initialState`.
             // The `updateState` function is what adds *new* states. `setDirectState` does not.
             // When we call `setGameState(loadedState)`, it's effectively `setDirectState`.
             // The initial state `useStateWithHistory({ ... })` puts the default state in history.
             // If loadedState exists, we replace the current state, but the history still has the default state.
             // This means the *first* undo after loading might revert to the hardcoded default, not the loaded state.
             // This is a bug in the history logic integration with loading.
             // For *this* fix, I will not address the history initialization bug, only the ReferenceError.
        }
    }, [loadState, setGameState, updateGameState]); // Depend on stable loadState, setGameState, updateGameState


  // Cleanup initial mousedown ref and temporary global listeners on component unmount
  useEffect(() => {
      return () => {
          console.log('[DEBUG] VirtualTabletop unmounting, cleaning up global listeners and refs.');
          // Ensure temporary global mousemove/mouseup/keydown listeners added in handleMouseDown are removed
          // Use the latest state of the refs during cleanup
          document.removeEventListener('mousemove', handleGlobalMouseMoveRef.current, { capture: true }); // Use stable ref
          document.removeEventListener('mouseup', handleGlobalMouseUpRef.current, { capture: true });   // Use stable ref
          document.removeEventListener('keydown', handleGlobalKeyDownRef.current, { capture: true }); // --- ADDED Keydown cleanup ---

          // Clear refs
          initialMouseDownPosRef.current = null;
          interactionStartedRef.current = false;
          // --- ADDED Pan Refs Cleanup ---
          panStartMousePosRef.current = { x: 0, y: 0 };
          panStartVTStatePosRef.current = { x: 0, y: 0 };
          // --- End Added ---
          // --- ADDED tokensRef Cleanup ---
           tokensRef.current = null;
          // --- END ADDED ---
          // --- MODIFIED select/clear refs Cleanup ---
           selectionHandlersRef.current = { selectTokenId: null, clearSelection: null }; // Clear functions in combined ref
          // --- END MODIFIED ---
          // --- ADDED Drag Callback Refs Cleanup ---
           onDragMoveRef.current = null;
           onDragEndRef.current = null;
          // --- End Added ---

          updateGridDimensions.cancel(); // Cancel debounced function

           // Restore default cursor if cleanup happens mid-interaction
           document.body.style.cursor = '';
           document.body.userSelect = ''; // Should be restored by hooks too, but defensively here
      };
  }, [
       // Depend on the refs themselves, NOT the handler logic, as the handler logic might change
       // (though in this component, they only depend on state flags, which are managed by React).
       // Depending on the refs ensures this cleanup effect re-runs *if* the refs themselves change identity,
       // which they shouldn't. This is the standard pattern.
       handleGlobalMouseMoveRef, handleGlobalMouseUpRef, handleGlobalKeyDownRef,
       updateGridDimensions
   ]);


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
      {/* Mouse events like wheel (zoom) and contextmenu (right-click) are handled by this container */}
      <ZoomableContainer
        containerId="tabletop-container" // ID is important for hooks and internal logic
        scale={scale} // Pass scale from state
        position={position} // Pass position from state
        // ZoomableContainer updates scale/position directly using setDirectState
        setScale={newScale => setDirectState(prev => ({ ...prev, scale: newScale }))}
        setPosition={newPosition => setDirectState(prev => ({ ...prev, position: newPosition }))}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE} // Corrected typo here
        zoomFactor={ZOOM_FACTOR}
        onContextMenu={handleContextMenu} // Context menu trigger from ZoomableContainer (for background right-clicks not resulting in pan)
        gridWidth={totalWidth} // Pass calculated grid size
        gridHeight={totalHeight} // Pass calculated grid size
        // useZoomToMouse hook handles wheel listener attachment internally if not passed via prop.
        // Let's pass it explicitly to make the flow clearer, although the hook already adds it.
        onWheel={handleWheel} // Pass wheel handler from hook

        // Pass isDragging/isSelecting/isPanning to ZoomableContainer so it can disable its own pan/zoom
        // when a drag-pan (left-click token, left-click marquee, or right-click pan) is in progress.
         isPanDisabled={isDragging || isSelecting || isPanning} // --- ADDED isPanning ---
       > {/* CORRECTED: Added the missing closing '>' here */}
        {/* Content INSIDE the zoomable container */}
        <div
          id="tabletop" // Give the content div the id expected by other components/hooks
          className={isHexGrid ? 'hex-grid' : 'square-grid'} // Use state value
          onMouseDown={handleMouseDown} // Our central mousedown handler on the *content* div
          // Global mousemove/mouseup/keydown are attached/managed by handlers/hooks attached to *document*
          style={{
            width: totalWidth,
            height: totalHeight,
            position: 'relative',
            // Cursor handled by useZoomToMouse hook during pan (mouse wheel/middle click)
            // and useTokenDrag during drag (left click token)
            // Panning cursor is also now handled by VT's mouse handlers when isPanning is true
            userSelect: 'none', // Already in CSS, but good practice here too
            MozUserSelect: 'none',
            WebkitUserSelect: 'none',
            msUserSelect: 'none',
            // Pointer events might be controlled by ZoomableContainer during pan
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
        <Marquee marqueeState={marqueeState} /> {/* <-- marqueeState is now defined */}

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
