import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useStateWithHistory - adds undo/redo functionality on top of normal React state
 *
 * @param {any} initialState - the initial state
 * @param {object} options
 *   - maxHistory {number}: how many states to store
 *   - onUndo {Function}: callback when undo happens
 *   - onRedo {Function}: callback when redo happens
 */
export function useStateWithHistory(initialState, options = {}) {
  const {
    maxHistory = 50,
    onUndo = () => {},
    onRedo = () => {}
  } = options;

  // Core "live" state
  const [state, setState] = useState(initialState);
  // Our history array
  const [history, setHistory] = useState([initialState]);
  // The current pointer in the history array
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // This ref prevents new states from being recorded if we are mid-undo/redo
  const isUndoingOrRedoingRef = useRef(false);

  /**
   * setDirectState - changes state WITHOUT adding to history
   * (useful for ephemeral changes you don't want to clutter undo stack)
   */
  const setDirectState = useCallback(updater => {
    setState(updater);
  }, []);

  /**
   * updateState - changes state AND pushes a snapshot onto the history stack
   */
  const updateState = useCallback(updater => {
    if (isUndoingOrRedoingRef.current) return;

    setState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;

      setHistory(prevHistory => {
        // discard any "future" states if we previously undid something
        const truncated = prevHistory.slice(0, currentIndex + 1);
        // push new
        const newHistory = [...truncated, newState];

        // if we exceed maxHistory, remove the oldest
        if (newHistory.length > maxHistory) {
          newHistory.shift();
        } else {
          // only update currentIndex if we didn't shift
          setCurrentIndex(truncated.length);
        }
        return newHistory;
      });

      return newState;
    });
  }, [currentIndex, maxHistory]);

  /**
   * undo - go back one state in history (Ctrl+Z)
   */
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoingOrRedoingRef.current = true;
      const prevState = history[currentIndex - 1];
      setState(prevState);
      setCurrentIndex(currentIndex - 1);
      onUndo(prevState);
      isUndoingOrRedoingRef.current = false;
    } else {
      // no previous state
      console.log('[DEBUG] Nothing to undo.');
      onUndo(undefined);
    }
  }, [currentIndex, history, onUndo]);

  /**
   * redo - go forward one state in history (Ctrl+Y)
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoingOrRedoingRef.current = true;
      const nextState = history[currentIndex + 1];
      setState(nextState);
      setCurrentIndex(currentIndex + 1);
      onRedo(nextState);
      isUndoingOrRedoingRef.current = false;
    } else {
      // no next state
      console.log('[DEBUG] Nothing to redo.');
      onRedo(undefined);
    }
  }, [currentIndex, history, onRedo]);

  // Optional: add a global keybinding for Ctrl+Z => undo, Ctrl+Y => redo
  useEffect(() => {
    function handleKeyDown(e) {
      // skip if focusing an input/textarea
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      // Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo (Ctrl+Y) or (Ctrl+Shift+Z)
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
          (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // we can easily figure out canUndo/canRedo for UI disabling
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return [
    state,
    setDirectState,
    updateState,
    undo,
    redo,
    {
      canUndo,
      canRedo,
      history,
      currentIndex
    }
  ];
}
