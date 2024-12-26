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

  // 8) PING LOGIC (New)
  // --------------------------------------------------
  const [pings, setPings] = useState([]);
  const pingTimeoutRef = useRef(null);
  const isPingingRef = useRef(false);

  // Example: Each user can eventually pick a color. Hard-code for now:
  const playerColor = '#ff0066'; 

  const createPing = useCallback((x, y) => {
    const newPing = {
      id: Date.now(),
      x,
      y,
      color: playerColor,
    };

    setPings(prev => [...prev, newPing]);

    // Remove the ping after 2 seconds
    setTimeout(() => {
      setPings(prev => prev.filter((p) => p.id !== newPing.id));
    }, 2000);
  }, [playerColor]);

  const handleMouseUp = useCallback(() => {
    // If the user releases before the threshold, clear the ping timer
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
    }
    isPingingRef.current = false;
  }, []);


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
        e.stopPropagation();
        
        // Handle selection
        selectTokenId(tokenEl.id, isAdditive);
  
        // Only start drag if we're not doing additive selection
        if (!isAdditive) {
          const clickedToken = tokens.find(t => t.id === tokenEl.id);
          if (clickedToken) {
            // Get all selected tokens
            const selectedTokens = tokens.filter(t => selectedTokenIds.has(t.id));
            
            console.log('[DEBUG] Starting drag with tokens:', {
              clicked: clickedToken.id,
              selected: selectedTokens.map(t => t.id)
            });
            
            startDrag(clickedToken, e, selectedTokens);
          }
        }
      } else {
        if (!isAdditive) clearSelection();
        startMarquee(e);

              // PING: Start a timer to see if the user holds click
        isPingingRef.current = true;
        const container = document.getElementById('tabletop-container');
        const containerRect = container.getBoundingClientRect();
        const screenX = e.clientX - containerRect.left;
        const screenY = e.clientY - containerRect.top;
        const gridX = (screenX - position.x) / scale;
        const gridY = (screenY - position.y) / scale;

        pingTimeoutRef.current = setTimeout(() => {
          if (isPingingRef.current) {
            createPing(gridX, gridY);
          }
        }, 500); // 500ms threshold to trigger a ping
      }
    }
  }, [
    clearSelection, 
    selectTokenId, 
    tokens, 
    selectedTokenIds, 
    startDrag, 
    startMarquee,
    position, 
    scale, 
    createPing
  ]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const tokenEl = e.target.closest('.token');
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
          onMouseDown={handleMouseDown}
        >
          <div
            id="tabletop"
            className={isHexGrid ? 'hex-grid' : 'square-grid'}
            onContextMenu={handleContextMenu}
            onMouseUp={handleMouseUp}  // Add this
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
            {pings.map(ping => (
              <Ping
                key={ping.id}
                x={ping.x}
                y={ping.y}
                color={ping.color}
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
