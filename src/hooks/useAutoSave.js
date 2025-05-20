// hooks/useAutoSave.js
import { useEffect, useRef } from 'react';
import _ from 'lodash'; // Assuming lodash is available

/**
 * Generic hook that auto-saves gameState with a debounce.
 *
 * @param {any} gameState - The single source-of-truth object
 *                          (tokens, zoom, chat, etc.)
 * @param {Function} saveFn - Your function to actually persist the state
 *                            (e.g. localStorage, server). Should be memoized (e.g., with useCallback).
 * @param {number} debounceMs - How many ms of inactivity before saving
 */
export function useAutoSave(gameState, saveFn, debounceMs = 1000) {
  // Create a debounced save function.
  // The debounced function should be created once and reused across renders.
  // We use useRef to ensure the debounced function instance is stable.
  const debouncedSave = useRef(
    _.debounce((currentState) => {
      console.log('[DEBUG] useAutoSave => saving gameState...'); // Log before calling saveFn
      saveFn(currentState); // Call the actual save function
    }, debounceMs, {
      leading: false,  // Don't save immediately when changes start
      trailing: true,  // Do save after changes stop
      maxWait: 5000   // But never wait longer than 5s between saves
    })
  ).current;

  // useEffect runs whenever gameState changes. It triggers the debounced save.
  useEffect(() => {
    // Do not save if gameState is null/undefined on mount before initial load
    if (gameState === null || gameState === undefined) {
        console.log('[DEBUG] useAutoSave: gameState is null/undefined, skipping save.');
        return;
    }

    // We don't need to compare state here; the debouncedSave function
    // will be triggered by the effect's dependency array whenever gameState
    // reference changes. The actual state comparison to avoid redundant saves
    // should happen INSIDE the `saveFn` function (like in `useCampaignManager`).
    // This effect's sole purpose is to tell the debouncer "state *might* have changed, schedule a save".

    // Call the debounced function. It will wait for the debounce period
    // before executing `saveFn(gameState)`.
    // If `gameState` changes again within the debounce period, the timer resets.
    console.log('[DEBUG] useAutoSave: gameState dependency changed, triggering debounced save.');
    debouncedSave(gameState); // Pass the latest state

    // Cleanup function for this effect.
    // This specific cleanup runs when the *dependencies change* or when the component unmounts.
    // If dependencies change, the new effect instance takes over.
    // If component unmounts, the return function runs.
    return () => {
        // This cleanup primarily ensures that if gameState changes *very* rapidly,
        // pending debounced saves associated with the *old* gameState reference
        // are cancelled, althoughlodash's debounce handles passing the latest arg.
        // The main cleanup for component unmount is the `beforeunload` listener below.
        // console.log('[DEBUG] useAutoSave: Effect cleanup (state changed or unmounting)');
        // debouncedSave.cancel(); // Cancelling here might be too aggressive if a new effect is starting immediately
    };

  }, [gameState, debouncedSave]); // Depend on gameState and the stable debouncedSave function


  // Handle window unload to save any pending changes *synchronously*.
  // This is essential because asynchronous operations are often not guaranteed
  // to complete during the `beforeunload` event. localStorage is synchronous.
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush the debounced save immediately before the page closes.
      // This forces any pending save to execute NOW.
      console.log('[DEBUG] useAutoSave: Before unload, flushing debounced save.');
      debouncedSave.flush(); // Flush any pending saves
       // Note: You cannot perform asynchronous operations like fetch/indexedDB here.
       // localStorage is synchronous, which is why it's often used for this.
    };

    // Attach the listener to the window
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Detach the listener when the hook cleans up (component unmounts)
    return () => {
        console.log('[DEBUG] useAutoSave: Removing beforeunload listener.');
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [debouncedSave]); // Depends on the stable debounced save function
}