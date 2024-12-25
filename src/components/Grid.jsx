import React, { memo } from 'react';

export const Grid = memo(function Grid({ 
  isHexGrid, 
  squareSize, 
  hexSize, 
  hexWidth,
  hexHeight,
  rows, 
  cols 
}) {
  // The final drawing width/height of our <svg>
  const width = isHexGrid ? cols * hexWidth : cols * squareSize;
  const height = isHexGrid ? rows * (hexHeight * 0.75) : rows * squareSize;

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        {isHexGrid ? (
          <pattern
            id="hexPattern"
            width={hexWidth}
            height={hexHeight * 1.5}
            patternUnits="userSpaceOnUse"
          >
            {/* Even-row hex */}
            <path
              d={createHexPath(hexSize, hexWidth, hexHeight)}
              fill="rgba(255, 255, 255, 0.5)"
              stroke="#ccc"
              strokeWidth="1"
              // Shift down by 0.25 * hexHeight => typically 15 if hexHeight=60
              transform={`translate(0, ${hexHeight * 0.25})`}
            />

            {/* Odd-row hex */}
            <path
              d={createHexPath(hexSize, hexWidth, hexHeight)}
              fill="rgba(255, 255, 255, 0.5)"
              stroke="#ccc"
              strokeWidth="1"
              // Shift right by half a hex, and down 0.75 * hexHeight => typically 45
              transform={`translate(${hexWidth / 2}, ${hexHeight * 0.75})`}
            />
          </pattern>
        ) : (
          // Same square pattern you used before
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
        )}
      </defs>

      {isHexGrid ? (
        // Fill with single pattern
        <rect
          width={width}
          height={height}
          fill="url(#hexPattern)"
        />
      ) : (
        // Square grid fallback
        <rect
          width={width}
          height={height}
          fill="url(#squarePattern)"
        />
      )}
    </svg>
  );
});

// Same hex path function as before
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
