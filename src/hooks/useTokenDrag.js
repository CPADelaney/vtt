// js/hooks/useTokenDrag.js
import { useState, useCallback, useEffect } from 'react';

/**
 * A more React-centric approach:
 *  - Instead of updating tokenEl.style, we track the dragged token's ID and pass
 *    a callback to update the React state, so <Token> re-renders at the new position.
 */
export function useTokenDrag({ scale, getSnappedPosition, onDragMove, onDragEnd }) {
  const [dragState, setDragState] = useState(null);

  /**
   * startDrag: Called when user starts dragging a token.
   *  - token: an object describing the token (e.g. { id, x, y })
   *  - e: the mouse event
   */
  const startDrag = useCallback((token, e) => {
    // We'll store initial info so we can track delta
    setDragState({
      tokenId: token.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      tokenStartX: token.position.x,
      tokenStartY: token.position.y
    });
  }, []);

  useEffect(() => {
    if (!dragState) return;

    function onMouseMove(e) {
      // Calculate deltas
      const dx = (e.clientX - dragState.startMouseX) / scale;
      const dy = (e.clientY - dragState.startMouseY) / scale;

      const newX = dragState.tokenStartX + dx;
      const newY = dragState.tokenStartY + dy;

      // Snap the position
      const { x: snappedX, y: snappedY } = getSnappedPosition(newX, newY);

      // If we want a “live” drag update, call onDragMove
      onDragMove?.(dragState.tokenId, { x: snappedX, y: snappedY });
    }

    function onMouseUp() {
      // Final position
      if (onDragEnd) {
        onDragEnd(dragState.tokenId);
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
