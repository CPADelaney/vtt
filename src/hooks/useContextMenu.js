// js/hooks/useContextMenu.js
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
  console.log('[DEBUG-CHAIN] 8. showMenu called:', options);
  e.preventDefault();
  
  // Remove any existing menu
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    console.log('[DEBUG-CHAIN] 9. Removing existing menu');
    existingMenu.remove();
  }
  
  const menuEl = document.createElement('div');
  menuEl.className = 'context-menu';
  menuEl.style.left = `${e.clientX}px`;
  menuEl.style.top = `${e.clientY}px`;
  
  if (options.type === 'token') {
    console.log('[DEBUG-CHAIN] 10a. Creating token menu');
    const deleteOption = document.createElement('div');
    deleteOption.className = 'context-menu-item';
    deleteOption.textContent = 'Delete Token(s)';
    deleteOption.onclick = () => {
      onDeleteTokens?.();
      setMenuState(null);
    };
    menuEl.appendChild(deleteOption);
  } else {
    console.log('[DEBUG-CHAIN] 10b. Creating grid menu');
    const addOption = document.createElement('div');
    addOption.className = 'context-menu-item';
    addOption.textContent = 'Add Token';
    addOption.onclick = () => {
      onAddToken?.(e);
      setMenuState(null);
    };
    menuEl.appendChild(addOption);
  }
  
  // Add menu to document
  document.body.appendChild(menuEl);
  console.log('[DEBUG-CHAIN] 11. Menu element added to document');
  setMenuState({ element: menuEl });
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

    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [menuState]);

  return { showMenu };
}
