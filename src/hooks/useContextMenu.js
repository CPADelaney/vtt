import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useContextMenu - Hook to manage the state and visibility of a custom context menu.
 * Provides state (menuState) to a rendering component and functions to show/hide it.
 * Handles hiding the menu on outside clicks, escape key, or wheel events.
 *
 * Callbacks like onAddToken or onDeleteTokens are NOT managed by the hook,
 * but should be passed to the component that *renders* the menu based on `menuState`.
 */
export function useContextMenu() {
  // menuState will be null or { x: number, y: number, type: 'token' | 'grid', ...other options needed by menu component }
  const [menuState, setMenuState] = useState(null);

  const hideMenu = useCallback(() => {
      console.log('[DEBUG] Hiding context menu.');
    setMenuState(null);
  }, []); // hideMenu is stable

  /**
   * Call this function to show the context menu.
   * @param {MouseEvent} e - The mouse event that triggered the context menu (used for position).
   * @param {object} options - An object containing context-specific data (e.g., { type: 'token', tokenIds: [...] } or { type: 'grid', gridCoords: {x, y} }).
   */
  const showMenu = useCallback((e, options) => {
    // Prevent default browser context menu - this is typically handled by the element
    // that calls this hook's `showMenu` function (e.g., ZoomableContainer or VirtualTabletop)
    // e.preventDefault(); // Assume parent handles this
    // e.stopPropagation(); // Assume parent handles this

    console.log('[DEBUG] Showing context menu at:', { clientX: e.clientX, clientY: e.clientY, options });

    // Set state to show the menu at the mouse position with context-specific data
    setMenuState({
      x: e.clientX, // Screen coordinates
      y: e.clientY, // Screen coordinates
      ...options // Spread any additional options needed by the menu component
    });

    // No need for position adjustment logic here; the rendering component or CSS should handle screen boundaries.

  }, []); // showMenu is stable


  // Memoized handler for hiding the menu on outside interactions
   const handleClickOutsideRef = useRef(handleClickOutside);
    useEffect(() => {
        handleClickOutsideRef.current = handleClickOutside;
    }, [hideMenu]); // Depend on hideMenu which is stable

    function handleClickOutside(e) {
         // Use setTimeout to allow the click/contextmenu event on menu items to propagate and handle their action first (like clicking a "Delete" item)
       setTimeout(() => {
            // Check if the menu is currently open
            if (!menuState) return;

            // Find the rendered menu element by class name
            const menuElement = document.querySelector('.context-menu');
            // If the menu element exists AND the click target is NOT inside the menu element
             if (menuElement && !menuElement.contains(e.target)) {
                 console.log('[DEBUG] Click/contextmenu outside menu detected, hiding.');
                 hideMenu();
             } else if (!menuElement) {
                 // If menuState is active but the element isn't found, something is wrong, maybe hide?
                 console.warn('[DEBUG] Context menu state active, but element not found. Hiding.');
                 hideMenu();
             }
       }, 0); // Run after current event loop ticks
    }


  // Effect to add global listeners for hiding the menu
  useEffect(() => {
    // Only attach listeners when the menu is actually open
    if (!menuState) return;

    console.log('[DEBUG] Attaching global listeners for context menu hide.');

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
          console.log('[DEBUG] Escape key pressed, hiding menu.');
        hideMenu();
      }
    };

    // Attach listeners globally using the stable ref for click handler
    // Use capture phase to ensure they run before bubbling handlers
    window.addEventListener('mousedown', handleClickOutsideRef.current, true);
    window.addEventListener('contextmenu', handleClickOutsideRef.current, true);
    window.addEventListener('keydown', handleEscape, true);
    window.addEventListener('wheel', hideMenu, true); // Hide on any scroll/wheel

    // Cleanup listeners when the menu is hidden or component unmounts
    return () => {
      console.log('[DEBUG] Removing global listeners for context menu hide.');
      window.removeEventListener('mousedown', handleClickOutsideRef.current, true);
      window.removeEventListener('contextmenu', handleClickOutsideRef.current, true);
      window.removeEventListener('keydown', handleEscape, true);
      window.removeEventListener('wheel', hideMenu, true);
    };
  }, [menuState, hideMenu]); // Effect runs when menuState changes or hideMenu callback changes (it's stable)

  // Return state and functions needed by the rendering component and parent
  return {
    menuState, // State containing menu position and type/options
    showMenu,  // Function to show the menu (triggered by mouse event)
    hideMenu   // Function to hide the menu (called by menu items or outside listener)
  };
}