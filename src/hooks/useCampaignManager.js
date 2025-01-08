// hooks/useCampaignManager.js
import { useCallback, useMemo, useRef } from 'react';

export function useCampaignManager(campaignId = 'default-campaign') {
  // Keep track of the most recent state
  const lastSavedStateRef = useRef(null);
  
  /**
   * saveState: accepts the **entire** game state object and writes it to localStorage.
   */
  const saveState = useCallback((fullState) => {
    try {
      console.log('[DEBUG] Attempting to save state...');
      
      // Ensure we add a timestamp if not present
      const stateToStore = {
        ...fullState,
        timestamp: fullState.timestamp || Date.now()
      };

      // Skip save if state hasn't meaningfully changed
      // Note: we compare after adding timestamp to avoid unnecessary saves
      if (lastSavedStateRef.current) {
        const currentStr = JSON.stringify(stateToStore);
        const lastStr = JSON.stringify(lastSavedStateRef.current);
        if (currentStr === lastStr) {
          console.log('[DEBUG] State unchanged, skipping save');
          return;
        }
      }

      // Save to localStorage and update reference
      localStorage.setItem(`vtt-state-${campaignId}`, JSON.stringify(stateToStore));
      lastSavedStateRef.current = stateToStore;

      console.log(
        `[DEBUG] Campaign '${campaignId}' saved at`,
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
        `[DEBUG] Campaign '${campaignId}' loaded at`,
        new Date(loaded.timestamp).toLocaleTimeString(),
        loaded
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
