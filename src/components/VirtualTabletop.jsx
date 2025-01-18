import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import SplitPane from 'react-split-pane';  
import 'react-split-pane/style.css';       
import _ from 'lodash';

// Hooks
import { useTokenDrag } from '../hooks/useTokenDrag';
import { useTokenSelection } from '../hooks/useTokenSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { useGridSnapping } from '../hooks/useGridSnapping';
import { useCampaignManager } from '../hooks/useCampaignManager';
import { useAutoSave } from '../hooks/useAutoSave';
import { useStateWithHistory } from '../hooks/useStateWithHistory'; // Add this import

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

// Example Ping component
function Ping({ x, y, color }) {
  return (
    <div
      className="ping"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 50,
        height: 50,
        backgroundColor: color,
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        animation: 'pingAnimation 2s ease-out forwards'
      }}
    />
  );
}

export default function VirtualTabletop() {
  // 1) Single Source of Truth - Replace useState with useStateWithHistory
  const [gameState, setGameState, updateGameState, undoGameState, historyInfo] = useStateWithHistory({
    isHexGrid: false,
    tokens: [],
    scale: 1,
    position: { x: 0, y: 0 },
  }, {
    maxHistory: 50,
    onUndo: (prevState) => {
      console.log('[DEBUG] Undid to state:', prevState);
    }
  });
  const { isHexGrid, tokens, scale, position } = gameState;

  const handleUndo = () => {
  if (!historyInfo.canUndo) {
    console.log('[DEBUG] No more states to undo.');
    return;
  }
  undoGameState();
};

  // 2) Load & Save from campaignManager
  const { saveState, loadState } = useCampaignManager('default-campaign');

  // 3) Token selection and deletion
  const { selectedTokenIds, selectTokenId, clearSelection, startMarquee } = useTokenSelection();

  // Update all setGameState calls to use updateGameState
  const handleDeleteTokens = useCallback(() => {
    console.log('[DEBUG] Deleting tokens', Array.from(selectedTokenIds));
    updateGameState(prev => ({
      ...prev,
      tokens: prev.tokens.filter(t => !selectedTokenIds.has(t.id))
    }));
    clearSelection();
  }, [selectedTokenIds, clearSelection, updateGameState]);

  const initialLoadDoneRef = useRef(false);

  // Add keyboard shortcuts for deletion
  useEffect(() => {
    function handleKeyDown(e) {
      // Only handle if no input elements are focused
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      // Check if Delete or Backspace was pressed and there are selected tokens
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTokenIds.size > 0) {
        // Prevent default browser behavior (like browser back on Backspace)
        e.preventDefault();
        console.log('[DEBUG] Delete/Backspace pressed with selected tokens:', Array.from(selectedTokenIds));
        handleDeleteTokens();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTokenIds, handleDeleteTokens]);

  // Load entire state on mount
  useEffect(() => {
    if (initialLoadDoneRef.current) return;
  
    console.log('[DEBUG] Loading campaign state on mount...');
    const loaded = loadState();
    if (loaded) {
      console.log('[DEBUG] Loaded fullState:', loaded);
      updateGameState(loaded);
      initialLoadDoneRef.current = true;
    } else {
      console.log('[DEBUG] No saved state found... using defaults');
      initialLoadDoneRef.current = true;
    }
  }, [loadState, updateGameState, initialLoadDoneRef]);

  // Auto-save entire gameState, debounced 2s
  const persistGameState = useCallback((full) => {
    saveState({
      ...full,
      timestamp: Date.now()
    });
  }, [saveState]);

  useAutoSave(gameState, persistGameState, 2000);

  // Debug watchers
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

  // Grid config
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

  // Dimensions for dynamic grid layout
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

  const { totalWidth, totalHeight } = useMemo(() => {
    if (isHexGrid) {
      return {
        totalWidth: dimensions.cols * gridConfig.hexWidth,
        totalHeight: dimensions.rows * (gridConfig.hexHeight * 0.75),
      };
    } else {
      return {
        totalWidth: dimensions.cols * gridConfig.squareSize,
        totalHeight: dimensions.rows * gridConfig.squareSize,
      };
    }
  }, [dimensions, isHexGrid, gridConfig]);

// Token drag
const { startDrag } = useTokenDrag({
  scale: gameState.scale,
  getSnappedPosition,
  onDragMove: (tokenId, newPos, isFinal = false) => {
    console.log('[DEBUG] onDragMove triggered for', tokenId, '=>', newPos);
    if (!isFinal) {
      // Use direct state updates for intermediate moves
      setGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
          t.id === tokenId ? { ...t, position: newPos } : t
        )
      }));
    } else {
      // Use history-tracked updates for final positions
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
          t.id === tokenId ? { ...t, position: newPos } : t
        )
      }));
    }
  },
  onDragEnd: (tokenId, finalPos) => {
    if (finalPos) {
      updateGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t =>
          t.id === tokenId ? { ...t, position: finalPos } : t
        )
      }));
    }
  }
});



  const handleAddToken = useCallback((e) => {
    const container = document.getElementById('tabletop-container');
    const containerRect = container.getBoundingClientRect();

    const screenX = e.clientX - containerRect.left;
    const screenY = e.clientY - containerRect.top;

    const gridX = (screenX - position.x) / scale;
    const gridY = (screenY - position.y) / scale;

    const snappedPos = getSnappedPosition(gridX, gridY);

    updateGameState(prev => ({
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
  }, [getSnappedPosition, position, scale, updateGameState]);

  const { showMenu } = useContextMenu({
    onAddToken: handleAddToken,
    onDeleteTokens: handleDeleteTokens
  });

  // PING LOGIC
  const [pings, setPings] = useState([]);
  const pingTimeoutRef = useRef(null);
  const isPingingRef = useRef(false);
  const mouseDownRef = useRef(null);

  const playerColor = '#ff0066'; 
  const createPing = useCallback((x, y) => {
    const newPing = { id: Date.now(), x, y, color: playerColor };
    setPings(prev => [...prev, newPing]);
    setTimeout(() => {
      setPings(prev => prev.filter(p => p.id !== newPing.id));
    }, 2000);
  }, [playerColor]);

  // Clean up ping if mouse is released early
  const handleMouseUp = useCallback(() => {
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
    }
    isPingingRef.current = false;
    mouseDownRef.current = null;
  }, []);

  // Zoom and mouse logic
  const onZoomIn = () => {
    console.log('[DEBUG] onZoomIn called');
    updateGameState(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.1, MAX_SCALE)
    }));
  };

  const onZoomOut = () => {
    console.log('[DEBUG] onZoomOut called');
    updateGameState(prev => ({
      ...prev,
      scale: Math.max(prev.scale * 0.9, MIN_SCALE)
    }));
  };

  const handleMouseDown = useCallback((e) => {
    console.log('[DEBUG-TABLETOP] MouseDown event:', {
      button: e.button,
      target: e.target,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      defaultPrevented: e.defaultPrevented,
      className: e.target.className
    });

    if (e.button === 0) {
      const tokenEl = e.target.closest('.token');
      const isAdditive = e.metaKey || e.ctrlKey;

      if (tokenEl) {
        e.stopPropagation();
        const clickedToken = tokens.find(t => t.id === tokenEl.id);
        const wasSelected = selectedTokenIds.has(tokenEl.id);

        if (wasSelected && !isAdditive) {
          const selectedTokens = tokens.filter(t => selectedTokenIds.has(t.id));
          startDrag(clickedToken, e, selectedTokens);
        } else {
          selectTokenId(tokenEl.id, isAdditive);
          if (!isAdditive) {
            startDrag(clickedToken, e, [clickedToken]);
          }
        }
      } else {
        console.log('[DEBUG-EMPTY] Potential marquee or ping');
        e.stopPropagation();
        e.preventDefault();

        if (!isAdditive) {
          clearSelection();
        }

        const container = document.getElementById('tabletop-container');
        const containerRect = container.getBoundingClientRect();
        const screenX = e.clientX - containerRect.left;
        const screenY = e.clientY - containerRect.top;

        const gridX = (screenX - position.x) / scale;
        const gridY = (screenY - position.y) / scale;

        mouseDownRef.current = {
          startScreenX: screenX,
          startScreenY: screenY,
          startGridX: gridX,
          startGridY: gridY,
          hasDragged: false,
        };

        isPingingRef.current = true;
        if (pingTimeoutRef.current) {
          clearTimeout(pingTimeoutRef.current);
        }
        pingTimeoutRef.current = setTimeout(() => {
          if (isPingingRef.current &&
              mouseDownRef.current &&
              !mouseDownRef.current.hasDragged) {
            createPing(
              mouseDownRef.current.startGridX,
              mouseDownRef.current.startGridY
            );
          }
        }, 500);
      }
    }
  }, [
    clearSelection,
    selectTokenId,
    tokens,
    selectedTokenIds,
    startDrag,
    position,
    scale,
    createPing
  ]);

  const handleMouseMove = useCallback((e) => {
    if (!mouseDownRef.current) return;

    const dx = e.clientX - mouseDownRef.current.startScreenX;
    const dy = e.clientY - mouseDownRef.current.startScreenY;
    const distance = Math.sqrt(dx*dx + dy*dy);

    if (!mouseDownRef.current.hasDragged && distance > 5) {
      console.log('[DEBUG] Movement threshold => startMarquee + cancel ping');

      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
        pingTimeoutRef.current = null;
      }
      isPingingRef.current = false;

      startMarquee(e);
      mouseDownRef.current.hasDragged = true; 
    }
  }, [startMarquee]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const tokenEl = e.target.closest('.token');
    showMenu(e, { 
      type: tokenEl ? 'token' : 'grid'
    });
  }, [showMenu]);

  const onToggleGrid = () => {
    updateGameState(prev => ({
      ...prev,
      isHexGrid: !prev.isHexGrid
    }));
  };

  // Prevent default wheel scroll
  useEffect(() => {
    const container = document.getElementById('tabletop-container');
    if (!container) return;
  
    const preventDefault = e => {
      // Only prevent default if the event is within our container
      if (e.target.closest('#tabletop-container')) {
        e.preventDefault();
      }
    };
    
    container.addEventListener('wheel', preventDefault, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', preventDefault, { passive: false });
    };
  }, []);

  // 11) Render
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* 
        SplitPane can do horizontal or vertical splits.
        We'll do a vertical split so we have [left | right].
      */}
      <SplitPane
        split="vertical"
        defaultSize={700}   // The initial width (in px) of the LEFT area
        minSize={400}       // The user can't drag it smaller than 400px
        maxSize={1000}      // The user can't drag it larger than 1000px
        style={{ height: '100%' }}
      >
      {/* LEFT: The actual tabletop area */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Zoom controls, undo, etc. could go here */}
        <Controls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />

        {/* The main container for tokens */}
        <div
          className="tabletop-wrapper"
          style={{ width: '100%', height: '100%' }}
        >
        <ZoomableContainer
          containerId="tabletop-container"
          scale={scale}
          position={position}
          setScale={val => updateGameState(prev => ({ ...prev, scale: val }))}
          setPosition={val => updateGameState(prev => ({ ...prev, position: val }))}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          zoomFactor={ZOOM_FACTOR}
          onContextMenu={handleContextMenu}
          gridWidth={totalWidth}
          gridHeight={totalHeight}
        >
          <div
            id="tabletop"
            className={isHexGrid ? 'hex-grid' : 'square-grid'}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
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
                onClick={(e) => e.stopPropagation()}
              />
            ))}
              {/* Pings */}
              {pings.map(ping => (
                <Ping key={ping.id} x={ping.x} y={ping.y} color={ping.color} />
              ))}
            </div>
          </ZoomableContainer>
        </div>
      </div>

      {/* RIGHT: The Sidebar with grid toggle, etc. */}
      <div style={{ borderLeft: '1px solid #ccc' }}>
        <Sidebar
          isHexGrid={isHexGrid}
          onToggleGrid={onToggleGrid}
        />
      </div>
    </SplitPane>
  </div>
);
}
