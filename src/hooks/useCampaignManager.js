// useCampaignManager.js
import { useEffect, useCallback, useMemo, useRef } from 'react';

export function useCampaignManager(campaignId = 'default-campaign') {
  // Keep track of the most recent state
  const lastSavedStateRef = useRef(null);

  /**
   * saveState: accepts the **entire** game state object and writes it to localStorage.
   */
  const saveState = useCallback((fullState) => {
    try {
      // Skip save if state hasn't changed
      if (lastSavedStateRef.current && 
          JSON.stringify(lastSavedStateRef.current) === JSON.stringify(fullState)) {
        return;
      }

      // Ensure we add a timestamp if not present
      const stateToStore = {
        ...fullState,
        timestamp: fullState.timestamp || Date.now()
      };

      localStorage.setItem(`vtt-state-${campaignId}`, JSON.stringify(stateToStore));
      lastSavedStateRef.current = stateToStore;

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

      lastSavedStateRef.current = loaded;
      return loaded;
    } catch (error) {
      console.error('Failed to load campaign state:', error);
      return null;
    }
  }, [campaignId]);

  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]);
}
