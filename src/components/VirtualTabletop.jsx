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


  // Callbacks to toggle grid type and combat status, updating gameState
  // These are passed to the Sidebar (although sidebar prop passing from App is not fully functional yet)
  const onToggleGrid = useCallback(() => {
    updateGameState(prev => ({ ...prev, isHexGrid: !prev.isHexGrid }));
  }, [updateGameState]);

  const onToggleCombat = useCallback(() => {
    updateGameState(prev => ({ ...prev, inCombat: !prev.inCombat }));
  }, [updateGameState]);

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

   // Define Global Keydown Handler Logic for Escape (cancel interactions)
   const handleGlobalKeyDownLogic = useCallback((e) => {
        // Access state directly via dependency array if needed, or use refs if state updates lag
        // Using state directly inside useCallback is okay if useCallback dependencies are correct
        if (e.key === 'Escape') {
            if (isDragging) { // Check dragging state from hook
                 console.log('[DEBUG] Drag cancelled via Escape key (global handler)');
                 // Trigger cancellation logic within useTokenDrag
                 // This requires useTokenDrag to expose a cancel function or for VT to manually
                 // revert the drag state and call onDragEnd with start positions.
                 // The Escape key down listener is now added globally in handleMouseDown.
                 // The logic for cancelling is inside useTokenDrag's handleKeyDownLogic.
                 // So, simply allowing the event to propagate to useTokenDrag's listener is sufficient.
                 // However, if we *must* manually cancel here without relying on useTokenDrag's listener:
                 // Use ref to access useTokenDrag's state/logic if needed, or re-implement here.
                 // Let's re-implement the revert logic here for clarity, accessing necessary state via refs.

                 const dragState = dragStateRef.current; // Access drag state via ref
                 if (dragState?.tokenStartPositions) {
                      console.log('[DEBUG] Reverting tokens to start positions from Drag via Escape.');
                      // Use onDragMove to visually move them back immediately using ref
                       dragState.tokenIds.forEach(tokenId => {
                           const startPos = dragState.tokenStartPositions.get(tokenId);
                           if (startPos) {
                               onDragMoveRef.current?.(tokenId, startPos); // Use ref
                           }
                       });
                      // Then call onDragEnd with the start positions to finalize the state (adds to history) using ref
                      onDragEndRef.current?.(dragState.tokenIds, dragState.tokenStartPositions); // Use ref
                 }

                 // Reset state and refs related to the interaction start
                 setIsDragging(false); // Reset hook state flag
                 dragStateRef.current = null; // Discard state
                  interactionStartedRef.current = false; // Reset general interaction flag

                 // Restore default cursor and user select globally
                 document.body.style.cursor = '';
                 document.body.style.userSelect = '';

                  e.preventDefault(); // Prevent default browser behavior for Escape
                  e.stopPropagation(); // Stop propagation

            } else if (isSelecting) { // Check selecting state from hook
                 console.log('[DEBUG] Marquee selection cancelled via Escape key (global handler)');
                 // Trigger cancellation logic within useTokenSelection
                 // useTokenSelection already has handleMarqueeMouseUp/MouseMove/cancelMarquee
                 // Add keydown listener *to useTokenSelection* or trigger its cancel function here.
                 // Let's trigger its cancel function using a ref to it.
                 cancelMarqueeRef.current?.(); // Use ref to call the stable cancel function

                 // Reset state and refs related to the interaction start
                  interactionStartedRef.current = false; // Reset general interaction flag

                 // Restore default cursor and user select globally (cancelMarquee handles this)
                  // document.body.style.cursor = ''; // Handled by cancelMarquee
                 // document.body.userSelect = ''; // Handled by cancelMarquee

                 e.preventDefault(); // Prevent default browser behavior for Escape
                 e.stopPropagation(); // Stop propagation

            } else if (isPanning) { // Check panning state
                 console.log('[DEBUG] Pan cancelled via Escape key (global handler)');
                 // Reset panning state and refs
                 setIsPanning(false); // Reset state flag
                  panStartMousePosRef.current = { x: 0, y: 0 };
                  panStartVTStatePosRef.current = { x: 0, y: 0 };
                  interactionStartedRef.current = false; // Reset general interaction flag

                 // Restore default cursor
                  document.body.style.cursor = '';

                  e.preventDefault(); // Prevent default browser behavior for Escape
                  e.stopPropagation(); // Stop propagation
            }

             // Remove global listeners added by handleMouseDown if ANY interaction was cancelled
             if (isDragging || isSelecting || isPanning) { // Check state *before* resetting
                 // Use a slight delay similar to mouseup cleanup
                setTimeout(() => {
                     document.removeEventListener('mousemove', handleGlobalMouseMoveRef.current, { capture: true });
                     document.removeEventListener('mouseup', handleGlobalMouseUpRef.current, { capture: true });
                     document.removeEventListener('keydown', handleGlobalKeyDownRef.current, { capture: true }); // Use keydown ref
                     console.log('[DEBUG] Removed temporary global mouse listeners after Escape cancellation.');
                }, 0);
             }
        }
   }, [
       isDragging, isSelecting, isPanning, // State flags from hooks and local state
       dragStateRef, tokensRef, // Refs for drag state and token data (used if manually reverting drag)
       onDragMoveRef, onDragEndRef, // Refs for drag callbacks
       cancelMarqueeRef, // Ref for useTokenSelection's cancelMarquee function
       setIsDragging, setMarqueeState, setIsSelecting, setIsPanning, // Stable state setters
       handleGlobalMouseMoveRef, handleGlobalMouseUpRef, handleGlobalKeyDownRef // Stable refs for listener cleanup
   ]); // Dependencies for handleGlobalKeyDownLogic


  // Define handlers using useCallback to get stable references for add/removeEventListener
   const handleGlobalMouseMoveLogic = useCallback((e) => { // Renamed to Logic for consistency
        // Only process if a potential interaction was initiated (mousedown occurred)
        const initialPos = initialMouseDownPosRef.current;
        if (!initialPos) return;

        // If an interaction has *already* started (drag, marquee, or pan)
        if (interactionStartedRef.current) {
             // Handle the ongoing interaction logic based on which state flag is true
             if (isDragging) {
                  // useTokenDrag hook's internal mousemove handles this
                  // Ensure preventDefault/stopPropagation anyway if we know we're dragging
                  e.preventDefault();
                  e.stopPropagation();
             } else if (isSelecting) {
                 // useTokenSelection hook's internal mousemove handles this
                 // Ensure preventDefault/stopPropagation anyway if we know we're selecting
                  e.preventDefault();
                  e.stopPropagation();
             } else if (isPanning) {
                 // --- ADDED Pan Move Logic ---
                 e.preventDefault(); // Prevent default browser actions like text selection
                 e.stopPropagation(); // Stop propagation

                 const currentMouseX = e.clientX;
                 const currentMouseY = e.clientY;
                 const startMouseX = panStartMousePosRef.current.x;
                 // --- MODIFIED: Corrected typo in pan calculation ---
                 const startMouseY = panStartMousePosRef.current.y;
                 // --- END MODIFIED ---
                 const startVTStateX = panStartVTStatePosRef.current.x;
                 const startVTStateY = panStartVTStatePosRef.current.y;

                 // Calculate mouse movement delta in screen coordinates
                 const dxScreen = currentMouseX - startMouseX;
                 const dyScreen = currentMouseY - startStartMouseY;

                 // Access the latest scale via ref
                 const currentScale = scaleRef.current || 1;

                 // Calculate the new tabletop position
                 // newPos = startVTStatePos + (delta_screen / scale)
                 const newPosition = {
                     x: startVTStateX + (dxScreen / currentScale),
                     y: startVTStateY + (dyScreen / currentScale),
                 };

                  // Update the state directly (no history)
                 setDirectState(prev => ({ ...prev, position: newPosition }));
                 // --- End Added ---
             }
             // If an interaction has started, stop further processing here.
             return;
        }

        const { getSnappedPosition } = useGridSnapping();

        // --- Check Threshold to START an Interaction (if none started yet) ---
        const { clientX: startX, clientY: startY, target: startTarget, clickedTokenId, button, isAdditiveSelection } = initialPos;
        const currentX = e.clientX;
        const currentY = e.clientY;

        const dx = currentX - startX;
        const dy = currentY - startY;
        const distance = Math.sqrt(dx*dx + dy*dy);

        // If mouse moved beyond threshold
        if (distance > DRAG_THRESHOLD) {
            console.log('[DEBUG] Mouse moved significantly, initiating drag/marquee/pan check.');
            interactionStartedRef.current = true; // Mark interaction started

            // Determine which interaction started based on the initial mousedown context
            if (button === 0) { // Left click
                if (clickedTokenId) {
                    // It started on a token, initiate token drag
                     console.log('[DEBUG] Starting token drag via mousemove threshold.');
                     // Pass the currently *selected* tokens to useTokenDrag.
                     // IMPORTANT: Access the LATEST `selectedTokenIds` state via its ref
                     // --- MODIFIED: Use tokensRef.current instead of tokens state directly ---
                     const tokensToDrag = tokensRef.current.filter(t => selectedTokenIdsRef.current.has(t.id)); // Use ref here!
                     // --- END MODIFIED ---

                     if (tokensToDrag.length === 0) {
                         // This edge case could happen if the clicked token ID is stale in state, or other bugs
                         console.warn('[DEBUG] No selected tokens found for drag start, cancelling interaction.');
                          // Clean up and stop the tracking listeners
                         initialMouseDownPosRef.current = null;
                         interactionStartedRef.current = false;
                         // These handlers are attached in handleMouseDown - need to remove them
                         // Use the stable handler refs for removal
                         document.removeEventListener('mousemove', handleGlobalMouseMoveRef.current, { capture: true }); // Use stable ref
                         document.removeEventListener('mouseup', handleGlobalMouseUpRef.current, { capture: true });   // Use stable ref
                         document.removeEventListener('keydown', handleGlobalKeyDownRef.current, { capture: true }); // Use stable ref
                         console.log('[DEBUG] Cleared interaction refs and removed temporary mouse listeners after aborted drag.');
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
                         clientX: startX, // Use initial screenX from ref
                         clientY: startY, // Use initial screenY from ref
                         shiftKey: isAdditiveSelection // Pass shift/additive state from ref
                     });
                      // Now that an interaction (marquee) has definitely started, prevent defaults/propagation
                      e.preventDefault(); // Prevent default browser selection box
                      e.stopPropagation(); // Stop propagation
                }
            } else if (button === 2) { // Right click
                 if (!clickedTokenId) {
                      // --- ADDED Pan Start Logic ---
                      console.log('[DEBUG] Starting pan via mousemove threshold.');
                      setIsPanning(true); // Set panning state
                      // Store starting positions in refs
                      panStartMousePosRef.current = { x: startX, y: startY }; // Use initial screenX/Y from ref
                      // Use the latest position from state via ref
                      panStartVTStatePosRef.current = { x: positionRef.current?.x || 0, y: positionRef.current?.y || 0 }; // Use ref!

                       // Change cursor globally
                       document.body.style.cursor = 'grabbing';

                       // Now that an interaction (pan) has definitely started, prevent defaults/propagation
                       e.preventDefault(); // Prevent default browser actions like context menu trigger on mousemove
                       e.stopPropagation(); // Stop propagation
                      // --- End Added ---
                 }
                 // Note: Right-click on a token is handled by the ContextMenu logic, not drag/pan.
            }
        }
        // If an interaction *has* started (checked by the hooks' internal listeners or isPanning flag),
        // prevent default browser behavior (like text selection) during the interaction.
        // This check is now redundant with the `if (interactionStartedRef.current)` block above,
        // but kept for clarity on which states disable default behavior.
        if (isDragging || isSelecting || isPanning) { // Check state flags from hooks AND local pan state
             e.preventDefault();
             e.stopPropagation();
        }


   }, [
       tokensRef, // --- MODIFIED Dependency: Added tokensRef ---
       selectedTokenIdsRef, // Used to access latest selection state for token drag
       scaleRef, positionRef, // Used to access latest scale/position for pan calculation
       startDrag, // Hook callback
       startMarquee, // Hook callback
       isDragging, // State flag from hook
       isSelecting, // State flag from hook
       isPanning, // --- ADDED Dependency ---
       setDirectState, // --- ADDED Dependency ---
       setIsPanning, // --- ADDED Dependency ---
       handleGlobalMouseMoveRef, handleGlobalMouseUpRef, handleGlobalKeyDownRef // --- MODIFIED Dependency: Used refs for cleanup calls ---
   ]); // Dependencies for handleGlobalMouseMove


    const handleGlobalMouseUpLogic = useCallback((e) => { // Renamed to Logic for consistency
        console.log('[DEBUG-TABLETOP] handleGlobalMouseUp:', {
          button: e.button,
          target: e.target,
          defaultPrevented: e.defaultPrevented,
          className: e.target.className,
          id: e.target.id,
          isDragging: isDragging, // State from hook
          isSelecting: isSelecting, // State from hook
          isPanning: isPanning, // --- ADDED State ---
          interactionStarted: interactionStartedRef.current // Flag from ref
        });

        // Get event button *before* cleanup potentially clears initialPosRef
        const mouseButton = initialMouseDownPosRef.current?.button;

        // Remove the temporary global listeners attached in handleMouseDown
        // Use a slight delay to ensure any hook mouseup logic runs first
        setTimeout(() => {
            // Use the stable handler refs for removal
            document.removeEventListener('mousemove', handleGlobalMouseMoveRef.current, { capture: true });
            document.removeEventListener('mouseup', handleGlobalMouseUpRef.current, { capture: true });
            document.removeEventListener('keydown', handleGlobalKeyDownRef.current, { capture: true }); // Use stable ref
             console.log('[DEBUG] Removed temporary global mousemove/mouseup/keydown listeners.'); // --- MODIFIED Log ---

            // Clean up local refs related to the interaction cycle
            initialMouseDownPosRef.current = null;
            interactionStartedRef.current = false; // Reset the flag

            // --- ADDED Pan Cleanup Refs ---
             if (isPanning) { // Check state flag *before* resetting
                 panStartMousePosRef.current = { x: 0, y: 0 };
                 panStartVTStatePosRef.current = { x: 0, y: 0 };
                  setIsPanning(false); // Reset panning state
                  // Restore default cursor globally
                  document.body.style.cursor = '';
             }
             // --- End Added ---

             // Restore cursor if it was changed by drag/pan and is now finished
             if (!isDragging && !isPanning) { // Check other drag states too
                 document.body.style.cursor = '';
             }

             console.log('[DEBUG] Cleared interaction refs and pan refs.');

        }, 0); // Delay allows other mouseup listeners to run

        // If initial mousedown happened AND NO drag, marquee, or pan started during this interaction cycle
        // AND it was a left click (button 0) - Right click on background is context menu handled by ZoomableContainer
        // Access initialPosRef.current safely after the timeout if needed, but typically logic runs before.
        // For logic that happens *before* the timeout, use the value captured before setTimeout.
         const initialPosAtMouseUp = initialMouseDownPosRef.current; // Capture before setTimeout runs

        if (initialPosAtMouseUp && !interactionStartedRef.current && mouseButton === 0) { // Use captured initialPosAtMouseUp
             console.log('[DEBUG] MouseUp detected as a click (no drag/marquee/pan started based on threshold).');

             const { clickedTokenId } = initialPosAtMouseUp; // Use captured initialPosAtMouseUp
             // const currentX = e.clientX; // Use final mouse position for click location - not strictly needed here
             // const currentY = e.clientY;

             // Check if the click was on a token (already handled selection in handleMouseDown)
             if (clickedTokenId) {
                // It was a click on a token. Selection was already handled in handleMouseDown.
                console.log('[DEBUG] Token click finalized (selection handled).');
                // No further action needed here other than cleanup handled by the timeout.
                // Prevent default/stop propagation for the handled click event
                e.preventDefault(); // Important to prevent context menu on some buttons if not handled by button === 2 logic
                e.stopPropagation(); // Important to prevent background click logic
             } else {
                // It was a click on the background (left click, no token, no drag/marquee/pan started)
                console.log('[DEBUG] Background (left) click finalized. Creating ping.');
                // Prevent default/stop propagation for the handled click event
                e.preventDefault();
                e.stopPropagation();

                // Create a ping at the *final* mouse up screen coordinates
                createPing(e.clientX, e.clientY); // Use final mouse position for ping location
             }
        } else if (initialPosAtMouseUp && (interactionStartedRef.current || isDragging || isSelecting || isPanning)) { // Use captured initialPosAtMouseUp
            // If initial mousedown happened and an interaction *did* start (drag, marquee, or pan),
            // the hook's mouseup handler or the local pan logic took over.
            console.log('[DEBUG] MouseUp handled by hook/pan logic (drag/marquee/pan completed).');
            // Ensure preventDefault/stopPropagation runs for the event that ended the interaction.
             // This check covers the case where the interaction started (interactionStartedRef.current is true)
             // OR if the state flags somehow got set without the flag being true yet (less likely but safe).
             e.preventDefault();
             e.stopPropagation();
        }
        // If it was a right-click (button 2) and no pan started (i.e. just a right-click without drag)
        // and it wasn't on a token (handled by ContextMenu), we do nothing here.
        // ZoomableContainer's onContextMenu prop handles the context menu trigger for background right-clicks.

    }, [
        createPing, // Callback needed for left-click background
        isDragging, // State flag from hook
        isSelecting, // State flag from hook
        isPanning, // --- ADDED State ---
        setIsPanning, // --- ADDED Dependency ---
        handleGlobalMouseMoveRef, handleGlobalMouseUpRef, handleGlobalKeyDownRef // --- MODIFIED Dependency: Used refs for cleanup calls ---
    ]);

  // --- Refs for the actual listener functions ---
  // These refs will always point to the latest version of the handler logic defined above.
   const handleGlobalMouseMoveRef = useRef(handleGlobalMouseMoveLogic);
   const handleGlobalMouseUpRef = useRef(handleGlobalMouseUpLogic);
   // --- ADDED Ref for Keydown Handler ---
   const handleGlobalKeyDownRef = useRef(handleGlobalKeyDownLogic);
   // --- End Added ---
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


  // --- Effects to keep handler refs updated ---
  // These effects run whenever the corresponding handler logic changes (i.e., when state dependencies like isDragging, isSelecting, isPanning change)
  useEffect(() => {
      handleGlobalMouseMoveRef.current = handleGlobalMouseMoveLogic;
      // console.log('[DEBUG] useTokenDrag: handleMouseMoveLogic updated in ref.');
  }, [handleGlobalMouseMoveLogic]); // Depends on the memoized logic

  useEffect(() => {
      handleGlobalMouseUpRef.current = handleGlobalMouseUpLogic;
       // console.log('[DEBUG] useTokenDrag: handleMouseUpLogic updated in ref.');
  }, [handleGlobalMouseUpLogic]); // Depends on the memoized logic

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
      isPanning: isPanning, // --- ADDED State ---
    });

    // Ignore middle-clicks (button 1) - These are intended for the ZoomableContainer/useZoomToMouse hook
    // although that hook only explicitly handles wheel, not middle-click *dragging*.
    // Let's allow middle-click event propagation.
    if (e.button === 1) {
        // Allow middle-click to propagate. If ZoomableContainer/useZoomToMouse
        // ever implements middle-click drag pan, it will handle it.
        // hideMenu(); // Consider hiding menu on any mousedown
        // e.preventDefault(); // Don't prevent default here, let it potentially trigger browser pan/scroll
        // e.stopPropagation(); // Don't stop propagation
        return; // Exit early for middle click
    }

    // Ignore right-clicks (button 2) *on a token*. Context menu on tokens is handled after mouseup.
     const tokenEl = e.target.closest('.token');
     const clickedTokenId = tokenEl?.id || null;

     if (e.button === 2 && clickedTokenId) {
          // Right-click on a token - do nothing on mousedown.
          // Context menu logic happens on contextmenu event (usually after mouseup).
          // hideMenu(); // Ensure our context menu is hidden on any right mousedown? Maybe not necessary if it hides on any mousedown.
          // Prevent default context menu if this mousedown is the start of a right-click gesture
          e.preventDefault();
          // Don't stop propagation yet. Let it bubble up to the contextmenu listener on ZoomableContainer if needed.
          return; // Exit early for right click on token
     }


    // --- Handle Left Clicks (button 0) AND Right Clicks (button 2) on BACKGROUND ---
    hideMenu(); // Hide context menu on any relevant mouse down (left click or right click on background)

    const isAdditiveSelection = e.metaKey || e.ctrlKey || e.shiftKey; // Check modifiers for additive selection


    // Store initial mouse position and context for threshold check and event handling
    initialMouseDownPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      target: e.target, // The element where mousedown occurred
      clickedTokenId: clickedTokenId, // Null if clicked on background
      button: e.button, // --- Added: Store the button that was pressed ---
      isAdditiveSelection: isAdditiveSelection, // Store additive state for marquee
    };
     // Reset interaction started flag
    interactionStartedRef.current = false;

    // --- ADDED: Cursor Change for Potential Pan (Right Click on Background) ---
     if (e.button === 2 && !clickedTokenId) {
         // If it's a right click on the background, change cursor immediately
         // and prevent default context menu here as we might pan.
          document.body.style.cursor = 'grab'; // Indicate draggable surface
           e.preventDefault(); // Prevent default browser context menu on mousedown
     }
    // --- End Added ---

    // If clicked on a token (Left Click), handle selection logic immediately
    if (clickedTokenId && e.button === 0) { // Only left click on token initiates immediate selection logic
        console.log('[DEBUG] Mousedown (Left) on token:', clickedTokenId);
        // Prevent default browser drag on token images etc.
        e.preventDefault();
        // Do NOT stop propagation yet. Let the global mousemove handler below check threshold for drag.
        // The global handler attached by startDrag will stop propagation if drag starts.

        // Handle selection update on token click
        // If not additive, clear existing selection first
        if (!isAdditiveSelection) {
            // --- MODIFIED: Call clearSelection via combined ref ---
            console.log('[DEBUG] Non-additive selection, attempting selectionHandlersRef.current.clearSelection?.()');
            selectionHandlersRef.current.clearSelection?.(); // Access via combined ref
            // --- END MODIFIED ---
        }
        // Always select/toggle the clicked token
        // --- MODIFIED: Call selectTokenId via combined ref ---
        console.log('[DEBUG] Attempting selectionHandlersRef.current.selectTokenId?.() for:', clickedTokenId);
        selectionHandlersRef.current.selectTokenId?.(clickedTokenId, false); // Access via combined ref
        // --- END MODIFIED ---
        // THIS WAS APPROXIMATELY LINE 571 in the original file
    } else if (!clickedTokenId && e.button === 0) { // Left click on background
        console.log('[DEBUG] Mousedown (Left) on background.');
        // Don't prevent default yet - need to distinguish click vs marquee drag based on threshold in mousemove.
        // Don't stop propagation yet.
    } else if (!clickedTokenId && e.button === 2) { // Right click on background
         console.log('[DEBUG] Mousedown (Right) on background.');
         // Cursor changed and default prevented above.
         // Don't stop propagation yet. Let the global mousemove handler check threshold for pan.
    }


    // Attach global listeners *immediately* on mousedown to track movement for threshold check and interaction handling
    // Use the .current property of the handler refs or the useCallback results directly if stable.
    // handleGlobalMouseMove and handleGlobalMouseUp are useCallback results, they are stable refs.
    // handleGlobalKeyDownLogic is also a useCallback result (renamed).
    document.addEventListener('mousemove', handleGlobalMouseMoveRef.current, { capture: true });
    document.addEventListener('mouseup', handleGlobalMouseUpRef.current, { capture: true });
    // Keydown listener for Escape is managed by a separate effect based on interaction flags.
    // (Actually, the Escape keydown handler is *also* added globally when interactions start now)

     // --- ADDED Global Keydown Listener for Escape ---
     // Add the Escape listener here on ANY mousedown that starts an interaction check
     // It will only *do* something if isDragging, isSelecting, or isPanning is true when Escape is pressed.
     // This is simpler than managing its attachment based on interaction state flags.
     document.addEventListener('keydown', handleGlobalKeyDownRef.current, { capture: true });
      console.log('[DEBUG] Attached temporary global mousemove, mouseup, keydown listeners.');
     // --- End Added ---


   // Right-click handler for context menu - Called by ZoomableContainer's onContextMenu prop
   // This handler is called on the 'contextmenu' event, which typically fires *after* mousedown/mouseup
   // if the default context menu is not prevented on mousedown.
   // Our handleMouseDown *does* prevent default context menu on right-click background,
   // so this contextmenu event will likely *not* fire in that case if a drag started.
   // It *will* fire for a simple right-click (mousedown followed immediately by mouseup without drag threshold)
   // on the background, or potentially on tokens depending on event flow.
  const handleContextMenu = useCallback((e) => {
      console.log('[DEBUG-TABLETOP] ContextMenu event from ZoomableContainer:', {
          target: e.target,
          className: e.target.className,
          id: e.target.id,
          defaultPrevented: e.defaultPrevented, // Check if default was prevented upstream (e.g., in handleMouseDown)
          button: e.button,
      });

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
         if (!(currentSelectedTokenIds?.has(clickedTokenId)) || (currentSelectedTokenIds?.size > 1 && currentSelectedTokenIds?.has(clickedTokenId))) { // If not selected, OR (multiple selected AND this one is selected)
             // If the clicked token is not in the selection, OR if multiple tokens are selected
             // and the click is on just one, clear and select only the clicked one.
             // This is common behavior: single right-click on a token focuses the action on it,
             // unless the right-click is part of a multi-selection action.
             // Let's simplify: If you right-click a selected token, act on selection. If you right-click
             // an *unselected* token, select it and act on it.
             if (!currentSelectedTokenIds?.has(clickedTokenId)) { // Use ref
                 // --- MODIFIED: Call clearSelection via combined ref ---
                 selectionHandlersRef.current.clearSelection?.(); // Clear existing
                 // --- END MODIFIED ---
                 // --- MODIFIED: Call selectTokenId via combined ref ---
                 selectionHandlersRef.current.selectTokenId?.(clickedTokenId, false); // Select just this one non-additively
                 // --- END MODIFIED ---
             }
             // The tokenIdsToOperateOn logic above already determines whether to act on the single token or the selection.
             // The selection state change here ensures the UI *shows* the correct selection before the menu opens.
        }
         // If the clicked token WAS already selected and it was the only one selected, no selection change needed.

        options.tokenIds = tokenIdsToOperateOn; // Pass the relevant ID(s) to the menu state

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
      showMenu, // Stable callbacks
      // --- MODIFIED Dependencies: Removed individual selectTokenIdRef, clearSelectionRef ---
      // Dependencies needed for calculations/logic inside (using refs):
      selectedTokenIdsRef, scaleRef, positionRef,
      // --- MODIFIED Dependencies: Added combined ref ---
      selectionHandlersRef,
      // --- END MODIFIED ---
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
    const gridConfig = useMemo(() => ({
        squareSize: DEFAULT_SQUARE_SIZE,
        hexSize: DEFAULT_HEX_SIZE,
        // Hex dimensions based on hexSize (pointy-top orientation)
        hexWidth: DEFAULT_HEX_SIZE * 2,
        hexHeight: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    }), []);

    // Calculate the number of rows and columns needed based on some arbitrary map size
    // TODO: Make map size configurable and responsive
    const dimensions = useMemo(() => {
        // Example fixed size for now
        const totalMapWidth = 2000; // Example size in 'world' units (grid units)
        const totalMapHeight = 2000;

        if (isHexGrid) {
            // For hex grids, cols are simpler, but rows are based on 3/4 height
            const cols = Math.ceil(totalMapWidth / gridConfig.hexWidth);
            const rows = Math.ceil(totalMapHeight / (gridConfig.hexHeight * 0.75));
            return { rows, cols };
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
            // This calculation seems slightly off. Let's revisit the hex grid height.
            // A hex grid of N rows has total height approx (N-1) * (hexHeight * 0.75) + hexHeight.
            // The Grid component calculates this correctly. Let's derive total size based on that.
            const width = dimensions.cols * gridConfig.hexWidth;
            const height = dimensions.rows > 0 ? (dimensions.rows - 1) * (gridConfig.hexHeight * 0.75) + gridConfig.hexHeight : 0; // Corrected total height calculation

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
             updateGameState(prev => ({ ...prev })); // Pushes the initial state to history
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


          updateGridDimensions.cancel(); // Cancel debounced function

           // Restore default cursor if cleanup happens mid-interaction
           document.body.style.cursor = '';
           document.body.userSelect = ''; // Should be restored by hooks too, but defensively here
      };
  }, [handleGlobalMouseMoveRef, handleGlobalMouseUpRef, handleGlobalKeyDownRef, updateGridDimensions]); // Depend on memoized handlers and debounced function


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
