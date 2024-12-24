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
  // Calculate visible grid bounds (with buffer)
  const visibleBounds = {
    width: Math.min(cols * (isHexGrid ? hexWidth : squareSize), 2000), // Max 2000px width
    height: Math.min(rows * (isHexGrid ? (hexHeight * 0.75) : squareSize), 2000) // Max 2000px height
  };

  return (
    <div 
      className={`grid-container ${isHexGrid ? 'hex-grid' : 'square-grid'}`}
      style={{
        width: visibleBounds.width,
        height: visibleBounds.height,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {isHexGrid ? (
        <HexGrid 
          hexSize={hexSize} 
          hexWidth={hexWidth}
          hexHeight={hexHeight}
          rows={rows} 
          cols={cols}
          bounds={visibleBounds}
        />
      ) : (
        <SquareGrid 
          squareSize={squareSize} 
          rows={rows} 
          cols={cols}
          bounds={visibleBounds}
        />
      )}
    </div>
  );
});

function SquareGrid({ squareSize, rows, cols, bounds }) {
  const cells = [];
  const maxCols = Math.min(cols, Math.ceil(bounds.width / squareSize));
  const maxRows = Math.min(rows, Math.ceil(bounds.height / squareSize));

  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      cells.push(
        <div
          key={`square-${r}-${c}`}
          className="grid-cell"
          style={{
            position: 'absolute',
            width: `${squareSize}px`,
            height: `${squareSize}px`,
            left: c * squareSize,
            top: r * squareSize,
            border: '1px solid #ccc',
            backgroundColor: 'rgba(255, 255, 255, 0.5)'
          }}
        />
      );
    }
  }
  return <>{cells}</>;
}

function HexGrid({ hexSize, hexWidth, hexHeight, rows, cols, bounds }) {
  const cells = [];
  const verticalSpacing = hexHeight * 0.75;
  const maxCols = Math.min(cols, Math.ceil(bounds.width / hexWidth));
  const maxRows = Math.min(rows, Math.ceil(bounds.height / verticalSpacing));

  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const offset = r % 2 === 0 ? 0 : (hexWidth / 2);
      const xPos = c * hexWidth + offset;
      const yPos = r * verticalSpacing;

      // Only render if within bounds
      if (xPos < bounds.width && yPos < bounds.height) {
        cells.push(
          <svg
            key={`hex-${r}-${c}`}
            className="grid-cell"
            width={hexWidth}
            height={hexHeight}
            style={{
              position: 'absolute',
              left: xPos,
              top: yPos
            }}
          >
            <HexPath 
              size={hexSize} 
              width={hexWidth} 
              height={hexHeight} 
            />
          </svg>
        );
      }
    }
  }
  return <>{cells}</>;
}

function HexPath({ size, width, height }) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * Math.PI / 180;
    const x = (width / 2) + (size * Math.cos(angle));
    const y = (height / 2) + (size * Math.sin(angle));
    points.push(`${i === 0 ? 'M' : 'L'} ${x},${y}`);
  }
  points.push('Z');
  
  return (
    <path 
      d={points.join(' ')} 
      className="hexagon"
      style={{
        fill: 'rgba(255, 255, 255, 0.5)',
        stroke: '#ccc',
        strokeWidth: '1px'
      }}
    />
  );
}
