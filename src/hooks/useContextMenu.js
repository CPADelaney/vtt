import { useState, useCallback, useEffect } from 'react';

export function useContextMenu({ onAddToken, onDeleteTokens }) {
  const [menuState, setMenuState] = useState(null);

  const cleanupMenu = useCallback(() => {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    setMenuState(null);
  }, []);

  const showMenu = useCallback((e, options) => {
    console.log('[DEBUG-CHAIN] 7. showMenu called with options:', options);
    e.preventDefault();
    
    cleanupMenu();

    // Create and add menu
    const menuEl = document.createElement('div');
    menuEl.className = 'context-menu';
    menuEl.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 4px 0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 9999;
      min-width: 120px;
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .context-menu-item:hover {
        background-color: #f0f0f0;
      }
    `;
    menuEl.appendChild(styleSheet);

    if (options.type === 'token') {
      console.log('[DEBUG-CHAIN] 9a. Creating token menu');
      const deleteOption = document.createElement('div');
      deleteOption.className = 'context-menu-item';
      deleteOption.style.cssText = 'padding: 8px 12px; cursor: pointer; user-select: none;';
      deleteOption.textContent = 'Delete Token(s)';
      deleteOption.onclick = (clickEvent) => {
        clickEvent.stopPropagation();
        onDeleteTokens?.();
        cleanupMenu();
      };
      menuEl.appendChild(deleteOption);
    } else {
      console.log('[DEBUG-CHAIN] 9b. Creating grid menu');
      const addOption = document.createElement('div');
      addOption.className = 'context-menu-item';
      addOption.style.cssText = 'padding: 8px 12px; cursor: pointer; user-select: none;';
      addOption.textContent = 'Add Token';
      addOption.onclick = (clickEvent) => {
        clickEvent.stopPropagation();
        onAddToken?.(e);
        cleanupMenu();
      };
      menuEl.appendChild(addOption);
    }

    // Ensure menu stays within viewport
    requestAnimationFrame(() => {
      const rect = menuEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuEl.style.left = `${viewportWidth - rect.width - 5}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuEl.style.top = `${viewportHeight - rect.height - 5}px`;
      }
    });

    document.body.appendChild(menuEl);
    console.log('[DEBUG-CHAIN] 10. Menu added to document');
    
    // Set menu state after a small delay to avoid immediate cleanup
    setTimeout(() => {
      setMenuState({ element: menuEl });
    }, 100);
  }, [onAddToken, onDeleteTokens, cleanupMenu]);

  useEffect(() => {
    if (!menuState) return;

    // Flag to track if we should handle clicks
    let canHandleClicks = false;

    function onMouseDown(e) {
      // Only handle clicks if we're ready and click is outside menu
      if (canHandleClicks && !e.target.closest('.context-menu')) {
        cleanupMenu();
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cleanupMenu();
      }
    }

    // Add listeners immediately but delay when we start handling clicks
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    // Enable click handling after a small delay
    const enableClickHandling = setTimeout(() => {
      canHandleClicks = true;
    }, 100);

    return () => {
      clearTimeout(enableClickHandling);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuState, cleanupMenu]);

  return { showMenu };
}
