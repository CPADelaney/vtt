// hooks/useAutoSave.js
import { useEffect, useMemo, useRef } from 'react';
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
  // Create a debounced save function
  const debouncedSave = useRef(
    _.debounce((currentState) => {
      console.log('[DEBUG] useAutoSave => saving gameState...');
      saveFn(currentState);
    }, debounceMs)
  ).current;

  // Set up the effect to call the debounced save
  useEffect(() => {
    if (!gameState) return;
    
    debouncedSave(gameState);
  }, [gameState, debouncedSave]);

  // Clean up the debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);
}
