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
  
  // Add two patterns for even/odd rows of hexes
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
          <>
            {/* Pattern for even rows */}
            <pattern 
              id="hexPatternEven" 
              width={hexWidth}
              height={hexHeight * 1.5} 
              patternUnits="userSpaceOnUse"
            >
              <path 
                d={createHexPath(hexSize, hexWidth, hexHeight)}
                fill="rgba(255, 255, 255, 0.5)"
                stroke="#ccc"
                strokeWidth="1"
                transform={`translate(0,${hexHeight * 0.25})`}
              />
            </pattern>
            {/* Pattern for odd rows, offset horizontally */}
            <pattern 
              id="hexPatternOdd" 
              width={hexWidth}
              height={hexHeight * 1.5}
              patternUnits="userSpaceOnUse"
            >
              <path 
                d={createHexPath(hexSize, hexWidth, hexHeight)}
                fill="rgba(255, 255, 255, 0.5)"
                stroke="#ccc"
                strokeWidth="1"
                transform={`translate(${hexWidth/2},${hexHeight * 0.75})`}
              />
            </pattern>
          </>
        ) : (
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
        // For hex grid, use two rectangles with different patterns
        <>
          <rect
            width={width}
            height={height}
            fill="url(#hexPatternEven)"
          />
          <rect
            width={width}
            height={height}
            fill="url(#hexPatternOdd)"
          />
        </>
      ) : (
        <rect
          width={width}
          height={height}
          fill="url(#squarePattern)"
        />
      )}
    </svg>
  );
});

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
