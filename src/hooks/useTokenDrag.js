import { useCallback, useEffect, useRef } from 'react';

export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  // Refs for storing the latest props
  const scaleRef = useRef(scale);
  const getSnappedPositionRef = useRef(getSnappedPosition);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  // Our drag state
  const dragStateRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Update the refs when props change
  useEffect(() => {
    scaleRef.current = scale;
    getSnappedPositionRef.current = getSnappedPosition;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  }, [scale, getSnappedPosition, onDragMove, onDragEnd]);

  // Attach global event listeners once (no dependencies)
  useEffect(() => {
    function onMouseMove(e) {
      if (!isDraggingRef.current || !dragStateRef.current) return;
      const dragState = dragStateRef.current;

      // For debugging, see that we're updating:
      console.log('[DEBUG] Processing mouse move:', {
        current: { x: e.clientX, y: e.clientY },
        start: { x: dragState.startMouseX, y: dragState.startMouseY },
        timeSinceStart: Date.now() - dragState.initialTimestamp
      });

      const currentScale = scaleRef.current;
      const dx = (e.clientX - dragState.startMouseX) / currentScale;
      const dy = (e.clientY - dragState.startMouseY) / currentScale;

      // Move all selected tokens
      dragState.tokenIds.forEach(tokenId => {
        const startPos = dragState.tokenStartPositions.get(tokenId);
        if (!startPos) return;

        const newX = startPos.x + dx;
        const newY = startPos.y + dy;

        const { x: snappedX, y: snappedY } = getSnappedPositionRef.current(newX, newY);
        onDragMoveRef.current?.(tokenId, { x: snappedX, y: snappedY }, false);
      });

      // Correct the typo here:
      e.preventDefault();
      e.stopPropagation();
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

    window.addEventListener('mousemove', onMouseMove, { capture: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true });
    window.addEventListener('keydown', onKeyDown, { capture: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('mouseup', onMouseUp, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, []); // <-- Attach once, no reattachment on scale changes

  // Single startDrag function
  const startDrag = useCallback((initialToken, e, selectedTokens) => {
    console.log('[DEBUG] Starting drag with tokens:', {
      initialToken,
      selectedCount: selectedTokens.length,
      mouseX: e.clientX,
      mouseY: e.clientY
    });

    // Build the map of initial positions
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
    document.body.style.userSelect = 'none';

    console.log('[DEBUG] Drag state initialized:', dragStateRef.current);
  }, []);

  return {
    startDrag,
    isDragging: isDraggingRef.current
  };
}
