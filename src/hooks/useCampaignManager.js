// hooks/useCampaignManager.js
import { useCallback, useMemo, useRef } from 'react';
import _ from 'lodash'; // Assuming lodash is available for deep comparison if needed, but using JSON.stringify for now

export function useCampaignManager(campaignId = 'default-campaign') {
  // Keep track of the most recent state object that was SUCCESSFULLY saved
  const lastSavedStateRef = useRef(null);

  /**
   * saveState: accepts the **entire** game state object and writes it to localStorage.
   * Includes a check to prevent saving if state hasn't changed.
   *
   * @param {object} fullState - The state object to save.
   */
  const saveState = useCallback((fullState) => {
    if (!fullState) {
        console.warn('[DEBUG] saveState called with null or undefined state.');
        return;
    }
    try {
      // console.log('[DEBUG] Attempting to save state...');

      // 1. Create the state object we *intend* to save (without the new timestamp for comparison)
      const stateToCompare = { ...fullState };
      // Remove timestamp before comparison if it exists from a previous load/save
      delete stateToCompare.timestamp;


      // 2. Compare against the last successfully saved state (if any)
      if (lastSavedStateRef.current) {
         // Compare the *content* of the state, ignoring the timestamp field
         const currentContentStr = JSON.stringify(stateToCompare);
         // Need to get the content string of the last saved state *without* its timestamp
         const lastContentState = { ...lastSavedStateRef.current };
         delete lastContentState.timestamp;
         const lastContentStr = JSON.stringify(lastContentState);

        if (currentContentStr === lastContentStr) {
          // console.log('[DEBUG] State content unchanged, skipping save');
          return; // State hasn't changed meaningfully (ignoring timestamp)
        }
         console.log('[DEBUG] State changed, proceeding with save.');
      } else {
           console.log('[DEBUG] No previous state saved, proceeding with initial save.');
      }


      // 3. If state *has* changed (or there's no last state), add the new timestamp and save
      const stateToStore = {
        ...fullState,
        timestamp: Date.now() // Add the current timestamp for this save
      };

      // Save to localStorage
      const stateJson = JSON.stringify(stateToStore);
      localStorage.setItem(`vtt-state-${campaignId}`, stateJson);

      // Update the ref to the state that was just successfully saved
      lastSavedStateRef.current = stateToStore;

      console.log(
        `[DEBUG] Campaign '${campaignId}' saved at`,
        new Date(stateToStore.timestamp).toLocaleTimeString()
      );

    } catch (error) {
      console.error('Failed to save campaign state:', error);
      // Optionally, alert the user
    }
  }, [campaignId]);

  /**
   * loadState: reads the entire object from localStorage, or returns null if none found or load fails.
   */
  const loadState = useCallback(() => {
    try {
      console.log(`[DEBUG] Attempting to load campaign '${campaignId}'...`);
      const savedJSON = localStorage.getItem(`vtt-state-${campaignId}`);
      if (!savedJSON) {
          console.log('[DEBUG] No saved state found in localStorage.');
          return null; // No state found
      }

      let loaded = null;
      try {
         loaded = JSON.parse(savedJSON);
      } catch (parseError) {
          console.error('Failed to parse saved campaign state from localStorage:', parseError);
          // Optionally, clear the invalid data to prevent future parsing errors
          // localStorage.removeItem(`vtt-state-${campaignId}`);
          return null; // Parsing failed
      }


      // Basic validation: check if it's an object and has expected structure (optional but good)
      if (typeof loaded !== 'object' || loaded === null || !Array.isArray(loaded.tokens) || loaded.scale === undefined || loaded.position === undefined) {
           console.warn('[DEBUG] Loaded state has unexpected structure:', loaded);
           // Optionally, treat as invalid state
           // return null;
      }


      console.log(
        `[DEBUG] Campaign '${campaignId}' loaded successfully. Timestamp:`,
        loaded.timestamp ? new Date(loaded.timestamp).toLocaleTimeString() : 'N/A',
        loaded
      );

      // Update the ref to the state that was just loaded
      lastSavedStateRef.current = loaded;

      return loaded; // Return the loaded state object
    } catch (error) {
      console.error('An unexpected error occurred during campaign state loading:', error);
      return null; // Any other error during load
    }
  }, [campaignId]);

  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]);
}