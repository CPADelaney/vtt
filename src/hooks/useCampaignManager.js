// js/hooks/useCampaignManager.js
import { useEffect, useMemo, useCallback } from 'react';

export function useCampaignManager(vtt, campaignId = 'default-campaign') {
  // Helper to get current grid state from vtt-like object
  const getGridState = useCallback(() => ({
    isHexGrid: vtt.isHexGrid,
    scale: vtt.scale,
    position: {
      x: vtt.currentX,
      y: vtt.currentY,
    },
  }), [vtt]);

  // Saves the given tokens array plus current grid state to localStorage
  const saveState = useCallback((tokens) => {
    const state = {
      campaignId,
      gridState: getGridState(),
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

  // loadState: Reads localStorage & returns { tokens, grid }
  const loadState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(`vtt-state-${campaignId}`);
      if (!savedState) return null;

      const state = JSON.parse(savedState);

      // Remove (or comment out) the auto-toggle to avoid repeated toggles:
      // if (state.gridState.isHexGrid !== vtt.isHexGrid) {
      //   vtt.toggleGridType?.();
      // }

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

  useEffect(() => {
    const interval = setInterval(() => {
      // optional auto-save logic
    }, 30000);

    return () => clearInterval(interval);
  }, [saveState]);

  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]);
}
