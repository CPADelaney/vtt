// hooks/useCampaignManager.js
import { useCallback, useMemo, useRef } from 'react';
import _ from 'lodash'; // Assuming lodash is available for deep comparison if needed

export function useCampaignManager(campaignId = 'default-campaign') {
  // Keep track of the most recent state object that was SUCCESSFULLY saved or loaded.
  // Used to prevent saving if the state content hasn't changed since the last save/load.
  const lastSavedStateRef = useRef(null);

  /**
   * saveState: accepts the **entire** game state object and writes it to localStorage.
   * Includes a check to prevent saving if state hasn't changed meaningfully.
   *
   * @param {object} fullState - The state object to save. Must be JSON serializable.
   */
  const saveState = useCallback((fullState) => {
    if (!fullState) {
        console.warn('[DEBUG] saveState called with null or undefined state.');
        return;
    }
    try {
      // console.log('[DEBUG] Attempting to save state...');

      // 1. Create the state object we *intend* to compare (excluding the volatile timestamp)
      // Use a deep clone to ensure we don't modify the original state object passed in
      const stateToCompare = _.cloneDeep(fullState); // Use cloneDeep for robustness
      // Remove timestamp before comparison if it exists from a previous load/save
      delete stateToCompare.timestamp;


      // 2. Compare against the last successfully saved state (if any)
      if (lastSavedStateRef.current) {
         // Need to get the content of the last saved state *without* its timestamp for comparison
         const lastContentState = _.cloneDeep(lastSavedStateRef.current);
         delete lastContentState.timestamp;

        // Use a robust deep comparison if gameState contains complex objects/structures
        // JSON.stringify is simple but can be unreliable (e.g., key order, undefined values, specific object types)
        // Consider using lodash.isEqual for more complex state structures:
        // if (_.isEqual(stateToCompare, lastContentState)) { ... }
        // For simple JSON-like state, JSON.stringify comparison might suffice, but be aware of limitations.
         const currentContentStr = JSON.stringify(stateToCompare);
         const lastContentStr = JSON.stringify(lastContentState);


        if (currentContentStr === lastContentStr) { // Or use _.isEqual(stateToCompare, lastContentState)
           // console.log('[DEBUG] State content unchanged, skipping save');
          return; // State hasn't changed meaningfully (ignoring timestamp)
        }
         console.log('[DEBUG] State changed, proceeding with save.');
      } else {
           console.log('[DEBUG] No previous state saved, proceeding with initial save.');
      }


      // 3. If state *has* changed (or there's no last state), add the new timestamp and save
      const stateToStore = {
        ...fullState, // Use the original state to ensure the timestamp is added if it wasn't there
        timestamp: Date.now() // Add the current timestamp for this save
      };

      // Save to localStorage
      const stateJson = JSON.stringify(stateToStore);
      localStorage.setItem(`vtt-state-${campaignId}`, stateJson);

      // Update the ref to the state object that was just successfully saved.
      // Store the object *with* the timestamp as that's what's in localStorage.
      lastSavedStateRef.current = stateToStore;

      console.log(
        `[DEBUG] Campaign '${campaignId}' saved at`,
        new Date(stateToStore.timestamp).toLocaleTimeString()
      );

    } catch (error) {
      console.error('Failed to save campaign state:', error);
      // Optionally, alert the user or log to a server
    }
  }, [campaignId]); // Depend on campaignId

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
          // localStorage.removeItem(`vtt-state-${campaignId}`); // Use with caution!
          return null; // Parsing failed
      }

      // Basic validation: check if it's an object and has expected structure (optional but good)
      // Adjust validation checks based on your state structure
      if (typeof loaded !== 'object' || loaded === null || !Array.isArray(loaded.tokens)) { // Basic checks
           console.warn('[DEBUG] Loaded state has unexpected structure:', loaded);
           // Optionally, treat as invalid state
           // return null;
      }

      console.log(
        `[DEBUG] Campaign '${campaignId}' loaded successfully. Timestamp:`,
        loaded.timestamp ? new Date(loaded.timestamp).toLocaleTimeString() : 'N/A',
        loaded // Log the loaded object
      );

      // Update the ref to the state that was just loaded. This is the "last saved" state now.
      lastSavedStateRef.current = loaded;

      return loaded; // Return the loaded state object
    } catch (error) {
      console.error('An unexpected error occurred during campaign state loading:', error);
      return null; // Any other error during load
    }
  }, [campaignId]); // Depend on campaignId

  return useMemo(() => ({
    saveState,
    loadState
  }), [saveState, loadState]); // Return memoized object containing stable callback references
}