import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';
import { useAutoSave } from '../hooks/useAutoSave'; // <--- new hook

// Custom
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
  // 1) Consolidated gameState
  //    (You can store chat, HP, etc. all in here as well.)
  const [gameState, setGameState] = useState({
    isHexGrid: false,
    tokens: [],
    scale: 1,
    position: { x: 0, y: 0 },
    // chatLog: [],
    // any other fields...
  });

  // Shortcuts for easier usage
  const { isHexGrid, tokens, scale, position } = gameState;

  // Debug watchers (optional)
  const prevTokensRef = useRef(tokens);
  useEffect(() => {
    if (prevTokensRef.current !== tokens) {
      console.log('[DEBUG] Tokens changed from', prevTokensRef.current, 'to', tokens);
    }
    prevTokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    console.log('[DEBUG] outerScale is now', scale);
  }, [scale]);

  // 2) Save & load with campaignManager
  const { saveState, loadState } = useCampaignManager(
    {
      isHexGrid: gameState.isHexGrid,
      scale: gameState.scale,
      currentX: gameState.position.x,
      currentY: gameState.position.y,
      toggleGridType: () => {
        setGameState((prev) => ({
          ...prev,
          isHexGrid: !prev.isHexGrid,
        }));
      },
    },
    'default-campaign'
  );

  // 3) One function to actually "persist" the entire gameState
  const persistGameState = useCallback(
    (fullState) => {
      // If your old code uses "tokens" only, adapt to store everything.
      // You might keep calling saveState(...) for tokens, 
      // but eventually move to storing scale, position, chat, etc.
      // For now, we do something like:
      const { tokens, isHexGrid, scale, position } = fullState;
      // Save tokens + grid data
      saveState(tokens); // or update your campaign manager to accept more data
      // OR ideally update your campaign manager to accept the entire fullState
      // and store everything in localStorage
      // e.g. saveFullState(fullState);
    },
    [saveState]
  );

  // 4) Auto-save effect (for entire gameState) with a 2s debounce
  useAutoSave(gameState, persistGameState, 2000);

  // Grid config
  const gridConfig = useMemo(
    () => ({
      squareSize: DEFAULT_SQUARE_SIZE,
      hexSize: DEFAULT_HEX_SIZE,
      hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
      hexHeight: DEFAULT_HEX_SIZE * 2,
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

  // Token drag logic
  const { startDrag } = useTokenDrag({
    scale: 1, // or scale: gameState.scale if you want
    getSnappedPosition,
    onDragMove: (tokenId, newPos) => {
      console.log('[DEBUG] onDragMove triggered for', tokenId, '=>', newPos);
      setGameState((prev) => ({
        ...prev,
        tokens: prev.tokens.map((t) =>
          t.id === tokenId ? { ...t, position: newPos } : t
        ),
      }));
    },
    onDragEnd: _.noop,
  });

  // Token selection
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee } =
    useTokenSelection();

  // 5) Example token handlers that update gameState tokens
  const handleAddToken = useCallback(
    (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const snappedPos = getSnappedPosition(x, y);
      console.log('[DEBUG] Adding token at', snappedPos);

      setGameState((prev) => ({
        ...prev,
        tokens: [
          ...prev.tokens,
          {
            id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            position: snappedPos,
            stats: { hp: 100, maxHp: 100, name: 'New Token' },
          },
        ],
      }));
    },
    [getSnappedPosition]
  );

  const handleDeleteTokens = useCallback(() => {
    console.log('[DEBUG] Deleting tokens', Array.from(selectedTokenIds));
    setGameState((prev) => ({
      ...prev,
      tokens: prev.tokens.filter((t) => !selectedTokenIds.has(t.id)),
    }));
    clearSelection();
  }, [selectedTokenIds, clearSelection]);

  // Context menu
  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens,
  });

  // 6) Load initial state
  useEffect(() => {
    console.log('[DEBUG] Loading campaign state on mount...');
    const loaded = loadState();
    if (loaded) {
      console.log('[DEBUG] Loaded state:', loaded);
      setGameState((prev) => ({
        ...prev,
        isHexGrid: loaded.grid.isHexGrid,
        tokens: loaded.tokens,
        scale: loaded.grid.scale || 1,
        position: {
          x: loaded.grid.x || 0,
          y: loaded.grid.y || 0,
        },
      }));
    } else {
      console.log('[DEBUG] No saved state found, creating a default token...');
      const newId = `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setGameState((prev) => ({
        ...prev,
        tokens: [
          {
            id: newId,
            position: { x: 600, y: 400 },
            stats: { hp: 100, maxHp: 100, name: 'New Token' },
          },
        ],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom in/out
  const onZoomIn = () => {
    console.log('[DEBUG] onZoomIn called');
    setGameState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.1, MAX_SCALE),
    }));
  };

  const onZoomOut = () => {
    console.log('[DEBUG] onZoomOut called');
    setGameState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale * 0.9, MIN_SCALE),
    }));
  };

  // MouseDown & context menu
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button === 0) {
        const tokenEl = e.target.closest('.token');
        if (tokenEl) {
          if (!e.shiftKey) clearSelection();
          selectTokenId(tokenEl.id, e.shiftKey);

          const tokenObj = tokens.find((t) => t.id === tokenEl.id);
          if (tokenObj) {
            console.log('[DEBUG] start drag for token', tokenObj.id);
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
    (e) => {
      e.preventDefault();
      const tokenEl = e.target.closest('.token');
      console.log('[DEBUG] context menu on', tokenEl ? 'token' : 'grid');
      showMenu(e, { type: tokenEl ? 'token' : 'grid' });
    },
    [showMenu]
  );

  // Toggle grid
  const onToggleGrid = () => {
    setGameState((prev) => ({
      ...prev,
      isHexGrid: !prev.isHexGrid,
    }));
  };

  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  

const updateGridDimensions = useMemo(
  () =>
    _.debounce(() => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Possibly different logic for hex vs square:
      if (isHexGrid) {
        // e.g.: 
        const effHeight = gridConfig.hexHeight * 0.75;
        setDimensions({
          rows: Math.ceil(viewportHeight / effHeight) + 2,
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

useEffect(() => {
  updateGridDimensions();
  window.addEventListener('resize', updateGridDimensions);
  return () => {
    updateGridDimensions.cancel();
    window.removeEventListener('resize', updateGridDimensions);
  };
}, [updateGridDimensions]);

  // Prevent default wheel scroll
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

  return (
    <>
      <Controls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />

      <ZoomableContainer
        containerId="tabletop-container"
        scale={scale}
        position={position}
        setScale={(val) =>
          setGameState((prev) => ({
            ...prev,
            scale: val,
          }))
        }
        setPosition={(val) =>
          setGameState((prev) => ({
            ...prev,
            position: val,
          }))
        }
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        zoomFactor={ZOOM_FACTOR}
        
        // If you REALLY want manual saves on zoom/pan end, keep these:
        // But if you're auto-saving everything in gameState, these might be redundant:
        onZoomEnd={() => {
          console.log('[DEBUG] Zoom ended => manual save if you want');
          // saveState(tokens); // <-- might comment this out to avoid duplicates
        }}
        onPanEnd={() => {
          console.log('[DEBUG] Pan ended => manual save if you want');
          // saveState(tokens); // <-- might comment this out to avoid duplicates
        }}
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

          {tokens.map((token) => (
            <Token
              key={token.id}
              {...token}
              isSelected={selectedTokenIds.has(token.id)}
              onClick={(e) => e.stopPropagation()}
            />
          ))}
        </div>
      </ZoomableContainer>

      <Sidebar isHexGrid={isHexGrid} onToggleGrid={onToggleGrid} />
      <ChatBox />
    </>
  );
}
