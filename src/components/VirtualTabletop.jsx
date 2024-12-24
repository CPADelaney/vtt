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
  const gridConfig = useMemo(() => ({
    squareSize: DEFAULT_SQUARE_SIZE,
    hexSize: DEFAULT_HEX_SIZE,
    hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    hexHeight: DEFAULT_HEX_SIZE * 2
  }), []);

  // Memoized styles
  const tabletopStyle = useMemo(() => ({
    position: 'relative',
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    width: '100%',
    height: '100%'
  }), [position.x, position.y, scale]);

  const containerStyle = useMemo(() => ({
    width: '100vw',
    height: '100vh',
    overflow: 'hidden'
  }), []);

  // Snapping logic
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight
  });

  // Panning logic with scale
  const { isPanning, startPanning } = usePanning({
    currentX: position.x,
    currentY: position.y,
    updatePosition: (x, y) => setPosition({ x, y }),
    scale
  });

  // Remove the old wheel preventDefault effect
  
  // New wheel event handler effect
  useEffect(() => {
    const container = document.getElementById('tabletop-container');
    if (!container) return;
    
    const wheelHandler = (e) => handleWheel(e);
    container.addEventListener('wheel', wheelHandler, { passive: false });
    
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [handleWheel]);

  // Token dragging logic
  const { startDrag } = useTokenDrag({
    scale,
    getSnappedPosition,
    onDragMove: (tokenId, newPos) => {
      setTokens(prev =>
        prev.map(t => (t.id === tokenId ? { ...t, position: newPos } : t))
      );
    },
    onDragEnd: _.noop
  });

  // Token selection
  const {
    selectedTokenIds,
    selectTokenId,
    clearSelection,
    startMarquee
  } = useTokenSelection();

  // Token handlers
  const handleAddToken = useCallback(e => {
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
  }, [position, scale, getSnappedPosition]);

  const handleDeleteTokens = useCallback(() => {
    setTokens(prev => prev.filter(t => !selectedTokenIds.has(t.id)));
    clearSelection();
  }, [selectedTokenIds, clearSelection]);

  // Context menu
  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens
  });

  // VTT state object
  const vttObject = useMemo(() => ({
    isHexGrid,
    scale,
    currentX: position.x,
    currentY: position.y,
    toggleGridType: () => setIsHexGrid(h => !h)
  }), [isHexGrid, scale, position.x, position.y]);

  // Campaign manager
  const { saveState, loadState } = useCampaignManager(vttObject, 'default-campaign');

  // Grid dimension update
  const updateGridDimensions = useMemo(
    () => _.debounce(() => {
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

  // Button zoom handler
  const handleZoom = useCallback((direction) => {
    const container = document.getElementById('tabletop-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Simulate a wheel event at the center of the container
    const simulatedEvent = {
      preventDefault: () => {},
      clientX: centerX,
      clientY: centerY,
      deltaY: direction === 1.1 ? -100 : 100
    };

    handleWheel(simulatedEvent);
  }, [handleWheel]);

  // Updated wheel handler
  // Updated wheel handler - defined before the effect that uses it
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    // Calculate zoom factor
    const delta = -Math.sign(e.deltaY);
    const factor = 1 + (delta * ZOOM_FACTOR);
    const newScale = Math.min(Math.max(scale * factor, MIN_SCALE), MAX_SCALE);
    
    // Get the mouse position relative to the scene
    const worldX = (e.clientX - position.x) / scale;
    const worldY = (e.clientY - position.y) / scale;
    
    // Update scale and position together
    setScale(newScale);
    setPosition({
      x: e.clientX - (worldX * newScale),
      y: e.clientY - (worldY * newScale)
    });
  }, [position, scale]);

  // Button zoom handler
  const handleZoom = useCallback((direction) => {
    const container = document.getElementById('tabletop-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Simulate a wheel event at the center of the container
    handleWheel({
      preventDefault: () => {},
      clientX: centerX,
      clientY: centerY,
      deltaY: direction === 1.1 ? -100 : 100
    });
  }, [handleWheel]);

  // Wheel event handler effect
  useEffect(() => {
    const container = document.getElementById('tabletop-container');
    if (!container) return;
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    e => {
      if (e.button === 2) {
        startPanning(e);
      } else if (e.button === 0) {
        const tokenEl = e.target.closest('.token');
        if (tokenEl) {
          const tokenId = tokenEl.id;
          if (!e.shiftKey) clearSelection();
          selectTokenId(tokenId, e.shiftKey);

          const tokenObj = tokens.find(t => t.id === tokenId);
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
    e => {
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
      const idStr = `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setTokens([{
        id: idStr,
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        stats: { hp: 100, maxHp: 100, name: 'New Token' }
      }]);
    } else {
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

          {tokens.map(token => (
            <Token
              key={token.id}
              {...token}
              isSelected={selectedTokenIds.has(token.id)}
              onClick={e => e.stopPropagation()}
            />
          ))}
        </div>
      </div>

      <Sidebar />
      <ChatBox />
    </>
  );
}