// js/hooks/useTokenDrag.js
import { useState, useCallback, useEffect } from 'react';

/**
 * useTokenDrag manages the drag state for a single token at a time.
 * 
 * @param {number} scale - The current zoom scale.
 * @param {function} getSnappedPosition - A function that snaps (x, y) to a grid or hex.
 * @param {function} onDragEnd - Optional callback to finalize the new position in React state.
 */
export function useTokenDrag({ scale, getSnappedPosition, onDragEnd }) {
  const [dragState, setDragState] = useState(null);

  /**
   * Called to begin dragging a token (DOM element).
   * @param {HTMLElement} tokenEl - The DOM element representing the token.
   * @param {MouseEvent} e - The mouse event that started the drag.
   */
  const startDrag = useCallback((tokenEl, e) => {
    // Extract the token’s current position from style
    const tokenStartX = parseFloat(tokenEl.style.left) || 0;
    const tokenStartY = parseFloat(tokenEl.style.top) || 0;

    setDragState({
      tokenEl,
      startX: e.clientX,
      startY: e.clientY,
      tokenStartX,
      tokenStartY
    });
  }, []);

  useEffect(() => {
    if (!dragState) return;

    function onMouseMove(e) {
      const dx = (e.clientX - dragState.startX) / scale;
      const dy = (e.clientY - dragState.startY) / scale;
      
      const newX = dragState.tokenStartX + dx;
      const newY = dragState.tokenStartY + dy;
      
      const { x: snappedX, y: snappedY } = getSnappedPosition(newX, newY);

      // Update the DOM element position
      dragState.tokenEl.style.left = `${snappedX}px`;
      dragState.tokenEl.style.top = `${snappedY}px`;
    }

    function onMouseUp() {
      if (onDragEnd) {
        // If you want to store final position in React state:
        const finalX = parseFloat(dragState.tokenEl.style.left) || 0;
        const finalY = parseFloat(dragState.tokenEl.style.top) || 0;
        onDragEnd(dragState.tokenEl, { x: finalX, y: finalY });
      }
      setDragState(null);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, scale, getSnappedPosition, onDragEnd]);

  return { startDrag };
}
