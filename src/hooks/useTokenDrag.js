import { useState, useCallback, useEffect, useRef } from 'react';

export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  const [dragState, setDragState] = useState(null);
  const isDraggingRef = useRef(false);

  const startDrag = useCallback((initialToken, e, selectedTokens) => {
    console.log('[DEBUG] Starting drag with tokens:', {
      initialToken,
      selectedCount: selectedTokens.length,
      mouseX: e.clientX,
      mouseY: e.clientY
    });
    
    // Store initial positions for all selected tokens
    const tokenStartPositions = new Map();
    selectedTokens.forEach(token => {
      tokenStartPositions.set(token.id, {
        x: token.position.x,
        y: token.position.y
      });
    });

    isDraggingRef.current = true;
    setDragState({
      tokenIds: selectedTokens.map(t => t.id),
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      tokenStartPositions,
      initialTimestamp: Date.now()
    });

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    
    console.log('[DEBUG] Drag state initialized:', {
      tokenIds: selectedTokens.map(t => t.id),
      startPos: { x: e.clientX, y: e.clientY },
      scale
    });
  }, [scale]);

  useEffect(() => {
    if (!dragState) {
      console.log('[DEBUG] No drag state, skipping event binding');
      return;
    }

    console.log('[DEBUG] Setting up drag event listeners');

    function onMouseMove(e) {
      if (!isDraggingRef.current) {
        console.log('[DEBUG] Mouse move ignored - not dragging');
        return;
      }

      console.log('[DEBUG] Processing mouse move:', {
        current: { x: e.clientX, y: e.clientY },
        start: { x: dragState.startMouseX, y: dragState.startMouseY },
        timeSinceStart: Date.now() - dragState.initialTimestamp
      });

      // Calculate deltas from the initial mouse position
      const dx = (e.clientX - dragState.startMouseX) / scale;
      const dy = (e.clientY - dragState.startMouseY) / scale;
      
      // Update all selected tokens
      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return;
        
        const newX = startPos.x + dx;
        const newY = startPos.y + dy;
        
        // Snap each token's new position
        const { x: snappedX, y: snappedY } = getSnappedPosition(newX, newY);
        
        // Update position through callback
        onDragMove?.(tokenId, { x: snappedX, y: snappedY }, false);
      });

      // Prevent any default behavior
      e.preventDefault();
      e.stopPropagation();
    }

    function onMouseUp(e) {
      console.log('[DEBUG] Mouse up event received:', {
        isDragging: isDraggingRef.current,
        finalPos: { x: e.clientX, y: e.clientY },
        dragDuration: Date.now() - dragState.initialTimestamp
      });

      if (!isDraggingRef.current) return;

      // Calculate final positions
      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return;
        
        const dx = (e.clientX - dragState.startMouseX) / scale;
        const dy = (e.clientY - dragState.startMouseY) / scale;
        
        const { x: snappedX, y: snappedY } = getSnappedPosition(
          startPos.x + dx,
          startPos.y + dy
        );
        
        // Final update with isFinal flag
        onDragMove?.(tokenId, { x: snappedX, y: snappedY }, true);
        onDragEnd?.(tokenId, { x: snappedX, y: snappedY });
      });

      // Reset drag state
      isDraggingRef.current = false;
      setDragState(null);
      document.body.style.userSelect = '';

      // Prevent any default behavior
      e.preventDefault();
      e.stopPropagation();
    }

    // Listen for escape key to cancel drag
    function onKeyDown(e) {
      if (e.key === 'Escape' && isDraggingRef.current) {
        console.log('[DEBUG] Drag cancelled via Escape key');
        isDraggingRef.current = false;
        setDragState(null);
        document.body.style.userSelect = '';
      }
    }

    // Add event listeners with capture phase to ensure we get them
    window.addEventListener('mousemove', onMouseMove, { capture: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true });
    window.addEventListener('keydown', onKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      
      // Cleanup if component unmounts during drag
      if (isDraggingRef.current) {
        console.log('[DEBUG] Cleaning up drag state on unmount');
        isDraggingRef.current = false;
        setDragState(null);
        document.body.style.userSelect = '';
      }
    };
  }, [dragState, scale, getSnappedPosition, onDragMove, onDragEnd]);

  return {
    startDrag,
    isDragging: !!dragState
  };
}
