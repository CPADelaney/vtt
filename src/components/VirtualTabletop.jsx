// js/components/VirtualTabletop.jsx
import React, { useState, useEffect, useCallback } from 'react';

// Hooks
import { usePanning } from '../hooks/usePanning';
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';

// Components
import { Grid } from './Grid';
import { Token } from './Token';
import { Controls } from './Controls';

export function VirtualTabletop() {
  // Core state
  const [isHexGrid, setIsHexGrid] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
  const [tokens, setTokens] = useState([]);

  // Grid configuration
  const gridConfig = {
    squareSize: 50,
    hexSize: 30,
    hexWidth: Math.sqrt(3) * 30, // ~51.96
    hexHeight: 60                // 2 * 30
  };

  // Snap logic for tokens or other items
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight
  });

  // Panning logic (right-click + drag)
  const { isPanning, startPanning } = usePanning({
    currentX: position.x,
    currentY: position.y,
    updatePosition: (x, y) => setPosition({ x, y })
  });

  // Token dragging logic (left-click + drag)
  const { startDrag } = useTokenDrag({
    scale,
    getSnappedPosition,
    onDragEnd: (tokenEl, newPos) => {
      const tokenId = tokenEl.id;
      setTokens(prev =>
        prev.map(t => (t.id === tokenId ? { ...t, position: newPos } : t))
      );
    }
  });

  // Selecting tokens (marquee, shift-click, etc.)
  const {
    selectedTokens,
    selectToken,
    startMarquee,
    clearSelection
  } = useTokenSelection();

  // Context menu logic (right-click with no drag)
  const { showMenu } = useContextMenu({
    onAddToken: e => {
      // Calculate position relative to camera/scale
      const x = (e.clientX - position.x) / scale;
      const y = (e.clientY - position.y) / scale;
      const snappedPos = getSnappedPosition(x, y);

      setTokens(prev => [
        ...prev,
        {
          id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          position: snappedPos,
          stats: { hp: 100, maxHp: 100, name: 'New Token' }
        }
      ]);
    },
    onDeleteTokens: () => {
      // Remove selected tokens from state
      setTokens(prev =>
        prev.filter(t => !selectedTokens.has(document.getElementById(t.id)))
      );
      clearSelection();
    }
  });

  // Campaign manager hook (load/save state)
  const campaign = useCampaignManager({
    transform: { x: position.x, y: position.y, scale },
    tokens,
    isHexGrid,
    onStateChange: state => {
      // Called when campaign state is loaded or changed
      setPosition({ x: state.transform.x, y: state.transform.y });
      setScale(state.transform.scale);
      setTokens(state.tokens);
      setIsHexGrid(state.isHexGrid);
    }
  });

  // Calculate grid dimensions (rows, cols) based on window size
  useEffect(() => {
    function updateGridDimensions() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (isHexGrid) {
        const effectiveHeight = gridConfig.hexHeight * 0.75; // 60 * 0.75 = 45
        setDimensions({
          rows: Math.ceil(viewportHeight / effectiveHeight) + 2,
          cols: Math.ceil(viewportWidth / gridConfig.hexWidth) + 2
        });
      } else {
        const size = gridConfig.squareSize; // 50
        setDimensions({
          rows: Math.ceil(viewportHeight / size) + 2,
          cols: Math.ceil(viewportWidth / size) + 2
        });
      }
    }

    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    return () => window.removeEventListener('resize', updateGridDimensions);
  }, [isHexGrid, gridConfig]);

  // Zoom logic
  const handleZoom = useCallback(
    factor => {
      const container = document.getElementById('tabletop-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Current center in local coords (before zoom)
      const beforeZoomX = (centerX - position.x) / scale;
      const beforeZoomY = (centerY - position.y) / scale;

      // Apply zoom factor, clamp between 0.5 and 2
      const newScale = Math.min(Math.max(scale * factor, 0.5), 2);

      // Recompute position so the same center is maintained
      const afterZoomX = (centerX - position.x) / newScale;
      const afterZoomY = (centerY - position.y) / newScale;

      setScale(newScale);
      setPosition({
        x: position.x + (afterZoomX - beforeZoomX) * newScale,
        y: position.y + (afterZoomY - beforeZoomY) * newScale
      });
    },
    [position, scale]
  );

  // Mouse down logic (panning vs. token drag vs. marquee)
  const handleMouseDown = useCallback(
    e => {
      if (e.button === 2) {
        // Right-click => pan
        startPanning(e);
      } else if (e.button === 0) {
        // Left-click => token drag or marquee
        const tokenEl = e.target.closest('.token');
        if (tokenEl) {
          if (!e.shiftKey) clearSelection();
          selectToken(tokenEl);
          startDrag(tokenEl, e);
        } else {
          if (!e.shiftKey) clearSelection();
          startMarquee(e);
        }
      }
    },
    [startPanning, clearSelection, selectToken, startDrag, startMarquee]
  );

  // Right-click context menu
  const handleContextMenu = useCallback(
    e => {
      e.preventDefault();
      if (!isPanning) {
        const tokenEl = e.target.closest('.token');
        showMenu(e, { type: tokenEl ? 'token' : 'grid' });
      }
    },
    [isPanning, showMenu]
  );

  // Load saved state or place default token if none found
  useEffect(() => {
    const hadState = campaign.loadState();
    if (!hadState) {
      // No saved campaign => drop default token in center
      const idStr = `token-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
      setTokens([
        {
          id: idStr,
          position: {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          },
          stats: { hp: 100, maxHp: 100, name: 'New Token' }
        }
      ]);
    }
  }, [campaign]);

  return (
    <>
      <Controls
        isHexGrid={isHexGrid}
        scale={scale}
        onToggleGrid={() => setIsHexGrid(!isHexGrid)}
        onZoomIn={() => handleZoom(1.1)}
        onZoomOut={() => handleZoom(0.9)}
      />

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
            width: '100%',
            height: '100%'
          }}
        >
          <Grid
            isHexGrid={isHexGrid}
            {...gridConfig}
            {...dimensions}
          />

          {/* Render tokens */}
          {tokens.map(token => (
            <Token
              key={token.id}
              {...token}
              isSelected={
                !![...selectedTokens].find(el => el?.id === token.id)
              }
              onClick={e => {
                e.stopPropagation(); // don't let it bubble up to handleMouseDown
                if (!e.shiftKey) clearSelection();
                selectToken(e.currentTarget);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
