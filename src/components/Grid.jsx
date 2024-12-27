import React, { memo } from 'react';

/**
 * Renders either:
 *   - A square grid (via <pattern>), OR
 *   - A hex grid, row-by-row (no <pattern>)
 *
 * Props:
 *   isHexGrid, squareSize, hexSize, hexWidth, hexHeight
 *   rows, cols
 */

export const Grid = memo(function Grid({
  isHexGrid,
  squareSize,
  hexSize,
  hexWidth,
  hexHeight,
  rows,
  cols
}) {
  // If we are *not* using hex, do the old square pattern approach
  if (!isHexGrid) {
    const width = cols * squareSize;
    const height = rows * squareSize;

    return (
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <pattern
            id="squarePattern"
            width={squareSize}
            height={squareSize}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={squareSize - 1}
              height={squareSize - 1}
              x="0.5"
              y="0.5"
              fill="rgba(255, 255, 255, 0.5)"
              stroke="#ccc"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect
          width={width}
          height={height}
          fill="url(#squarePattern)"
        />
      </svg>
    );
  }

  // -----------------------
  // Otherwise, we do a ROW-BY-ROW hex approach
  // -----------------------

  // We'll store each hex cell in an array
  const hexCells = [];

  // For each row...
  for (let row = 0; row < rows; row++) {
    // Y-position is row * (0.75 * hexHeight)
    const rowY = row * (hexHeight * 0.75);
    // Odd rows shift by half a hex in X
    const offsetX = (row % 2 === 1) ? (hexWidth / 2) : 0;

    // For each col in that row...
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * hexWidth;
      const y = rowY;

      // Add a <path> for each hex cell
      hexCells.push(
        <path
          key={`r${row}c${col}`}
          d={createHexPath(hexSize, hexWidth, hexHeight)}
          stroke="#ccc"
          strokeWidth="1"
          fill="rgba(255,255,255,0.5)"
          // Shift this hex cell into position
          transform={`translate(${x}, ${y})`}
        />
      );
    }
  }

  // The final <svg> size
  const totalWidth = cols * hexWidth;
  const totalHeight = rows * (hexHeight * 0.75);

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {hexCells}
    </svg>
  );
});

/**
 * Same hex path function you used before.
 * "size" is your hexSize (the "radius"),
 * "width" is hexWidth, "height" is hexHeight.
 */
function createHexPath(size, width, height) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * (Math.PI / 180);
    const x = (width / 2) + (size * Math.cos(angle));
    const y = (height / 2) + (size * Math.sin(angle));
    points.push(`${i === 0 ? 'M' : 'L'} ${x},${y}`);
  }
  points.push('Z');
  return points.join(' ');
}
