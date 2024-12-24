// js/hooks/useTokenSelection.js
import { useState, useCallback, useEffect } from 'react';

/**
 * Manages selection of tokens by ID, plus marquee logic.
 */
export function useTokenSelection() {
  // A set of token IDs that are selected
  const [selectedTokenIds, setSelectedTokenIds] = useState(new Set());
  const [marqueeState, setMarqueeState] = useState(null);

  const clearSelection = useCallback(() => {
    setSelectedTokenIds(new Set());
  }, []);

  /**
   * selectTokenId: adds a token's ID to the selection (or replaces it if not additive).
   */
  const selectTokenId = useCallback((tokenId, additive = false) => {
    setSelectedTokenIds(prev => {
      const newSet = additive ? new Set(prev) : new Set();
      newSet.add(tokenId);
      return newSet;
    });
  }, []);

  /**
   * startMarquee: create the marquee <div>, track coords
   */
  const startMarquee = useCallback((e) => {
    const marqueeEl = document.createElement('div');
    marqueeEl.className = 'marquee';
    document.body.appendChild(marqueeEl);

    setMarqueeState({
      element: marqueeEl,
      startX: e.clientX,
      startY: e.clientY
    });
  }, []);

  useEffect(() => {
    if (!marqueeState) return;

    function onMouseMove(e) {
      const { element, startX, startY } = marqueeState;
      const minX = Math.min(e.clientX, startX);
      const maxX = Math.max(e.clientX, startX);
      const minY = Math.min(e.clientY, startY);
      const maxY = Math.max(e.clientY, startY);

      element.style.left = `${minX}px`;
      element.style.top = `${minY}px`;
      element.style.width = `${maxX - minX}px`;
      element.style.height = `${maxY - minY}px`;
    }

    function onMouseUp(e) {
      const rect = marqueeState.element.getBoundingClientRect();
      // Instead of toggling .selected, 
      // we collect all tokens from somewhere (like from your state) or from the DOM:
      const tokenEls = document.querySelectorAll('.token');
      tokenEls.forEach(tokenEl => {
        const tokenRect = tokenEl.getBoundingClientRect();
        const intersects = !(
          rect.right < tokenRect.left ||
          rect.left > tokenRect.right ||
          rect.bottom < tokenRect.top ||
          rect.top > tokenRect.bottom
        );
        if (intersects) {
          // select the token by ID
          selectTokenId(tokenEl.id, e.shiftKey);
        }
      });

      marqueeState.element.remove();
      setMarqueeState(null);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [marqueeState, selectTokenId]);

  return {
    selectedTokenIds,
    selectTokenId, 
    clearSelection,
    startMarquee
  };
}
