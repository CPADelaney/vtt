// js/components/Tabletop.jsx
import React, { useState, useEffect, useCallback } from 'react';

// Hooks you created
import { usePanning } from '../hooks/usePanning';
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';

// Components
import { Grid } from './Grid';
import { Token } from './Token';

export function Tabletop() {
  // Grid type, camera position, and zoom scale
  const [isHexGrid, setIsHexGrid] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Grid dimensioning (rows, cols)
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  // Tokens in React state
  const [tokens, setTokens] = useState([]);

  // Hooks for snapping
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: 50,
    hexWidth: Math.sqrt(3) * 30,
    hexHeight: 60
  });

  // Hook for panning
  const { isPanning, startPanning } = usePanning({
    currentX: position.x,
    currentY: position.y,
    updatePosition: (x, y) => setPosition({ x, y }),
    scale // if needed, or remove if your panning logic doesn't use scale
  });

  // Hook for token dragging (if you want to track final positions in state)
  const { startDrag } = useTokenDrag({
    scale,
    getSnappedPosition,
    onDragEnd: (tokenEl, newPos) => {
      // Example: update the token in React state
      const tokenId = tokenEl.id; // e.g. "token-12345..."
      setTokens(prev => prev.map(t =>
        t.id === tokenId ? { ...t, position: newPos } : t
      ));
    }
  });

  // Hook for token selection
  const {
    selectedTokens,
    selectToken,
    startMarquee,
    clearSelection
  } = useTokenSelection();

  // Hook for context menu
  const { showMenu } = useContextMenu({
    onAddToken: (e) => {
      // Add a token at the clicked position
      const x = (e.clientX - position.x) / scale;
      const y = (e.clientY - position.y) / scale;
      const snappedPos = getSnappedPosition(x, y);

      setTokens(prev => [...prev, {
        id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        position: snappedPos,
        stats: { hp: 100, maxHp: 100, name: 'New Token' }
      }]);
    },
    onDeleteTokens: () => {
      // Remove selected tokens from state
      setTokens(prev => prev.filter(t => !selectedTokens.has(document.getElementById(t.id))));
      clearSelection();
    }
  });

  /**
   * Update grid dimensions on mount or when certain parameters change
   * (like isHexGrid).
   */
  useEffect(() => {
    function updateGridDimensions() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (isHexGrid) {
        // For hex grids
        const effectiveHeight = 60 * 0.75; // hexHeight * 0.75
        const rows = Math.ceil(viewportHeight / effectiveHeight) + 2;
        const cols = Math.ceil(viewportWidth / (Math.sqrt(3) * 30)) + 2; // hexWidth = sqrt(3)*30
        setDimensions({ rows, cols });
      } else {
        // For square grids
        const gridSize = 50;
        const rows = Math.ceil(viewportHeight / gridSize) + 2;
        const cols = Math.ceil(viewportWidth / gridSize) + 2;
        setDimensions({ rows, cols });
      }
    }

    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    return () => {
      window.removeEventListener('resize', updateGridDimensions);
    };
  }, [isHexGrid]);

  // Mouse event handlers for the container
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) {
      // Right-click => start panning (or you might do a threshold approach)
      startPanning(e);
    } else if (e.button === 0) {
      // Left-click: check if we clicked a token
      const tokenEl = e.target.closest('.token');
      if (tokenEl) {
        // If not holding shift, clear old selection
        if (!e.shiftKey) clearSelection();
        selectToken(tokenEl);

        // Start dragging that token
        startDrag(tokenEl, e);
      } else {
        // Start marquee selection
        if (!e.shiftKey) clearSelection();
        startMarquee(e);
      }
    }
  }, [startPanning, clearSelection, selectToken, startDrag, startMarquee]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    if (!isPanning) {
      // If we're not actively panning, show the context menu
      const tokenEl = e.target.closest('.token');
      showMenu(e, { type: tokenEl ? 'token' : 'grid' });
    }
  }, [isPanning, showMenu]);

  return (
    <div 
      id="tabletop-container"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div
        id="tabletop"
        className={isHexGrid ? 'hex-grid' : 'square-grid'}
        style={{
          position: 'relative',
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          width: '100%', // so the grid can fill the container
          height: '100%'
        }}
      >
        <Grid
          isHexGrid={isHexGrid}
          gridSize={50}
          hexSize={30}
          rows={dimensions.rows}
          cols={dimensions.cols}
        />

        {/* Render tokens from state */}
        {tokens.map(token => (
          <Token
            key={token.id}
            id={token.id}
            position={token.position}
            stats={token.stats}
            isSelected={!![...selectedTokens]
              .find(el => el?.id === token.id)
            }
            onClick={(e) => {
              e.stopPropagation(); // prevent it from triggering handleMouseDown on parent
              if (!e.shiftKey) clearSelection();
              selectToken(e.currentTarget); 
            }}
          />
        ))}
      </div>
    </div>
  );
}
