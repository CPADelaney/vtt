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
    // Handle both direct values and updater functions
    setState(current => {
      const newState = typeof updater === 'function' ? updater(current) : updater;
      return newState;
    });
  }, []);

  // Update state and add to history
  const updateState = useCallback((updater) => {
    if (isUndoingRef.current) return;

    setState(current => {
      const newState = typeof updater === 'function' ? updater(current) : updater;
      
      setHistory(prevHistory => {
        // If we're not at the end of history, truncate the future states
        const historySoFar = prevHistory.slice(0, currentIndex + 1);
        const newHistory = [...historySoFar, newState];

        // Handle history size limit
        if (newHistory.length > maxHistory) {
          const excess = newHistory.length - maxHistory;
          newHistory.splice(0, excess);
          setCurrentIndex(prev => Math.max(0, prev - excess));
        }
        
        return newHistory;
      });
      
      setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
      return newState;
    });
  }, [currentIndex, maxHistory]);

  // Undo to previous state
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoingRef.current = true;
      try {
        const previousState = history[currentIndex - 1];
        if (previousState !== undefined) {
          setState(previousState);
          setCurrentIndex(prev => prev - 1);
          onUndo(previousState);
        }
      } finally {
        isUndoingRef.current = false;
      }
    }
  }, [currentIndex, history, onUndo]);

  // Add keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      // Only handle if no input elements are focused
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' ||
          e.target.isContentEditable) {
        return;
      }

      // Handle Ctrl+Z for undo (or Cmd+Z on Mac)
      if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return [
    state, 
    setDirectState,   // Direct updates
    updateState,      // History-tracked updates
    undo,
    {
      canUndo: currentIndex > 0,
      history,
      currentIndex,
      isUndoing: isUndoingRef.current
    }
  ];
}
