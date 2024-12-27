import { useState, useCallback, useEffect, useRef } from 'react';

export function useContextMenu({ onAddToken, onDeleteTokens }) {
  const [menuState, setMenuState] = useState(null);
  const menuRef = useRef(null);
  const clickHandlerEnabledRef = useRef(false);

  const cleanupMenu = useCallback(() => {
    if (menuRef.current) {
      menuRef.current.remove();
      menuRef.current = null;
    }
    setMenuState(null);
    clickHandlerEnabledRef.current = false;
  }, []);

  const showMenu = useCallback((e, options) => {
    // Don't show menu if it was a pan action
    if (e.isPanning) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
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

    // Add menu items based on context
    if (options.type === 'token') {
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
    document.body.appendChild(menuEl);
    menuRef.current = menuEl;

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

    setMenuState({ element: menuEl });
    
    // Enable click handling immediately
    clickHandlerEnabledRef.current = true;
  }, [onAddToken, onDeleteTokens, cleanupMenu]);

  useEffect(() => {
    if (!menuState) return;

    function onMouseDown(e) {
      // Check if click is outside menu and click handling is enabled
      if (clickHandlerEnabledRef.current && !e.target.closest('.context-menu')) {
        cleanupMenu();
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cleanupMenu();
      }
    }

    // Add listeners immediately
    window.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menuState, cleanupMenu]);

  return { showMenu };
}
