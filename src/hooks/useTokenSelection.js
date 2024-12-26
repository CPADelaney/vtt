import { useState, useCallback, useEffect } from 'react';

export function useTokenSelection() {
  const [selectedTokenIds, setSelectedTokenIds] = useState(new Set());
  const [marqueeState, setMarqueeState] = useState(null);

  const clearSelection = useCallback(() => {
    setSelectedTokenIds(new Set());
  }, []);

  const selectTokenId = useCallback((tokenId, additive = false) => {
    setSelectedTokenIds(prev => {
      const newSet = additive ? new Set(prev) : new Set();
      newSet.add(tokenId);
      return newSet;
    });
  }, []);
  
  const startMarquee = useCallback((e) => {
    console.log('[DEBUG] startMarquee called');
    
    // Get container and its transform state
    const container = document.getElementById('tabletop-container');
    console.log('[DEBUG] Container found:', container);
    
    const contentEl = container.querySelector('div');
    console.log('[DEBUG] Content element found:', contentEl);
    
    // Create marquee element
    const marqueeEl = document.createElement('div');
    marqueeEl.className = 'marquee';
    
    // Position it relative to the container
    const containerRect = container.getBoundingClientRect();
    const startX = e.clientX - containerRect.left;
    const startY = e.clientY - containerRect.top;
  
    console.log('[DEBUG] Marquee initial position:', { startX, startY });
  
    // Apply styling
    marqueeEl.style.cssText = `
      position: absolute;
      left: ${startX}px;
      top: ${startY}px;
      width: 0;
      height: 0;
      border: 2px solid red;
      background-color: rgba(255, 0, 0, 0.1);
      pointer-events: none;
      z-index: 10000;
    `;
    
    // Add to container
    container.appendChild(marqueeEl);
    console.log('[DEBUG] Marquee element added:', marqueeEl);
    
    setMarqueeState({
      element: marqueeEl,
      startX,
      startY,
      containerRect
    });
  }, []);
    
    setMarqueeState({
      element: marqueeEl,
      startX,
      startY,
      transform,
      containerRect
    });
  }, []);

  useEffect(() => {
    if (!marqueeState) return;

    function onMouseMove(e) {
      const { element, startX, startY, containerRect } = marqueeState;
      
      // Get current mouse position relative to container
      const currentX = e.clientX - containerRect.left;
      const currentY = e.clientY - containerRect.top;

      // Calculate marquee dimensions
      const minX = Math.min(currentX, startX);
      const maxX = Math.max(currentX, startX);
      const minY = Math.min(currentY, startY);
      const maxY = Math.max(currentY, startY);

      // Update marquee position and size
      element.style.left = `${minX}px`;
      element.style.top = `${minY}px`;
      element.style.width = `${maxX - minX}px`;
      element.style.height = `${maxY - minY}px`;
    }

    function onMouseUp(e) {
      const { element, transform, containerRect } = marqueeState;
      const marqueeRect = element.getBoundingClientRect();
      
      // Get all tokens
      const tokenEls = document.querySelectorAll('.token');
      
      tokenEls.forEach(tokenEl => {
        const tokenRect = tokenEl.getBoundingClientRect();
        
        // Transform token coordinates to container space
        const tokenLeft = tokenRect.left - containerRect.left;
        const tokenTop = tokenRect.top - containerRect.top;
        const tokenRight = tokenRect.right - containerRect.left;
        const tokenBottom = tokenRect.bottom - containerRect.top;

        // Check intersection in container space
        const marqueeLeft = marqueeRect.left - containerRect.left;
        const marqueeTop = marqueeRect.top - containerRect.top;
        const marqueeRight = marqueeRect.right - containerRect.left;
        const marqueeBottom = marqueeRect.bottom - containerRect.top;

        const intersects = !(
          marqueeRight < tokenLeft ||
          marqueeLeft > tokenRight ||
          marqueeBottom < tokenTop ||
          marqueeTop > tokenBottom
        );

        if (intersects) {
          selectTokenId(tokenEl.id, e.shiftKey);
        }
      });

      // Cleanup
      element.remove();
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
