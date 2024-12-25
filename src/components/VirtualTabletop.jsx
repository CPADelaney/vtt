// VirtualTabletop.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // We no longer store `position` or `scale` here, because ZoomableContainer handles that.

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
    scale: 1, // or wire up the "scale" from ZoomableContainer if needed
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
  const handleAddToken = useCallback((e) => {
    // For a truly accurate add, you'd need to get the "world coords" 
    // from ZoomableContainer's position and scale. But let's just approximate:
    const x = e.clientX; 
    const y = e.clientY;
    const snappedPos = getSnappedPosition(x, y);

    setTokens((prev) => [
      ...prev,
      {
        id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        position: snappedPos,
        stats: { hp: 100, maxHp: 100, name: 'New Token' },
      },
    ]);
  }, [getSnappedPosition]);

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
      // if needed, scale / currentX / currentY from ZoomableContainer can be merged here
      toggleGridType: () => setIsHexGrid((h) => !h),
    }),
    [isHexGrid]
  );

  // Campaign manager
  const { saveState, loadState } = useCampaignManager(vttObject, 'default-campaign');

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

  // Prevent default wheel scroll on the entire page
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

  // Initial load
  useEffect(() => {
    const loaded = loadState();
    if (!loaded) {
      const idStr = `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setTokens([
        {
          id: idStr,
          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          stats: { hp: 100, maxHp: 100, name: 'New Token' },
        },
      ]);
    } else {
      setTokens(loaded.tokens);
      // If your saved grid includes position/scale, you'd pass those to ZoomableContainer as well.
      setIsHexGrid(loaded.grid.isHexGrid);
    }
  }, [loadState]);

  // Mouse down / context menu handlers
const handleMouseDown = useCallback((e) => {
  if (e.button === 0) {
    const tokenEl = e.target.closest('.token');
    if (tokenEl) {
      if (!e.shiftKey) clearSelection();
      selectTokenId(tokenEl.id, e.shiftKey);

      const tokenObj = tokens.find((t) => t.id === tokenEl.id);
      if (tokenObj) {
        startDrag(tokenObj, e);
      }
    } else {
      if (!e.shiftKey) clearSelection();
      startMarquee(e);
    }
  }
}, [clearSelection, selectTokenId, tokens, startDrag, startMarquee]);

const handleContextMenu = useCallback((e) => {
  e.preventDefault();
  const tokenEl = e.target.closest('.token');
  showMenu(e, { type: tokenEl ? 'token' : 'grid' });
}, [showMenu]);

console.log('----DEBUG HEX----', {
  rows: dimensions.rows,
  cols: dimensions.cols,
  squareSize: gridConfig.squareSize,
  hexSize: gridConfig.hexSize,
  hexWidth: gridConfig.hexWidth,
  hexHeight: gridConfig.hexHeight,
  effectiveHeight: gridConfig.hexHeight * 0.75
});

return (
  <>
      <Controls
        isHexGrid={isHexGrid}
        scale={outerScale}  // pass to Controls
        // handle zoom in/out if you want to call ZoomableContainer from here
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onToggleGrid={() => setIsHexGrid(!isHexGrid)}
      />

      <ZoomableContainer
        containerId="tabletop-container"
        onScaleChange={setOuterScale} // <-- whenever ZoomableContainer scale changes
        initialPosition={{ x: 0, y: 0 }}
        initialScale={1}
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


    // snippet example
    <Controls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
    
    <Sidebar 
      isHexGrid={isHexGrid}
      onToggleGrid={onToggleGrid}
    />

    <ChatBox />
  </>
);
}
