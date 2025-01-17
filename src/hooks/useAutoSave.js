// hooks/useAutoSave.js
import { useEffect, useRef } from 'react';
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
      console.log('[DEBUG] useAutoSave => saving gameState:', currentState);
      saveFn(currentState);
    }, debounceMs, {
      leading: false,  // Don't save immediately when changes start
      trailing: true,  // Do save after changes stop
      maxWait: 5000   // But never wait longer than 5s between saves
    })
  ).current;

  // Keep track of last saved state and whether we have pending changes
  const pendingChangesRef = useRef(false);
  const lastStateRef = useRef(gameState);

  // Set up the effect to call the debounced save
  useEffect(() => {
    if (!gameState) return;
    
    pendingChangesRef.current = true;
    lastStateRef.current = gameState;
    debouncedSave(gameState);
  }, [gameState, debouncedSave]);

  // Clean up and ensure any pending changes are saved
  useEffect(() => {
    return () => {
      if (pendingChangesRef.current) {
        console.log('[DEBUG] Flushing pending saves before unmount');
        debouncedSave.flush();
      }
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Handle window unload to save any pending changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingChangesRef.current) {
        console.log('[DEBUG] Saving pending changes before unload');
        saveFn(lastStateRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveFn]);
}
