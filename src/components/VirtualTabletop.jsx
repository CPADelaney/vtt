import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';
import { useAutoSave } from '../hooks/useAutoSave';

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
  // -------------------------------------------------
  // 1) Single Source of Truth: gameState
  // -------------------------------------------------
  const [gameState, setGameState] = useState({
    isHexGrid: false,
    tokens: [],
    scale: 1,
    position: { x: 0, y: 0 },
    // chatLog, HP, etc. can go here as well
  });

  const { isHexGrid, tokens, scale, position } = gameState;

  // -------------------------------------------------
  // 2) Load & Save with campaignManager
  // -------------------------------------------------
  const { saveState, loadState } = useCampaignManager('default-campaign');

  // On mount, load entire state (only once)
  useEffect(() => {
    console.log('[DEBUG] Loading campaign state on mount...');
    const loaded = loadState();
    if (loaded) {
      console.log('[DEBUG] Loaded fullState:', loaded);
      setGameState(loaded);
    } else {
      console.log('[DEBUG] No saved state found. Using defaults...');
    }
  }, [loadState]);

  // Debounced auto-save for entire gameState
  const persistGameState = useCallback((fullState) => {
    saveState({
      ...fullState,
      timestamp: Date.now(), // For logs
    });
  }, [saveState]);

  useAutoSave(gameState, persistGameState, 2000);

  // -------------------------------------------------
  // 3) Debug watchers (optional)
  // -------------------------------------------------
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

  // -------------------------------------------------
  // 4) Grid Config & Dimensions
  // -------------------------------------------------
  const gridConfig = useMemo(() => ({
    squareSize: DEFAULT_SQUARE_SIZE,
    hexSize: DEFAULT_HEX_SIZE,
    hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    hexHeight: DEFAULT_HEX_SIZE * 2,
  }), []);

  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
  });

  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  const updateGridDimensions = useMemo(
    () =>
      _.debounce(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
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

  // -------------------------------------------------
  // 5) Token Drag & Selection
  // -------------------------------------------------
  const { startDrag } = useTokenDrag({
    // Use the actual scale from gameState for correct drag coords
    scale: gameState.scale,
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

  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee } =
    useTokenSelection();

  // -------------------------------------------------
  // 6) Token Handlers
  // -------------------------------------------------
  const handleAddToken = useCallback((e) => {
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
  }, [getSnappedPosition]);

  const handleDeleteTokens = useCallback(() => {
    console.log('[DEBUG] Deleting tokens', Array.from(selectedTokenIds));
    setGameState((prev) => ({
      ...prev,
      tokens: prev.tokens.filter((t) => !selectedTokenIds.has(t.id)),
    }));
    clearSelection();
  }, [selectedTokenIds, clearSelection]);

  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens,
  });

  // -------------------------------------------------
  // 7) Zoom & Mouse Logic
  // -------------------------------------------------
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

  // -------------------------------------------------
  // 8) Misc Setup (Prevent wheel scrolling)
  // -------------------------------------------------
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

  // -------------------------------------------------
  // 9) Render
  // -------------------------------------------------
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

        // Removed the manual onZoomEnd/onPanEnd saves for simplicity 
        // (auto-save is already handling it)

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
