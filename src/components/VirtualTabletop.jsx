import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';

// Custom Zoom
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

  // A ref to store previous tokens array for debug comparison
  const prevTokensRef = useRef(tokens);

  // Debug effect to check if `tokens` is actually changing
  useEffect(() => {
    if (prevTokensRef.current !== tokens) {
      console.log('[DEBUG] Tokens array reference CHANGED');
      console.log('Previous tokens:', prevTokensRef.current);
      console.log('New tokens:', tokens);
    } else {
      console.log('[DEBUG] Tokens array reference did NOT change');
    }
    prevTokensRef.current = tokens;
  }, [tokens]);

  // Memoized grid configuration
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
    scale: 1, // or wire up scale from ZoomableContainer if needed
    getSnappedPosition,
    onDragMove: (tokenId, newPos) => {
      console.log('[DEBUG] onDragMove triggered', { tokenId, newPos });
      setTokens(prev =>
        prev.map(t => (t.id === tokenId ? { ...t, position: newPos } : t))
      );
    },
    onDragEnd: _.noop,
  });

  // Token selection
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee } =
    useTokenSelection();

  // Token handlers
  const handleAddToken = useCallback(e => {
    const x = e.clientX;
    const y = e.clientY;
    const snappedPos = getSnappedPosition(x, y);

    console.log('[DEBUG] Adding token at snapped position:', snappedPos);
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
    console.log('[DEBUG] Deleting tokens with ids:', Array.from(selectedTokenIds));
    setTokens(prev => prev.filter(t => !selectedTokenIds.has(t.id)));
    clearSelection();
  }, [selectedTokenIds, clearSelection]);

  // Context menu
  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens,
  });

  // This object is what the campaign manager uses to read scale/position/etc.
  const vttObject = useMemo(() => ({
    isHexGrid,
    scale: outerScale, // important! must match your current scale state
    currentX: position.x,
    currentY: position.y,
    // If toggling the grid from loaded state triggers a loop,
    // you can remove or conditionally call toggleGridType.
    toggleGridType: () => setIsHexGrid(prev => !prev)
  }), [isHexGrid, outerScale, position]);

  // Campaign manager
  const { saveState, loadState } = useCampaignManager(vttObject, 'default-campaign');

  // Grid dimension update
  const updateGridDimensions = useMemo(() =>
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
  [isHexGrid, gridConfig]);

  // Resize listener
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

  // Create a debounced save function
  const debouncedSave = useMemo(() => {
    return _.debounce((currentTokens) => {
      console.log('[DEBUG] Attempting save...');
      saveState(currentTokens);
    }, 1000);
  }, [saveState]);

  // Auto-save effect: only triggers when tokens change
  useEffect(() => {
    if (tokens.length > 0) {
      console.log('[DEBUG] Tokens changed, scheduling save...');
      debouncedSave(tokens);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [tokens, debouncedSave]);

  // Load initial state (only once on mount)
  useEffect(() => {
    console.log('[DEBUG] Loading state on mount...');
    const loaded = loadState();
    if (!loaded) {
      console.log('[DEBUG] No saved state found, creating initial token...');
      const idStr = `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setTokens([
        {
          id: idStr,
          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          stats: { hp: 100, maxHp: 100, name: 'New Token' },
        },
      ]);
    } else {
      console.log('[DEBUG] Loaded state:', loaded);
      setTokens(loaded.tokens);
      setIsHexGrid(loaded.grid.isHexGrid);
      setOuterScale(loaded.grid.scale || 1);
      setPosition({
        x: loaded.grid.x || 0,
        y: loaded.grid.y || 0
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MouseDown & ContextMenu
  const handleMouseDown = useCallback(
    e => {
      if (e.button === 0) {
        const tokenEl = e.target.closest('.token');
        if (tokenEl) {
          if (!e.shiftKey) clearSelection();
          selectTokenId(tokenEl.id, e.shiftKey);

          const tokenObj = tokens.find(t => t.id === tokenEl.id);
          if (tokenObj) {
            console.log('[DEBUG] Starting drag for token:', tokenObj.id);
            startDrag(tokenObj, e);
          }
        } else {
          if (!e.shiftKey) clearSelection();
          startMarquee(e);
        }
      }
    },
    [clearSelection, selectTokenId, tokens, startDrag, startMarquee]
  );

  const handleContextMenu = useCallback(
    e => {
      e.preventDefault();
      const tokenEl = e.target.closest('.token');
      console.log('[DEBUG] Context menu on:', tokenEl ? 'token' : 'grid');
      showMenu(e, { type: tokenEl ? 'token' : 'grid' });
    },
    [showMenu]
  );

  // Zoom logic
  const onZoomIn = () => {
    setOuterScale(prev => Math.min(prev * 1.1, MAX_SCALE));
  };
  const onZoomOut = () => {
    setOuterScale(prev => Math.max(prev * 0.9, MIN_SCALE));
  };

  // Toggle Grid
  const onToggleGrid = () => {
    setIsHexGrid(prev => !prev);
  };

  // Debug: see dimension + grid info each render
  console.log('----DEBUG HEX----', {
    rows: dimensions.rows,
    cols: dimensions.cols,
    squareSize: gridConfig.squareSize,
    hexSize: gridConfig.hexSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
    effectiveHeight: gridConfig.hexHeight * 0.75,
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
        onScaleChange={setOuterScale}
        onPositionChange={setPosition}
        // Try logging here to confirm it fires:
        onZoomEnd={() => {
          console.log('[DEBUG] Zoom ended, saving...');
          saveState(tokens);
        }}
        onPanEnd={() => {
          console.log('[DEBUG] Pan ended, saving...');
          saveState(tokens);
        }}
        initialPosition={position}
        initialScale={outerScale}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        zoomFactor={ZOOM_FACTOR}
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
