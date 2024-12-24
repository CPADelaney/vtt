import React, { useState, useEffect, useCallback, useMemo } from 'react';
import _ from 'lodash';

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
import { Sidebar } from './Sidebar';
import { ChatBox } from './ChatBox';

// Constants
const MIN_SCALE = 0.8;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 0.1;
const DEFAULT_SQUARE_SIZE = 50;
const DEFAULT_HEX_SIZE = 30;

export default function VirtualTabletop() {
  // Core React state
  const [isHexGrid, setIsHexGrid] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
  const [tokens, setTokens] = useState([]);

  // Memoized grid configuration
  const gridConfig = useMemo(
    () => ({
      squareSize: DEFAULT_SQUARE_SIZE,
      hexSize: DEFAULT_HEX_SIZE,
      hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
      hexHeight: DEFAULT_HEX_SIZE * 2,
    }),
    []
  );

  // Memoized styles
  const tabletopStyle = useMemo(
    () => ({
      position: 'relative',
      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
      width: '100%',
      height: '100%',
    }),
    [position.x, position.y, scale]
  );

  const containerStyle = useMemo(
    () => ({
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
    }),
    []
  );

  // Snapping logic
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
  });

  // Panning logic with scale
  const { isPanning, startPanning } = usePanning({
    currentX: position.x,
    currentY: position.y,
    updatePosition: (x, y) => setPosition({ x, y }),
    scale,
  });

  // Prevent default wheel behavior
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

  // Token dragging logic
  const { startDrag } = useTokenDrag({
    scale,
    getSnappedPosition,
    onDragMove: (tokenId, newPos) => {
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, position: newPos } : t))
      );
    },
    onDragEnd: _.noop,
  });

  // Token selection
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee } =
    useTokenSelection();

  // Token handlers
  const handleAddToken = useCallback(
    (e) => {
      const x = (e.clientX - position.x) / scale;
      const y = (e.clientY - position.y) / scale;
      const snappedPos = getSnappedPosition(x, y);

      setTokens((prev) => [
        ...prev,
        {
          id: `token-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`,
          position: snappedPos,
          stats: { hp: 100, maxHp: 100, name: 'New Token' },
        },
      ]);
    },
    [position, scale, getSnappedPosition]
  );

  const handleDeleteTokens = useCallback(() => {
    setTokens((prev) => prev.filter((t) => !selectedTokenIds.has(t.id)));
    clearSelection();
  }, [selectedTokenIds, clearSelection]);

  // Context menu
  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens,
  });

  // VTT state object
  const vttObject = useMemo(
    () => ({
      isHexGrid,
      scale,
      currentX: position.x,
      currentY: position.y,
      toggleGridType: () => setIsHexGrid((h) => !h),
    }),
    [isHexGrid, scale, position.x, position.y]
  );

  // Campaign manager
  const { saveState, loadState } = useCampaignManager(
    vttObject,
    'default-campaign'
  );

  // Grid dimension update
  const updateGridDimensions = useMemo(
    () =>
      _.debounce(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (isHexGrid) {
          const effectiveHeight = gridConfig.hexHeight * 0.75;
          setDimensions({
            rows: Math.ceil(viewportHeight / effectiveHeight) + 2,
            cols: Math.ceil(viewportWidth / gridConfig.hexWidth) + 2,
          });
        } else {
          setDimensions({
            rows: Math.ceil(viewportHeight / gridConfig.squareSize) + 2,
            cols: Math.ceil(viewportWidth / gridConfig.squareSize) + 2,
          });
        }
      }, 100),
    [isHexGrid, gridConfig]
  );

  // Resize listener
  useEffect(() => {
    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    return () => {
      updateGridDimensions.cancel();
      window.removeEventListener('resize', updateGridDimensions);
    };
  }, [updateGridDimensions]);

  // Optional: button-based zoom in/out
  const handleZoom = useCallback(
    (factor) => {
      const container = document.getElementById('tabletop-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Zoom relative to the center of the container
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Convert center to "world" coords
      const gridX = (centerX - position.x) / scale;
      const gridY = (centerY - position.y) / scale;

      const newScale = Math.min(Math.max(scale * factor, MIN_SCALE), MAX_SCALE);

      // After we zoom, figure out where the center coords land
      const afterX = gridX * newScale;
      const afterY = gridY * newScale;

      // Shift the position so that the center doesn't move
      setScale(newScale);
      setPosition({
        x: centerX - afterX,
        y: centerY - afterY,
      });
    },
    [position, scale]
  );

  // Helper to find the "center" of the cell that the mouse is hovering over
  const getTargetCell = useCallback(
    (localX, localY) => {
      // Convert from container's local space to "world" space
      const gridX = (localX - position.x) / scale;
      const gridY = (localY - position.y) / scale;

      if (isHexGrid) {
        // Approximate math for hex row/column
        const verticalSpacing = gridConfig.hexHeight * 0.75;
        const row = Math.round(gridY / verticalSpacing);
        const isOffsetRow = row % 2 === 1;
        const offsetX = isOffsetRow ? gridConfig.hexWidth / 2 : 0;
        const col = Math.round((gridX - offsetX) / gridConfig.hexWidth);

        return {
          x: col * gridConfig.hexWidth + offsetX,
          y: row * verticalSpacing,
        };
      } else {
        // For a square grid, snap to the cell center
        const cellX = Math.floor(gridX / gridConfig.squareSize);
        const cellY = Math.floor(gridY / gridConfig.squareSize);

        return {
          x: cellX * gridConfig.squareSize + gridConfig.squareSize / 2,
          y: cellY * gridConfig.squareSize + gridConfig.squareSize / 2,
        };
      }
    },
    [position, scale, isHexGrid, gridConfig]
  );

  // Wheel-based zoom so that it zooms to the center of the cell under the mouse
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();

      // Grab the container rect to get container-relative mouse coords
      const container = document.getElementById('tabletop-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      // Calculate zoom factor
      const delta = -Math.sign(e.deltaY);
      const factor = 1 + delta * ZOOM_FACTOR;
      const newScale = Math.min(Math.max(scale * factor, MIN_SCALE), MAX_SCALE);

      // Find the "target cell" in world coords
      const targetCell = getTargetCell(localX, localY);

      // Where was that cell on-screen before we zoom?
      const beforeX = targetCell.x * scale + position.x;
      const beforeY = targetCell.y * scale + position.y;

      // Where will it be on-screen after we zoom?
      const afterX = targetCell.x * newScale;
      const afterY = targetCell.y * newScale;

      // Update scale & offset so the cell remains under the mouse
      setScale(newScale);
      setPosition({
        x: beforeX - afterX,
        y: beforeY - afterY,
      });
    },
    [position, scale, getTargetCell]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button === 2) {
        // Right-click => start panning
        startPanning(e);
      } else if (e.button === 0) {
        // Left-click => could be token drag or marquee
        const tokenEl = e.target.closest('.token');
        if (tokenEl) {
          const tokenId = tokenEl.id;
          if (!e.shiftKey) clearSelection();
          selectTokenId(tokenId, e.shiftKey);

          const tokenObj = tokens.find((t) => t.id === tokenId);
          if (tokenObj) {
            startDrag(tokenObj, e);
          }
        } else {
          if (!e.shiftKey) clearSelection();
          startMarquee(e);
        }
      }
    },
    [startPanning, clearSelection, selectTokenId, tokens, startDrag, startMarquee]
  );

  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      if (!isPanning) {
        const tokenEl = e.target.closest('.token');
        showMenu(e, { type: tokenEl ? 'token' : 'grid' });
      }
    },
    [isPanning, showMenu]
  );

  // Initial load
  useEffect(() => {
    const loaded = loadState();
    if (!loaded) {
      // If no saved state, create a default token in the center
      const idStr = `token-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
      setTokens([
        {
          id: idStr,
          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          stats: { hp: 100, maxHp: 100, name: 'New Token' },
        },
      ]);
    } else {
      // Restore tokens + grid settings
      setTokens(loaded.tokens);
      setPosition({ x: loaded.grid.x, y: loaded.grid.y });
      setScale(loaded.grid.scale);
      setIsHexGrid(loaded.grid.isHexGrid);
    }
  }, [loadState]);

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
        style={containerStyle}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <div
          id="tabletop"
          className={isHexGrid ? 'hex-grid' : 'square-grid'}
          style={tabletopStyle}
        >
          <Grid
            isHexGrid={isHexGrid}
            squareSize={gridConfig.squareSize}
            hexSize={gridConfig.hexSize}
            hexWidth={gridConfig.hexWidth}
            hexHeight={gridConfig.hexHeight}
            {...dimensions}
          />

          {tokens.map((token) => (
            <Token
              key={token.id}
              {...token}
              isSelected={selectedTokenIds.has(token.id)}
              onClick={(e) => e.stopPropagation()}
            />
          ))}
        </div>
      </div>

      <Sidebar />
      <ChatBox />
    </>
  );
}
