// js/hooks/useTokenSelection.js
import { useState, useCallback, useEffect } from 'react';

/**
 * useTokenSelection manages selecting tokens and marquee selection.
 * 
 * Note: This version still manipulates DOM tokens. Over time,
 * you can migrate to storing tokens in React state.
 */
export function useTokenSelection() {
  const [selectedTokens, setSelectedTokens] = useState(new Set());
  const [marqueeState, setMarqueeState] = useState(null);

  const clearSelection = useCallback(() => {
    setSelectedTokens(new Set());
  }, []);

  const selectToken = useCallback((tokenEl, additive = false) => {
    setSelectedTokens(prev => {
      const newSelection = additive ? new Set(prev) : new Set();
      newSelection.add(tokenEl);
      return newSelection;
    });
  }, []);

  /**
   * Start the marquee selection by creating a DOM element and storing initial coords.
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
      const tokens = document.querySelectorAll('.token');

      tokens.forEach(tokenEl => {
        const tokenRect = tokenEl.getBoundingClientRect();
        // Simple collision check
        const intersects = !(
          rect.right < tokenRect.left ||
          rect.left > tokenRect.right ||
          rect.bottom < tokenRect.top ||
          rect.top > tokenRect.bottom
        );
        if (intersects) {
          selectToken(tokenEl, e.shiftKey);
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
  }, [marqueeState, selectToken]);

  /**
   * Sync DOM classes to match selectedTokens
   */
  useEffect(() => {
    document.querySelectorAll('.token').forEach(tokenEl => {
      tokenEl.classList.toggle('selected', selectedTokens.has(tokenEl));
    });
  }, [selectedTokens]);

  return {
    selectedTokens,    // A Set of DOM elements
    selectToken,
    clearSelection,
    startMarquee
  };
}
