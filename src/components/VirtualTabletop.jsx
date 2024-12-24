// src/components/VirtualTabletop.jsx
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
import { Sidebar } from './Sidebar';     // If used
import { ChatBox } from './ChatBox';     // If used

export default function VirtualTabletop() {
  // Core React state
  const [isHexGrid, setIsHexGrid] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
  const [tokens, setTokens] = useState([]);

  // Grid config
  const gridConfig = {
    squareSize: 50,
    hexSize: 30,
    hexWidth: Math.sqrt(3) * 30,
    hexHeight: 60
  };

  // Snapping
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight
  });

  // Panning (right-click drag)
  const { isPanning, startPanning } = usePanning({
    currentX: position.x,
    currentY: position.y,
    updatePosition: (x, y) => setPosition({ x, y })
  });

  // Token dragging
  const { startDrag } = useTokenDrag({
    scale,
    getSnappedPosition,
    /** 
     * If you want live updates while dragging, you can do onDragMove: 
     *   (tokenId, newPos) => {
     *     setTokens(prev => prev.map(t => t.id===tokenId ? { ...t, position:newPos} : t));
     *   }
     * 
     * Below we do final updates in onDragEnd only, 
     * but you can do real-time updates in onDragMove if you want "live" dragging.
     */
    onDragMove: (tokenId, newPos) => {
      // For a live preview of the drag:
      setTokens(prev =>
        prev.map(t => (t.id === tokenId ? { ...t, position: newPos } : t))
      );
    },
    onDragEnd: (tokenId) => {
      // Maybe do something after the drag ends
      // e.g., campaign.saveState(tokens);
    }
  });

  // Token selection
  const {
    selectedTokenIds,
    selectTokenId,
    clearSelection,
    startMarquee
  } = useTokenSelection();

  // Right-click context menu
  const { showMenu } = useContextMenu({
    onAddToken: e => {
      // Add a new token at the snapped position
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
      // Delete any tokens whose IDs are in selectedTokenIds
      setTokens(prev => prev.filter(t => ![...selectedTokenIds].some(el => el === t.id)));
      clearSelection();
    }
  });

  // Set up your VTT-like object
  const vttObject = {
    isHexGrid,
    scale,
    currentX: position.x,
    currentY: position.y,
    toggleGridType: () => setIsHexGrid(h => !h)
  };

  // Use campaign manager
  const { saveState, loadState } = useCampaignManager(vttObject, 'default-campaign');

  // Recompute grid dimensions
  useEffect(() => {
    function updateGridDimensions() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (isHexGrid) {
        const effectiveHeight = gridConfig.hexHeight * 0.75;
        setDimensions({
          rows: Math.ceil(viewportHeight / effectiveHeight) + 2,
          cols: Math.ceil(viewportWidth / gridConfig.hexWidth) + 2
        });
      } else {
        setDimensions({
          rows: Math.ceil(viewportHeight / gridConfig.squareSize) + 2,
          cols: Math.ceil(viewportWidth / gridConfig.squareSize) + 2
        });
      }
    }

    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    return () => window.removeEventListener('resize', updateGridDimensions);
  }, [isHexGrid, gridConfig]);

  // Zoom
  const handleZoom = useCallback(
    factor => {
      const container = document.getElementById('tabletop-container');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const beforeZoomX = (centerX - position.x) / scale;
      const beforeZoomY = (centerY - position.y) / scale;

      const newScale = Math.min(Math.max(scale * factor, 0.5), 2);

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

  // Mouse down logic
  const handleMouseDown = useCallback(
    e => {
      if (e.button === 2) {
        // Right-click => pan
        startPanning(e);
      } else if (e.button === 0) {
        // Left-click => maybe drag token or marquee
        const tokenEl = e.target.closest('.token');
        if (tokenEl) {
          // The token's ID
          const tokenId = tokenEl.id;

          // If SHIFT not held, clear old selection
          if (!e.shiftKey) clearSelection();

          // Add this token to selection
          selectTokenId(tokenId, e.shiftKey);

          // Start the drag in our useTokenDrag
          const tokenObj = tokens.find(t => t.id === tokenId);
          if (tokenObj) {
            startDrag(tokenObj, e);
          }
        } else {
          // Start marquee selection
          if (!e.shiftKey) clearSelection();
          startMarquee(e);
        }
      }
    },
    [startPanning, clearSelection, selectTokenId, tokens, startDrag, startMarquee]
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

  // Load state or place default token
  useEffect(() => {
    const loaded = loadState();
    if (!loaded) {
      // No saved campaign => create a default token
      const idStr = `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setTokens([{
        id: idStr,
        position: {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        },
        stats: { hp: 100, maxHp: 100, name: 'New Token' }
      }]);
    } else {
      // Apply loaded tokens and grid
      setTokens(loaded.tokens);
      setPosition({ x: loaded.grid.x, y: loaded.grid.y });
      setScale(loaded.grid.scale);
      setIsHexGrid(loaded.grid.isHexGrid);
    }
  }, [loadState]);

  // Optionally autosave tokens whenever they change:
  // useEffect(() => {
  //   saveState(tokens);
  // }, [tokens, saveState]);

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
              // isSelected if token.id is in selectedTokenIds
              isSelected={selectedTokenIds.has(token.id)}
              // We let the parent handle clicks, so we pass an onClick that does nothing
              onClick={e => e.stopPropagation()}
            />
          ))}
        </div>
      </div>

      {/* If you have a sidebar or chat, render them as well */}
      {/* <Sidebar ... /> */}
      {/* <ChatBox ... /> */}
    </>
  );
}
