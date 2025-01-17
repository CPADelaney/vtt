import { useState, useCallback, useRef, useEffect } from 'react';

export function useStateWithHistory(initialState, options = {}) {
  const { 
    maxHistory = 50,
    onUndo = () => {}
  } = options;

  // Core state
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoingRef = useRef(false);
  
  // Direct state updates (won't add to history)
  const setDirectState = useCallback((updater) => {
    setState(updater);
  }, []);

  // Update state and add to history
  const updateState = useCallback((updater) => {
    if (isUndoingRef.current) return;

    setState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      
      setHistory(prevHistory => {
        // slice up to the current index => discard all "future" states
        const truncatedHistory = prevHistory.slice(0, currentIndex + 1);
        // push new one
        const newHistory = [...truncatedHistory, newState];
        
        // if we exceed maxHistory, remove the oldest
        if (newHistory.length > maxHistory) {
          newHistory.shift();
        } else {
          // only increment currentIndex if we didn't shift
          setCurrentIndex(truncatedHistory.length);
        }
        
        return newHistory;
      });
      
      return newState;
    });
  }, [currentIndex, maxHistory]);

  // Undo to previous state
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoingRef.current = true;
      const prevState = history[currentIndex - 1];
      setState(prevState);
      setCurrentIndex(currentIndex - 1);
      onUndo(prevState);
      isUndoingRef.current = false;
    } else {
      // No more states to revert to
      console.log('[DEBUG] Nothing to undo — at earliest history state.');
      onUndo(undefined);
    }
  }, [currentIndex, history, onUndo]);

  // Add keyboard shortcut for Ctrl+Z / Cmd+Z
  useEffect(() => {
    function handleKeyDown(e) {
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  // Expose helpful data
  return [
    state, 
    setDirectState, // Direct updates => not in history
    updateState,    // History-tracked updates
    undo,
    {
      canUndo: currentIndex > 0,
      history,
      currentIndex
    }
  ];
}
