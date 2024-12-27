// useCampaignManager.js
import { useEffect, useCallback, useMemo } from 'react';

export function useCampaignManager(campaignId = 'default-campaign') {
  /**
   * saveState: accepts the **entire** game state object and writes it to localStorage.
   */
  const saveState = useCallback((fullState) => {
    try {
      // Ensure we add a timestamp if not present
      const stateToStore = {
        ...fullState,
        timestamp: fullState.timestamp || Date.now()
      };
      localStorage.setItem(`vtt-state-${campaignId}`, JSON.stringify(stateToStore));
      console.log(
        `Campaign '${campaignId}' saved at`,
        new Date().toLocaleTimeString()
      );
    } catch (error) {
      console.error('Failed to save campaign state:', error);
    }
  }, [campaignId]);

  /**
   * loadState: reads the entire object from localStorage, or returns null if none found.
   */
  const loadState = useCallback(() => {
    try {
      const savedJSON = localStorage.getItem(`vtt-state-${campaignId}`);
      if (!savedJSON) return null;

      const loaded = JSON.parse(savedJSON);
      console.log(
        `Campaign '${campaignId}' loaded at`,
        new Date(loaded.timestamp).toLocaleTimeString()
      );

      // loaded should be { isHexGrid, tokens, scale, position, timestamp, ... }
      return loaded;
    } catch (error) {
      console.error('Failed to load campaign state:', error);
      return null;
    }
  }, [campaignId]);

  /**
   * Optional effect for auto-save every X seconds
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // e.g. if you want a timed "saveState(currentGameState)" call
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]);
}
