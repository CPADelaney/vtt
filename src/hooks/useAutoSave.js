// hooks/useAutoSave.js
import { useEffect, useMemo } from 'react';
import _ from 'lodash';

/**
 * Generic hook that auto-saves gameState with a debounce.
 * 
 * @param {any} gameState - The single source-of-truth object 
 *                          (tokens, zoom, chat, etc.)
 * @param {Function} saveFn - Your function to actually persist the state 
 *                            (e.g. localStorage, server).
 * @param {number} debounceMs - How many ms of inactivity before saving
 */
export function useAutoSave(gameState, saveFn, debounceMs = 1000) {
  const debouncedSave = useMemo(
    () =>
      _.debounce((currentState) => {
        console.log('[DEBUG] useAutoSave => saving gameState...');
        saveFn(currentState);
      }, debounceMs),
    [saveFn, debounceMs]
  );

  useEffect(() => {
    if (!gameState) return;
    // Any change to gameState triggers a debounced save
    debouncedSave(gameState);

    // Cleanup on effect re-run or unmount
    return () => debouncedSave.cancel();
  }, [gameState, debouncedSave]);
}
