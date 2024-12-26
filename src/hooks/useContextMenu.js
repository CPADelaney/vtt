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
  console.log('[DEBUG] ShowMenu called with options:', options);
  e.preventDefault();
  
  // Remove any existing menu first
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    console.log('[DEBUG] Removing existing menu');
    existingMenu.remove();
  }
  
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
    z-index: 1000;
    min-width: 120px;
  `;

  if (options.type === 'token') {
    console.log('[DEBUG] Creating token menu');
    const deleteOption = document.createElement('div');
    deleteOption.className = 'context-menu-item';
    deleteOption.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
    `;
    deleteOption.textContent = 'Delete Token(s)';
    deleteOption.onclick = () => {
      onDeleteTokens?.();
      setMenuState(null);
    };
    menuEl.appendChild(deleteOption);
  } else {
    console.log('[DEBUG] Creating grid menu');
    const addOption = document.createElement('div');
    addOption.className = 'context-menu-item';
    addOption.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
    `;
    addOption.textContent = 'Add Token';
    addOption.onclick = () => {
      onAddToken?.(e);
      setMenuState(null);
    };
    menuEl.appendChild(addOption);
  }
  
  document.body.appendChild(menuEl);
  console.log('[DEBUG] Menu element added to document');
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
