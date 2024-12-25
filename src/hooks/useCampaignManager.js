import { useEffect, useMemo, useCallback } from 'react';

export function useCampaignManager(vtt, campaignId = 'default-campaign') {
  const getGridState = useCallback(() => ({
    isHexGrid: vtt.isHexGrid,
    scale: vtt.scale,
    position: {
      x: vtt.currentX,
      y: vtt.currentY,
    },
  }), [vtt]);

  const saveState = useCallback((tokens) => {
    const state = {
      campaignId,
      gridState: getGridState(),
      tokens: tokens || [],
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(`vtt-state-${campaignId}`, JSON.stringify(state));
      console.log(
        `Campaign '${campaignId}' saved at`,
        new Date().toLocaleTimeString()
      );
    } catch (error) {
      console.error('Failed to save campaign state:', error);
    }
  }, [campaignId, getGridState]);

  const loadState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(`vtt-state-${campaignId}`);
      if (!savedState) return null;

      const state = JSON.parse(savedState);

      // If you have toggling issues or loops, comment out:
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
        },
      };
    } catch (error) {
      console.error('Failed to load campaign state:', error);
      return null;
    }
  }, [campaignId, vtt]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Optional auto-save every 30s, if you pass current tokens, etc.
    }, 30000);

    return () => clearInterval(interval);
  }, [saveState]);

  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]);
}
