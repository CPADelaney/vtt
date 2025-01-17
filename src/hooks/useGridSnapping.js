// js/hooks/useGridSnapping.js
import { useCallback } from 'react';

/**
 * useGridSnapping provides a function to snap x,y based on square or hex grids.
 * 
 * @param {boolean} isHexGrid - Determines which snap function to use.
 * @param {number} gridSize - The size of square cells.
 * @param {number} hexWidth - The width of a hex cell.
 * @param {number} hexHeight - The height of a hex cell.
 */
export function useGridSnapping({ isHexGrid, gridSize, hexWidth, hexHeight }) {
  const snapToSquareGrid = useCallback((x, y) => {
    const offsetX = gridSize / 2;
    const offsetY = gridSize / 2;
    
    const snappedX = Math.round((x - offsetX) / gridSize) * gridSize + offsetX;
    const snappedY = Math.round((y - offsetY) / gridSize) * gridSize + offsetY;
    return { x: snappedX, y: snappedY };
  }, [gridSize]);

  const snapToHexGrid = useCallback((x, y) => {
    const verticalSpacing = hexHeight * 0.75;
    const row = Math.round(y / verticalSpacing);
    const isOffsetRow = (row % 2) === 1;
    const offsetX = isOffsetRow ? hexWidth / 2 : 0;
    const col = Math.round((x - offsetX) / hexWidth);

    return {
      x: col * hexWidth + offsetX,
      y: (row * verticalSpacing) - (hexHeight * 0.255)
    };
  }, [hexWidth, hexHeight]);

  const getSnappedPosition = useCallback((x, y) => {
    return isHexGrid
      ? snapToHexGrid(x, y)
      : snapToSquareGrid(x, y);
  }, [isHexGrid, snapToHexGrid, snapToSquareGrid]);

  return { getSnappedPosition };
}
