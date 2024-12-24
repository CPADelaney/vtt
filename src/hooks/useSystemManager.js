// js/hooks/useSystemManager.js
import { useState, useCallback, useEffect } from 'react';

// Central configuration for available systems
const SYSTEMS_CONFIG = {
  '5e': {
    name: 'D&D 5E',
    path: 'systems/dnd5e',
    requiredComponents: [
      'combat/initiative.js',
      'combat/actions.js',
      'characters/character.js',
      'ui/CombatTracker.jsx'
    ]
  },
  'pathfinder': {
    name: 'Pathfinder',
    path: 'systems/pathfinder',
    requiredComponents: [
      'combat/initiative.js',
      'characters/character.js'
    ]
  }
};

export function useSystemManager() {
  const [systems, setSystems] = useState(SYSTEMS_CONFIG);
  const [currentSystemId, setCurrentSystemId] = useState('5e');
  const [isValidating, setIsValidating] = useState(true);

  /**
   * Validate all systems on mount by fetching required components.
   * Updates each system's `isReady` field accordingly.
   */
  useEffect(() => {
    let isMounted = true; // Guard in case component unmounts before validation finishes
    
    async function validateSystems() {
      const updatedSystems = { ...systems };
      
      for (const [systemId, system] of Object.entries(updatedSystems)) {
        try {
          const validationResults = await Promise.all(
            system.requiredComponents.map(async component => {
              try {
                const response = await fetch(`js/${system.path}/${component}`);
                return response.ok;
              } catch (e) {
                console.log(`Failed to load ${component} for ${system.name}`);
                return false;
              }
            })
          );

          system.isReady = validationResults.every(Boolean);
          console.log(
            `System ${system.name} validation:`,
            system.isReady ? 'Ready' : 'Missing components'
          );
        } catch (e) {
          console.error(`Error validating system ${system.name}:`, e);
          system.isReady = false;
        }
      }

      // Only update state if still mounted
      if (isMounted) {
        setSystems(updatedSystems);
        setIsValidating(false);
      }
    }

    validateSystems();

    return () => {
      isMounted = false;
    };
  }, [systems]);

  /**
   * Returns a list of systems that are flagged as ready.
   */
  const getAvailableSystems = useCallback(() => {
    return Object.entries(systems)
      .filter(([_, sys]) => sys.isReady)
      .map(([id, sys]) => ({ id, name: sys.name }));
  }, [systems]);

  /**
   * Attempts to switch the current system to the given ID if it's ready.
   */
  const setSystem = useCallback((systemId) => {
    const system = systems[systemId];
    if (system?.isReady) {
      setCurrentSystemId(systemId);
      console.log(`Switched to system: ${system.name}`);
      return true;
    }
    console.warn(`Attempted to switch to unavailable system: ${systemId}`);
    return false;
  }, [systems]);

  /**
   * Returns the current system object (or undefined if not found).
   */
  const getCurrentSystem = useCallback(() => {
    return systems[currentSystemId];
  }, [systems, currentSystemId]);

  /**
   * Checks if a given component exists for the current system.
   * Useful if you want to conditionally load or display certain UI elements.
   */
  const hasComponent = useCallback(async (componentPath) => {
    const system = getCurrentSystem();
    if (!system) return false;

    try {
      const response = await fetch(`js/${system.path}/${componentPath}`);
      return response.ok;
    } catch (e) {
      return false;
    }
  }, [getCurrentSystem]);

  return {
    isValidating,
    currentSystemId,
    getAvailableSystems,
    setSystem,
    getCurrentSystem,
    hasComponent
  };
}
