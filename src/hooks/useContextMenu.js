import { useState, useCallback, useEffect, useRef } from 'react';

export function useContextMenu({ onAddToken, onDeleteTokens }) {
  const [menuState, setMenuState] = useState(null);
  const menuRef = useRef(null);

  const cleanupMenu = useCallback(() => {
    if (menuRef.current) {
      menuRef.current.remove();
      menuRef.current = null;
    }
    setMenuState(null);
  }, []);

  const showMenu = useCallback((e, options) => {
    e.preventDefault();
    e.stopPropagation();
    
    cleanupMenu();

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

    if (options.type === 'token') {
      const deleteOption = document.createElement('div');
      deleteOption.className = 'context-menu-item';
      deleteOption.style.cssText = 'padding: 8px 12px; cursor: pointer; user-select: none;';
      deleteOption.textContent = 'Delete Token(s)';
      deleteOption.onclick = (e) => {
        e.stopPropagation();
        onDeleteTokens?.();
        cleanupMenu();
      };
      menuEl.appendChild(deleteOption);
    } else {
      const addOption = document.createElement('div');
      addOption.className = 'context-menu-item';
      addOption.style.cssText = 'padding: 8px 12px; cursor: pointer; user-select: none;';
      addOption.textContent = 'Add Token';
      addOption.onclick = (e) => {
        e.stopPropagation();
        onAddToken?.(e);
        cleanupMenu();
      };
      menuEl.appendChild(addOption);
    }

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
  }, [onAddToken, onDeleteTokens, cleanupMenu]);

  // Global event listeners for cleanup
  useEffect(() => {
    if (!menuState) return;

    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        cleanupMenu();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cleanupMenu();
      }
    };

    // Use capture phase to get events first
    window.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('contextmenu', handleClickOutside, true);
    window.addEventListener('keydown', handleEscape, true);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('contextmenu', handleClickOutside, true);
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [menuState, cleanupMenu]);

  return { showMenu, cleanupMenu };
}
