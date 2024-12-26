import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import _ from 'lodash';

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';
import { useAutoSave } from '../hooks/useAutoSave';

// Components
import { ZoomableContainer } from './ZoomableContainer';
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
  // 1) Single Source of Truth
  const [gameState, setGameState] = useState({
    isHexGrid: false,
    tokens: [],
    scale: 1,
    position: { x: 0, y: 0 },
    // chatLog, hp, etc. if desired
  });

  const { isHexGrid, tokens, scale, position } = gameState;

  // 2) Load & Save from campaignManager
  const { saveState, loadState } = useCampaignManager('default-campaign');

  // Load entire state on mount
  useEffect(() => {
    console.log('[DEBUG] Loading campaign state on mount...');
    const loaded = loadState();
    if (loaded) {
      console.log('[DEBUG] Loaded fullState:', loaded);
      setGameState(loaded); // top-level scale, position, tokens, etc.
    } else {
      console.log('[DEBUG] No saved state found... using defaults');
    }
  }, [loadState]);

  // Auto-save entire gameState, debounced 2s
  const persistGameState = useCallback((full) => {
    saveState({
      ...full,
      timestamp: Date.now()
    });
  }, [saveState]);

  useAutoSave(gameState, persistGameState, 2000);

  // 3) Debug watchers
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

  // 4) Grid config
  const gridConfig = useMemo(() => ({
    squareSize: DEFAULT_SQUARE_SIZE,
    hexSize: DEFAULT_HEX_SIZE,
    hexWidth: Math.sqrt(3) * DEFAULT_HEX_SIZE,
    hexHeight: DEFAULT_HEX_SIZE * 2
  }), []);

  const { getSnappedPosition } = useGridSnapping({
    isHexGrid,
    gridSize: gridConfig.squareSize,
    hexWidth: gridConfig.hexWidth,
    hexHeight: gridConfig.hexHeight,
  });

  // 5) Dimensions for dynamic grid layout
  const [dimensions, setDimensions] = useState({ rows: 0, cols: 0 });

  const updateGridDimensions = useMemo(() => _.debounce(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (isHexGrid) {
      const effHeight = gridConfig.hexHeight * 0.75;
      setDimensions({
        rows: Math.ceil(vh / effHeight) + 2,
        cols: Math.ceil(vw / gridConfig.hexWidth) + 2
      });
    } else {
      setDimensions({
        rows: Math.ceil(vh / gridConfig.squareSize) + 2,
        cols: Math.ceil(vw / gridConfig.squareSize) + 2
      });
    }
  }, 100), [isHexGrid, gridConfig]);

  useEffect(() => {
    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    return () => {
      updateGridDimensions.cancel();
      window.removeEventListener('resize', updateGridDimensions);
    };
  }, [updateGridDimensions]);

  // 6) Token drag
  const { startDrag } = useTokenDrag({
    scale: gameState.scale,  // use actual scale for correct drag coords
    getSnappedPosition,
    onDragMove: (tokenId, newPos) => {
      console.log('[DEBUG] onDragMove triggered for', tokenId, '=>', newPos);
      setGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
          t.id === tokenId ? { ...t, position: newPos } : t
        )
      }));
    },
    onDragEnd: _.noop
  });

  // 7) Token selection
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee } =
    useTokenSelection();

  const handleAddToken = useCallback((e) => {
    // Get the container element
    const container = document.getElementById('tabletop-container');
    const containerRect = container.getBoundingClientRect();
    
    // Convert screen coordinates to grid coordinates
    const screenX = e.clientX - containerRect.left;
    const screenY = e.clientY - containerRect.top;
    
    // Transform screen coordinates to grid coordinates
    const gridX = (screenX - position.x) / scale;
    const gridY = (screenY - position.y) / scale;
    
    // Now snap the grid coordinates
    const snappedPos = getSnappedPosition(gridX, gridY);
    
    console.log('[DEBUG] Adding token at', {
      screen: { x: e.clientX, y: e.clientY },
      container: { x: containerRect.left, y: containerRect.top },
      transformed: { x: gridX, y: gridY },
      snapped: snappedPos
    });
  
    setGameState(prev => ({
      ...prev,
      tokens: [
        ...prev.tokens,
        {
          id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          position: snappedPos,
          stats: { hp: 100, maxHp: 100, name: 'New Token' },
        }
      ]
    }));
  }, [getSnappedPosition, position, scale]);

  const handleDeleteTokens = useCallback(() => {
    console.log('[DEBUG] Deleting tokens', Array.from(selectedTokenIds));
    setGameState(prev => ({
      ...prev,
      tokens: prev.tokens.filter(t => !selectedTokenIds.has(t.id))
    }));
    clearSelection();
  }, [selectedTokenIds, clearSelection]);

  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens
  });

  // 9) Zoom and mouse logic
  const onZoomIn = () => {
    console.log('[DEBUG] onZoomIn called');
    setGameState(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.1, MAX_SCALE)
    }));
  };

  const onZoomOut = () => {
    console.log('[DEBUG] onZoomOut called');
    setGameState(prev => ({
      ...prev,
      scale: Math.max(prev.scale * 0.9, MIN_SCALE)
    }));
  };
  
  const handleMouseDown = useCallback((e) => {
    console.log('[DEBUG] MouseDown event:', {
      button: e.button,
      target: e.target,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey
    });
  
    if (e.button === 0) { // Left click
      const tokenEl = e.target.closest('.token');
      const isAdditive = e.metaKey || e.ctrlKey;
  
      if (tokenEl) {
        if (!isAdditive) clearSelection();
        selectTokenId(tokenEl.id, isAdditive);
  
        // Only start drag if we're not doing additive selection
        if (!isAdditive) {
          const tokenObj = tokens.find(t => t.id === tokenEl.id);
          if (tokenObj) {
            console.log('[DEBUG] start drag for token', tokenObj.id);
            startDrag(tokenObj, e);
          }
        }
      } else {
        if (!isAdditive) clearSelection();
        startMarquee(e);
      }
    }
  }, [clearSelection, selectTokenId, tokens, startDrag, startMarquee]);
    
      const handleContextMenu = useCallback((e) => {
        // Always prevent default first
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[DEBUG-CHAIN] 5. VirtualTabletop contextmenu received');
    
    const tokenEl = e.target.closest('.token');
    console.log('[DEBUG-CHAIN] 6. Target type:', tokenEl ? 'token' : 'grid');
    
    showMenu(e, { 
      type: tokenEl ? 'token' : 'grid'
    });
  }, [showMenu]);

  const onToggleGrid = () => {
    setGameState(prev => ({
      ...prev,
      isHexGrid: !prev.isHexGrid
    }));
  };

  // 10) Prevent default wheel scroll
  useEffect(() => {
    const preventDefault = e => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

  // 11) Render
return (
  <>
    <Controls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
    <div className="tabletop-wrapper" style={{ width: '100%', height: '100%' }}>
      <ZoomableContainer
        containerId="tabletop-container"
        scale={scale}
        position={position}
        setScale={(val) =>
          setGameState(prev => ({
            ...prev,
            scale: val
          }))
        }
        setPosition={(val) =>
          setGameState(prev => ({
            ...prev,
            position: val
          }))
        }
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        zoomFactor={ZOOM_FACTOR}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}  // Pass the handler here
      >
        <div
          id="tabletop"
          className={isHexGrid ? 'hex-grid' : 'square-grid'}
          onContextMenu={handleContextMenu}
          style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative',
            userSelect: 'none'
          }}
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
            onClick={e => {
              e.stopPropagation();
              // Use metaKey (Cmd on Mac) or ctrlKey (Ctrl on Windows/Linux)
              const isAdditive = e.metaKey || e.ctrlKey;
              if (!isAdditive) clearSelection();
              selectTokenId(token.id, isAdditive);
            }}
          />
          ))}
        </div>
      </ZoomableContainer>
      <Sidebar isHexGrid={isHexGrid} onToggleGrid={onToggleGrid} />
      <ChatBox />
    </div>
  </>
);
}
