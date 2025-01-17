import { useState, useCallback, useEffect, useRef } from 'react';

export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  // Use ref for drag state to prevent unnecessary re-renders
  const dragStateRef = useRef(null);
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

    const dragState = {
      tokenIds: selectedTokens.map(t => t.id),
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      tokenStartPositions,
      initialTimestamp: Date.now()
    };

    isDraggingRef.current = true;
    dragStateRef.current = dragState;

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    
    console.log('[DEBUG] Drag state initialized:', {
      tokenIds: selectedTokens.map(t => t.id),
      startPos: { x: e.clientX, y: e.clientY },
      scale
    });
  }, [scale]);

  // Set up event handlers once, use refs to access current state
  useEffect(() => {
    scaleRef.current = scale;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
    getSnappedPositionRef.current = getSnappedPosition;
    function onMouseMove(e) {
      if (!isDraggingRef.current || !dragStateRef.current) {
        return;
      }

      const dragState = dragStateRef.current;

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
      if (!isDraggingRef.current || !dragStateRef.current) return;

      const dragState = dragStateRef.current;

      console.log('[DEBUG] Mouse up event received:', {
        isDragging: isDraggingRef.current,
        finalPos: { x: e.clientX, y: e.clientY },
        dragDuration: Date.now() - dragState.initialTimestamp
      });

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
      dragStateRef.current = null;
      document.body.style.userSelect = '';
    }

    // Listen for escape key to cancel drag
    function onKeyDown(e) {
      if (e.key === 'Escape' && isDraggingRef.current) {
        console.log('[DEBUG] Drag cancelled via Escape key');
        isDraggingRef.current = false;
        dragStateRef.current = null;
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
    };
  }, [scale, getSnappedPosition, onDragMove, onDragEnd]); // Only depend on stable props

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

    dragStateRef.current = {
      tokenIds: selectedTokens.map(t => t.id),
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      tokenStartPositions,
      initialTimestamp: Date.now()
    };

    isDraggingRef.current = true;
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';

    console.log('[DEBUG] Drag state initialized:', dragStateRef.current);
  }, []);

  // Attach global listeners once, with no dependencies
  useEffect(() => {
    function onMouseMove(e) {
      if (!isDraggingRef.current || !dragStateRef.current) return;
      const dragState = dragStateRef.current;

      // Access the latest scale & callbacks via refs
      const currentScale = scaleRef.current;
      const dx = (e.clientX - dragState.startMouseX) / currentScale;
      const dy = (e.clientY - dragState.startMouseY) / currentScale;

      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return;

        const newX = startPos.x + dx;
        const newY = startPos.y + dy;

        const { x: snappedX, y: snappedY } = getSnappedPositionRef.current(newX, newY);

        onDragMoveRef.current?.(tokenId, { x: snappedX, y: snappedY }, false);
      });

      e.preventDefault();
    }

    function onMouseUp(e) {
      if (!isDraggingRef.current || !dragStateRef.current) return;
      const dragState = dragStateRef.current;

      const currentScale = scaleRef.current;
      const dx = (e.clientX - dragState.startMouseX) / currentScale;
      const dy = (e.clientY - dragState.startMouseY) / currentScale;

      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return;

        const { x: snappedX, y: snappedY } = getSnappedPositionRef.current(
          startPos.x + dx,
          startPos.y + dy
        );

        onDragMoveRef.current?.(tokenId, { x: snappedX, y: snappedY }, true);
        onDragEndRef.current?.(tokenId, { x: snappedX, y: snappedY });
      });

      // Reset drag
      isDraggingRef.current = false;
      dragStateRef.current = null;
      document.body.style.userSelect = '';
    }

    function onKeyDown(e) {
      if (e.key === 'Escape' && isDraggingRef.current) {
        console.log('[DEBUG] Drag cancelled via Escape key');
        isDraggingRef.current = false;
        dragStateRef.current = null;
        document.body.style.userSelect = '';
      }
    }

    // Attach them once
    window.addEventListener('mousemove', onMouseMove, { capture: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true });
    window.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []);

  return {
    startDrag,
    isDragging: isDraggingRef.current
  };
}
