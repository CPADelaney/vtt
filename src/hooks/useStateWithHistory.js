import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing state with undo history
 * @param {any} initialState - The initial state value
 * @param {Object} options - Configuration options
 * @param {number} [options.maxHistory=50] - Maximum number of history states to keep
 * @param {function} [options.onUndo] - Callback that runs after an undo operation
 * @returns {[any, function, function, { canUndo: boolean, history: Array }]} 
 * Returns [currentState, setState, undo, metadata]
 */
export function useStateWithHistory(initialState, options = {}) {
  const { 
    maxHistory = 50,
    onUndo = () => {} 
  } = options;

  // Core state
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Refs for tracking undo status
  const isUndoingRef = useRef(false);
  
  // Update state and add to history
  const updateState = useCallback((updater) => {
    if (isUndoingRef.current) return;

    setState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      
      setHistory(prevHistory => {
        // If we're not at the end, truncate future states
        const historySoFar = prevHistory.slice(0, currentIndex + 1);
        
        // Add new state and limit history length
        const newHistory = [...historySoFar, newState];
        if (newHistory.length > maxHistory) {
          newHistory.shift(); // Remove oldest state
          setCurrentIndex(prev => prev - 1); // Adjust index
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
      // Only handle if no input elements are focused
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Ctrl+Z for undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  // Return current state, update function, undo function, and metadata
  return [
    state, 
    updateState, 
    undo,
    {
      canUndo: currentIndex > 0,
      history,
      currentIndex
    }
  ];
}
