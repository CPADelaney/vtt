// js/hooks/useCampaignManager.js
import { useEffect, useMemo, useCallback } from 'react';

/**
 * A simplified example that:
 *  - Reads/writes "grid state" (scale, position, isHexGrid) to localStorage
 *  - Saves/loads an array of token objects
 *  - Returns loadState and saveState so your React component can control when to load or save
 */
export function useCampaignManager(vtt, campaignId = 'default-campaign') {
  // Helper to get current grid state from vtt-like object
  const getGridState = useCallback(() => ({
    isHexGrid: vtt.isHexGrid,
    scale: vtt.scale,
    position: {
      x: vtt.currentX,
      y: vtt.currentY
    }
  }), [vtt]);

  /**
   * Saves the given tokens array plus the current grid state to localStorage
   */
  const saveState = useCallback((tokens) => {
    const state = {
      campaignId,
      gridState: getGridState(),
      // Here we rely on the tokens array we get from React state
      tokens: tokens || [],
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(`vtt-state-${campaignId}`, JSON.stringify(state));
      console.log(`Campaign '${campaignId}' saved at`, new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to save campaign state:', error);
    }
  }, [campaignId, getGridState]);

  /**
   * loadState: Reads localStorage. 
   * Returns an object { tokens, grid } if found, else null.
   */
  const loadState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(`vtt-state-${campaignId}`);
      if (!savedState) return null;

      const state = JSON.parse(savedState);

      // Possibly toggle hexGrid if needed
      if (state.gridState.isHexGrid !== vtt.isHexGrid) {
        vtt.toggleGridType?.();
      }

      console.log(
        `Campaign '${campaignId}' loaded at`,
        new Date(state.timestamp).toLocaleTimeString()
      );

      return {
        tokens: state.tokens || [],
        grid: {
          scale: state.gridState.scale,
          x: state.gridState.position.x,
          y: state.gridState.position.y,
          isHexGrid: state.gridState.isHexGrid,
        }
      };
    } catch (error) {
      console.error('Failed to load campaign state:', error);
      return null;
    }
  }, [campaignId, vtt]);

  /**
   * Example auto-save logic every 30s (optional).
   * If you want it, you need your component to call something like `saveState(tokens)`.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // For auto-saving, you'd pass current tokens here
      // e.g.: saveState(currentTokens);
    }, 30000);

    return () => clearInterval(interval);
  }, [saveState]);

  // Return these so your component can call them
  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]);
}
