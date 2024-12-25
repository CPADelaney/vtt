// useAutoSave.js
import { useEffect, useMemo } from 'react';
import _ from 'lodash';

export function useAutoSave(gameState, saveFn, debounceMs = 1000) {
  // A debounced save function
  const debouncedSave = useMemo(() => 
    _.debounce((currentState) => {
      saveFn(currentState);
    }, debounceMs),
  [saveFn, debounceMs]);

  // Watch for changes in gameState
  useEffect(() => {
    if (!gameState) return;
    // schedule the save
    debouncedSave(gameState);
    // cleanup
    return () => debouncedSave.cancel();
  }, [gameState, debouncedSave]);
}
