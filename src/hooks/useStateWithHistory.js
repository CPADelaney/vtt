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
        const historySoFar = prevHistory.slice(0, currentIndex + 1);
        const newHistory = [...historySoFar, newState];
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          setCurrentIndex(prev => prev - 1);
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
      const previousState = history[currentIndex - 1];
      setState(previousState);
      setCurrentIndex(prev => prev - 1);
      onUndo(previousState);
      isUndoingRef.current = false;
    }
  }, [currentIndex, history, onUndo]);

  // Add keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  return [
    state, 
    setDirectState, // Direct updates
    updateState,    // History-tracked updates
    undo,
    {
      canUndo: currentIndex > 0,
      history,
      currentIndex
    }
  ];
}
