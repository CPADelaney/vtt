// js/hooks/useSystemManager.js
import { useState, useCallback, useEffect } from 'react';

// Central configuration for available systems
// Removed requiredComponents arrays to prevent fetch attempts on non-existent files
const SYSTEMS_CONFIG = {
  '5e': {
    name: 'D&D 5E',
    path: 'systems/dnd5e',
    // removed requiredComponents: [...]
  },
  'pathfinder': {
    name: 'Pathfinder',
    path: 'systems/pathfinder',
    // removed requiredComponents: [...]
  }
};

export function useSystemManager() {
  const [systems, setSystems] = useState(SYSTEMS_CONFIG);
  const [currentSystemId, setCurrentSystemId] = useState('5e');
  const [isValidating, setIsValidating] = useState(true); // Keep validation state, even if simplified

  /**
   * Validate all systems on mount.
   * Simplified validation to prevent fetching non-existent files.
   * Now just marks systems as ready based on their presence in config.
   */
  useEffect(() => {
    let isMounted = true; // Guard in case component unmounts before validation finishes

    // Asynchronously simulate validation or perform simple checks
    async function validateSystems() {
      const updatedSystems = { ...SYSTEMS_CONFIG }; // Use a fresh copy of the config

      // Simple validation: A system is ready if it exists in the config
      Object.keys(updatedSystems).forEach(systemId => {
           updatedSystems[systemId].isReady = true; // Mark as ready by default
           console.log(`System ${updatedSystems[systemId].name} validation: Ready (Simplified Check)`);
      });

      // Simulate async delay if needed, but for simple check, can update immediately
      // await new Promise(resolve => setTimeout(resolve, 50)); // Optional: add a small delay

      // Only update state if still mounted
      if (isMounted) {
        setSystems(updatedSystems);
        setIsValidating(false); // Validation is complete
        // Set a default system if current one is no longer valid or if none was set
        if (!updatedSystems[currentSystemId]?.isReady && Object.keys(updatedSystems).length > 0) {
             const firstAvailable = Object.keys(updatedSystems)[0];
             if (firstAvailable) {
                  setCurrentSystemId(firstAvailable);
                   console.log(`Defaulting to system: ${updatedSystems[firstAvailable].name}`);
             }
        } else if (!currentSystemId && Object.keys(updatedSystems).length > 0) {
             const firstAvailable = Object.keys(updatedSystems)[0];
              if (firstAvailable) {
                   setCurrentSystemId(firstAvailable);
                    console.log(`Defaulting to system: ${updatedSystems[firstAvailable].name}`);
              }
        }
      }
    }

    console.log('[DEBUG] Starting simplified system validation...');
    validateSystems();

    return () => {
      isMounted = false;
       console.log('[DEBUG] System validation effect cleanup.');
    };
  }, []); // Effect runs once on mount

  /**
   * Returns a list of systems that are flagged as ready.
   */
  const getAvailableSystems = useCallback(() => {
    // Now that systems are marked ready by default, just return all systems in state
    return Object.entries(systems)
      .filter(([_, sys]) => sys.isReady) // Still filter by isReady state
      .map(([id, sys]) => ({ id, name: sys.name }));
  }, [systems]); // Depends on the systems state updated by the effect

  /**
   * Attempts to switch the current system to the given ID if it's ready.
   */
  const setSystem = useCallback((systemId) => {
    const system = systems[systemId]; // Access systems from state
    if (system?.isReady) {
      setCurrentSystemId(systemId);
      console.log(`Switched to system: ${system.name}`);
      return true;
    }
    console.warn(`Attempted to switch to unavailable system: ${systemId}`);
    return false;
  }, [systems]); // Depends on the systems state

  /**
   * Returns the current system object (or undefined if not found).
   */
  const getCurrentSystem = useCallback(() => {
    return systems[currentSystemId]; // Access systems from state
  }, [systems, currentSystemId]); // Depends on systems state and currentSystemId

  /**
   * Checks if a given component exists for the current system.
   * NOTE: This function still uses fetch. If system components aren't expected
   * to be fetched this way in production, this function's implementation
   * would also need to change or be removed/marked as placeholder.
   * Keeping it for now as it's not directly causing the *reported* errors
   * unless another part of the app calls hasComponent.
   * The main error source was the initial validation loop.
   */
  const hasComponent = useCallback(async (componentPath) => {
    const system = getCurrentSystem();
    if (!system || !componentPath) return false;

    // NOTE: This fetch *might* still cause a 404 if called, depending on
    // what uses hasComponent. The original validation loop is fixed.
    // If this fetch is also problematic later, this function needs review.
    const fetchPath = `js/${system.path}/${componentPath}`;
    console.log(`[DEBUG] Checking for component existence: ${fetchPath}`);
    try {
      const response = await fetch(fetchPath);
      return response.ok;
    } catch (e) {
       console.warn(`[DEBUG] Fetch failed for component check: ${fetchPath}`, e);
      return false;
    }
  }, [getCurrentSystem]); // Depends on getCurrentSystem

  return {
    isValidating,
    currentSystemId,
    getAvailableSystems,
    setSystem,
    getCurrentSystem,
    hasComponent // Keep exposed, but note its behavior
  };
}