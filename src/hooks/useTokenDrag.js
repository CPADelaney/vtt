import { useState, useCallback, useEffect } from 'react';

export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  const [dragState, setDragState] = useState(null);

  const startDrag = useCallback((initialToken, e, selectedTokens) => {
    console.log('[DEBUG] Starting drag with tokens:', {
      initialToken,
      selectedCount: selectedTokens.length
    });

    // Store initial positions for all selected tokens
    const tokenStartPositions = new Map();
    selectedTokens.forEach(token => {
      tokenStartPositions.set(token.id, {
        x: token.position.x,
        y: token.position.y
      });
    });

    setDragState({
      tokenIds: selectedTokens.map(t => t.id),
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      tokenStartPositions
    });
  }, []);

  useEffect(() => {
    if (!dragState) return;

    function onMouseMove(e) {
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
        onDragMove?.(tokenId, { x: snappedX, y: snappedY });
      });
    }

    function onMouseUp() {
      // Call onDragEnd for each token if needed
      if (onDragEnd) {
        dragState.tokenIds.forEach(tokenId => {
          onDragEnd(tokenId);
        });
      }
      setDragState(null);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, scale, getSnappedPosition, onDragMove, onDragEnd]);

  return { startDrag };
}
