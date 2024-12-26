import { useState, useCallback, useEffect } from 'react';

/**
 * useContextMenu handles showing a right-click menu.
 * 
 * @param {function} onAddToken - Called when 'Add Token' is clicked.
 * @param {function} onDeleteTokens - Called when 'Delete Token(s)' is clicked.
 */
export function useContextMenu({ onAddToken, onDeleteTokens }) {
  const [menuState, setMenuState] = useState(null);

  /**
   * showMenu is called externally to actually display the menu.
   * 
   * @param {MouseEvent} e - The right-click event.
   * @param {object} options - E.g. { type: 'token' | 'grid' }
   */
  const showMenu = useCallback((e, options) => {
    console.log('[DEBUG-CHAIN] 7. showMenu called with options:', options);
    e.preventDefault();
    
    // Remove any existing menu first
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      console.log('[DEBUG-CHAIN] 8. Removing existing menu');
      existingMenu.remove();
      setMenuState(null);
    }

    // Small delay to ensure we're not in a pan operation
    setTimeout(() => {
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

      // Add hover effect styles
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
        deleteOption.style.cssText = 'padding: 8px 12px; cursor: pointer;';
        deleteOption.textContent = 'Delete Token(s)';
        deleteOption.onclick = (clickEvent) => {
          clickEvent.stopPropagation();
          onDeleteTokens?.();
          setMenuState(null);
        };
        menuEl.appendChild(deleteOption);
      } else {
        console.log('[DEBUG-CHAIN] 9b. Creating grid menu');
        const addOption = document.createElement('div');
        addOption.className = 'context-menu-item';
        addOption.style.cssText = 'padding: 8px 12px; cursor: pointer;';
        addOption.textContent = 'Add Token';
        addOption.onclick = (clickEvent) => {
          clickEvent.stopPropagation();
          onAddToken?.(e);
          setMenuState(null);
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
      setMenuState({ element: menuEl });
    }, 50); // Small delay to let pan detection complete
  }, [onAddToken, onDeleteTokens]);

  // Clean up menu on outside click or if menuState changes
  useEffect(() => {
    if (!menuState) return;

    function onMouseDown(e) {
      if (!e.target.closest('.context-menu')) {
        menuState.element.remove();
        setMenuState(null);
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        menuState.element.remove();
        setMenuState(null);
      }
    }

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuState]);

  return { showMenu };
}
