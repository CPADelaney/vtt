import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';

// Our revised ZoomableContainer (see below)
import { ZoomableContainer } from './ZoomableContainer';

// Components
import { Grid } from './Grid';
import { Token } from './Token';
import { Controls } from './Controls';
import { Sidebar } from './Sidebar';
import { ChatBox } from './ChatBox';

// Constants
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 0.1;
const DEFAULT_SQUARE_SIZE = 50;
const DEFAULT_HEX_SIZE = 30;

export default function VirtualTabletop() {
  // Grid type + tokens
  const [isHexGrid, setIsHexGrid] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });
  const [outerScale, setOuterScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [gameState, setGameState] = useState(/* { tokens, zoom, chat, etc. } */);

  // Debug: watch token changes
  const prevTokensRef = useRef(tokens);
  useEffect(() => {
    if (prevTokensRef.current !== tokens) {
      console.log('[DEBUG] Tokens changed from', prevTokensRef.current, 'to', tokens);
    }
    prevTokensRef.current = tokens;
  }, [tokens]);

  // Debug: watch outerScale changes
  useEffect(() => {
    console.log('[DEBUG] outerScale is now', outerScale);
  }, [outerScale]);

  const saveGameState = useCallback((state) => {
    console.log('[DEBUG] saving entire state...');
    localStorage.setItem('my-game-state', JSON.stringify(state));
  }, []);

    useAutoSave(gameState, saveGameState, 2000); // auto-save every 2s of no further changes

  // Grid configuration
  const gridConfig = useMemo(() => ({
    squareSize: DEFAULT_SQUARE_SIZE,
    hexSize: DEFAULT_HEX_SIZE,
    hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    hexHeight: DEFAULT_HEX_SIZE * 2,
  }), []);

  // Snapping logic
  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
  });

  // Token drag logic
  const { startDrag } = useTokenDrag({
    scale: 1,
    getSnappedPosition,
    onDragMove: (tokenId, newPos) => {
      console.log('[DEBUG] onDragMove triggered for', tokenId, '=>', newPos);
      setTokens(prev => 
        prev.map(t => (t.id === tokenId ? { ...t, position: newPos } : t))
      );
    },
    onDragEnd: _.noop,
  });

  // Token selection
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee } = useTokenSelection();

  // Token handlers
  const handleAddToken = useCallback(e => {
    const x = e.clientX;
    const y = e.clientY;
    const snappedPos = getSnappedPosition(x, y);

    console.log('[DEBUG] Adding token at', snappedPos);
    setTokens(prev => [
      ...prev,
      {
        id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        position: snappedPos,
        stats: { hp: 100, maxHp: 100, name: 'New Token' },
      },
    ]);
  }, [getSnappedPosition]);

  const handleDeleteTokens = useCallback(() => {
    console.log('[DEBUG] Deleting tokens', Array.from(selectedTokenIds));
    setTokens(prev => prev.filter(t => !selectedTokenIds.has(t.id)));
    clearSelection();
  }, [selectedTokenIds, clearSelection]);

  // Context menu
  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens,
  });

  // VTT object for campaign manager
  const vttObject = useMemo(() => ({
    isHexGrid,
    scale: outerScale,
    currentX: position.x,
    currentY: position.y,
    toggleGridType: () => setIsHexGrid(prev => !prev),
  }), [isHexGrid, outerScale, position]);

  // Campaign manager
  const { saveState, loadState } = useCampaignManager(vttObject, 'default-campaign');

  // Grid dimension update
  const updateGridDimensions = useMemo(() => 
    _.debounce(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Example logic: approximate rows/cols
      if (isHexGrid) {
        const effHeight = gridConfig.hexHeight * 0.75;
        setDimensions({
          rows: Math.ceil(vh / effHeight) + 2,
          cols: Math.ceil(vw / gridConfig.hexWidth) + 2,
        });
      } else {
        setDimensions({
          rows: Math.ceil(vh / gridConfig.squareSize) + 2,
          cols: Math.ceil(vw / gridConfig.squareSize) + 2,
        });
      }
    }, 100),
  [isHexGrid, gridConfig]);

  // Listen for resize
  useEffect(() => {
    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    return () => {
      updateGridDimensions.cancel();
      window.removeEventListener('resize', updateGridDimensions);
    };
  }, [updateGridDimensions]);

  // Prevent default wheel scroll on the entire page
  useEffect(() => {
    const preventDefault = e => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

  // Debounced save
  const debouncedSave = useMemo(() => {
    return _.debounce(currentTokens => {
      console.log('[DEBUG] Auto-saving tokens...');
      saveState(currentTokens);
    }, 1000);
  }, [saveState]);

  // Auto-save effect: triggers on token changes
  useEffect(() => {
    if (tokens.length > 0) {
      console.log('[DEBUG] tokens changed => scheduling save');
      debouncedSave(tokens);
    }
    return () => debouncedSave.cancel();
  }, [tokens, debouncedSave]);

  // Load initial state once
  useEffect(() => {
    console.log('[DEBUG] Loading campaign state on mount...');
    const loaded = loadState();
    if (loaded) {
      console.log('[DEBUG] Loaded state:', loaded);
      setTokens(loaded.tokens);
      setIsHexGrid(loaded.grid.isHexGrid);
      setOuterScale(loaded.grid.scale || 1);
      setPosition({
        x: loaded.grid.x || 0,
        y: loaded.grid.y || 0,
      });
    } else {
      console.log('[DEBUG] No saved state found, creating a default token...');
      const newId = `token-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      setTokens([{
        id: newId,
        position: { x: 600, y: 400 },
        stats: { hp: 100, maxHp: 100, name: 'New Token' },
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom in/out logic (buttons)
  const onZoomIn = () => {
    console.log('[DEBUG] onZoomIn called');
    setOuterScale(prev => Math.min(prev * 1.1, MAX_SCALE));
  };
  const onZoomOut = () => {
    console.log('[DEBUG] onZoomOut called');
    setOuterScale(prev => Math.max(prev * 0.9, MIN_SCALE));
  };

  // MouseDown & context menu
  const handleMouseDown = useCallback(e => {
    if (e.button === 0) {
      const tokenEl = e.target.closest('.token');
      if (tokenEl) {
        if (!e.shiftKey) clearSelection();
        selectTokenId(tokenEl.id, e.shiftKey);

        const tokenObj = tokens.find(t => t.id === tokenEl.id);
        if (tokenObj) {
          console.log('[DEBUG] start drag for token', tokenObj.id);
          startDrag(tokenObj, e);
        }
      } else {
        if (!e.shiftKey) clearSelection();
        startMarquee(e);
      }
    }
  }, [clearSelection, selectTokenId, tokens, startDrag, startMarquee]);

  const handleContextMenu = useCallback(e => {
    e.preventDefault();
    const tokenEl = e.target.closest('.token');
    console.log('[DEBUG] context menu on', tokenEl ? 'token' : 'grid');
    showMenu(e, { type: tokenEl ? 'token' : 'grid' });
  }, [showMenu]);

  // Toggle grid
  const onToggleGrid = () => {
    setIsHexGrid(prev => !prev);
  };

  // Debug log each render
  console.log('----DEBUG RENDER----', {
    isHexGrid,
    rows: dimensions.rows,
    cols: dimensions.cols,
    outerScale,
    position,
  });

  return (
    <>
      <Controls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />

    <ZoomableContainer
      containerId="tabletop-container"
      scale={outerScale}
      position={position}
      setScale={setOuterScale}
      setPosition={setPosition}
      minScale={MIN_SCALE}
      maxScale={MAX_SCALE}
      zoomFactor={ZOOM_FACTOR}
      onZoomEnd={() => saveState(tokens)}
      onPanEnd={() => saveState(tokens)}
    >
        <div
          id="tabletop"
          className={isHexGrid ? 'hex-grid' : 'square-grid'}
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
          style={{ width: '100%', height: '100%', position: 'relative' }}
        >
          <Grid
            isHexGrid={isHexGrid}
            rows={dimensions.rows}
            cols={dimensions.cols}
            squareSize={gridConfig.squareSize}
            hexSize={gridConfig.hexSize}
            hexWidth={gridConfig.hexWidth}
            hexHeight={gridConfig.hexHeight}
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
      </ZoomableContainer>

      <Sidebar
        isHexGrid={isHexGrid}
        onToggleGrid={onToggleGrid}
      />

      <ChatBox />
    </>
  );
}
