import { useState, useCallback, useEffect, useRef } from 'react';
// Removed direct DOM manipulation

export function useContextMenu({ onAddToken, onDeleteTokens }) {
  // menuState will be null or { x: number, y: number, type: 'token' | 'grid' }
  const [menuState, setMenuState] = useState(null);

  const hideMenu = useCallback(() => {
      console.log('[DEBUG] Hiding context menu.');
    setMenuState(null);
  }, []);

  const showMenu = useCallback((e, options) => {
    // Prevent default browser context menu
    e.preventDefault();
    e.stopPropagation();

    console.log('[DEBUG] Showing context menu at:', { x: e.clientX, y: e.clientY, type: options.type });

    // Set state to show the menu at the mouse position
    setMenuState({
      x: e.clientX,
      y: e.clientY,
      type: options.type, // Pass type (e.g., 'token', 'grid')
      // You could add other info like clicked token ID here if type is 'token'
    });

    // Position adjustment if menu goes off screen (best handled by the rendering component/CSS)
    // requestAnimationFrame(() => { ... }); // This positioning logic is now responsibility of the rendering component or CSS

  }, []); // onAddToken and onDeleteTokens are not needed here, they are passed to the rendered component


  // Effect to add global listeners for hiding the menu
  useEffect(() => {
    // Only attach listeners when the menu is actually open
    if (!menuState) return;

    const handleClickOutside = (e) => {
      // Check if the click is outside the menu element itself
      // We need a way to reference the rendered menu element.
      // The rendering component should handle this by attaching the hideMenu handler.
      // However, we can listen for *any* mouse down/contextmenu and hide the menu,
      // UNLESS the event target is specifically the menu or one of its items.

      // Simple approach: hide on any click/right-click *outside* the context menu element.
      // The rendering component needs to attach 'mousedown' and 'contextmenu' handlers
      // to the menu element itself and stop propagation to prevent this listener from firing.
      // Also hide on *any* scroll, as menu position won't track scroll.

       // Use setTimeout to allow the click/contextmenu event on menu items to propagate and handle their action first
       setTimeout(() => {
            const menuElement = document.querySelector('.context-menu'); // Find the rendered menu element
             if (menuElement && !menuElement.contains(e.target)) {
                 console.log('[DEBUG] Click/contextmenu outside menu detected, hiding.');
                 hideMenu();
             }
       }, 0); // Run after current event loop ticks


    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
          console.log('[DEBUG] Escape key pressed, hiding menu.');
        hideMenu();
      }
    };

    // Attach listeners globally
    window.addEventListener('mousedown', handleClickOutside, true); // Use capture phase
    window.addEventListener('contextmenu', handleClickOutside, true); // Use capture phase
    window.addEventListener('keydown', handleEscape, true);
     window.addEventListener('wheel', hideMenu, true); // Hide on any scroll/wheel

    // Cleanup listeners when the menu is hidden or component unmounts
    return () => {
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('contextmenu', handleClickOutside, true);
      window.removeEventListener('keydown', handleEscape, true);
       window.removeEventListener('wheel', hideMenu, true);
    };
  }, [menuState, hideMenu]); // Effect runs when menuState changes

  // Return state and functions needed by the rendering component
  return {
    menuState, // State containing menu position and type
    showMenu,  // Function to show the menu (triggered by mouse event)
    hideMenu   // Function to hide the menu (called by menu items or outside click)
  };
}