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
        pointerEvents: 'none'
      }}
    >
      <defs>
        {isHexGrid ? (
          <pattern 
            id="hexPattern" 
            width={hexWidth} 
            height={hexHeight * 0.75} 
            patternUnits="userSpaceOnUse"
          >
            <path 
              d={createHexPath(hexSize, hexWidth, hexHeight)}
              fill="rgba(255, 255, 255, 0.5)"
              stroke="#ccc"
              strokeWidth="1"
            />
          </pattern>
        ) : (
          <pattern 
            id="squarePattern" 
            width={squareSize} 
            height={squareSize} 
            patternUnits="userSpaceOnUse"
          >
            <rect 
              width={squareSize - 1} // Subtract 1 to prevent double borders
              height={squareSize - 1}
              x="0.5" // Offset by half pixel to align borders
              y="0.5"
              fill="rgba(255, 255, 255, 0.5)"
              stroke="#ccc"
              strokeWidth="1"
            />
          </pattern>
        )}
      </defs>

      <rect
        width={width}
        height={height}
        fill={`url(#${isHexGrid ? 'hexPattern' : 'squarePattern'})`}
      />
    </svg>
  );
});

// Helper to create hex path
function createHexPath(size, width, height) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * Math.PI / 180;
    const x = (width / 2) + (size * Math.cos(angle));
    const y = (height / 2) + (size * Math.sin(angle));
    points.push(`${i === 0 ? 'M' : 'L'} ${x},${y}`);
  }
  points.push('Z');
  return points.join(' ');
}
