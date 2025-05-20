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
  const lastStateRef = useRef(gameState); // Store the last state that was *passed into* the effect

  // Set up the effect to call the debounced save
  useEffect(() => {
    // Do not save if gameState is null/undefined on mount before initial load
    if (gameState === null || gameState === undefined) return;

    // If the state object reference hasn't changed, no need to save/debounce
    // This is a shallow check, but cheap. Deep comparison is handled within saveFn.
    if (gameState === lastStateRef.current) {
       console.log('[DEBUG] useAutoSave: State object reference unchanged, skipping debounce call.');
       return;
    }

    pendingChangesRef.current = true;
    lastStateRef.current = gameState; // Update ref to current state

    console.log('[DEBUG] useAutoSave: State changed, triggering debounce.');
    debouncedSave(gameState);

     // Cleanup for the effect runs when gameState changes or component unmounts
     return () => {
         // If the effect is cleaning up *because state changed*, we don't need to flush.
         // The new effect instance will take over.
         // If the effect is cleaning up because the component is unmounting, we need to flush.
         // The window.addEventListener('beforeunload') handles the unmount case more reliably.
     };

  }, [gameState, debouncedSave]); // Depend on gameState

  // Clean up and ensure any pending changes are saved when the hook itself cleans up
  // This might happen on component unmount or if dependencies change
  useEffect(() => {
      // This return function runs on unmount
      return () => {
          // Use the beforeunload listener for saving final state.
          // This cleanup is more for cancelling the debounce timer itself.
          console.log('[DEBUG] useAutoSave: Hook cleanup, cancelling debounce.');
          debouncedSave.cancel(); // Ensure no debounced calls happen after unmount
      };
  }, [debouncedSave]);


  // Handle window unload to save any pending changes *synchronously*
  // This is the most reliable way to save just before the page closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush the debounced save immediately
      console.log('[DEBUG] useAutoSave: Before unload, flushing debounced save.');
      debouncedSave.flush();
       // Note: You cannot perform asynchronous operations like fetch/indexedDB here.
       // localStorage is synchronous, which is why it's often used for this.
    };

    // Attach the listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Detach the listener on unmount
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [debouncedSave]); // Depends on the debounced save function
}