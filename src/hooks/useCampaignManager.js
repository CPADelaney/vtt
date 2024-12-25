// useCampaignManager.js
import { useEffect, useMemo, useCallback } from 'react';

export function useCampaignManager(campaignId = 'default-campaign') {
  // Save the entire object to localStorage
  const saveState = useCallback((fullState) => {
    try {
      // Add a timestamp if you want
      const stateWithTimestamp = {
        ...fullState,
        timestamp: Date.now(),
      };

      localStorage.setItem(`vtt-state-${campaignId}`, JSON.stringify(stateWithTimestamp));
      console.log(`Campaign '${campaignId}' saved at`, new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to save campaign state:', error);
    }
  }, [campaignId]);

  // Load the entire object from localStorage
  const loadState = useCallback(() => {
    try {
      const savedJSON = localStorage.getItem(`vtt-state-${campaignId}`);
      if (!savedJSON) return null;

      const loaded = JSON.parse(savedJSON);
      console.log(
        `Campaign '${campaignId}' loaded at`,
        new Date(loaded.timestamp).toLocaleTimeString()
      );

      // Return the entire object (tokens, scale, position, etc.)
      return loaded;
    } catch (error) {
      console.error('Failed to load campaign state:', error);
      return null;
    }
  }, [campaignId]);

  // Optional auto-save every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      // e.g. if you want a timed “saveState(currentState)” call
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]);
}
