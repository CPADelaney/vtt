import React, { memo } from 'react';

export const Grid = memo(function Grid({ 
  isHexGrid, 
  squareSize, // Changed from gridSize to match parent
  hexSize, 
  hexWidth,
  hexHeight,
  rows, 
  cols 
}) {
  return isHexGrid
    ? <HexGrid 
        hexSize={hexSize} 
        hexWidth={hexWidth}
        hexHeight={hexHeight}
        rows={rows} 
        cols={cols} 
      />
    : <SquareGrid 
        squareSize={squareSize} 
        rows={rows} 
        cols={cols} 
      />;
});

function SquareGrid({ squareSize, rows, cols }) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
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
  return <div className="square-grid">{cells}</div>;
}

function HexGrid({ hexSize, hexWidth, hexHeight, rows, cols }) {
  const verticalSpacing = hexHeight * 0.75;
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 0 ? 0 : (hexWidth / 2);
      cells.push(
        <svg
          key={`hex-${r}-${c}`}
          className="grid-cell"
          width={hexWidth}
          height={hexHeight}
          style={{
            position: 'absolute',
            left: c * hexWidth + offset,
            top: r * verticalSpacing
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
  return <div className="hex-grid">{cells}</div>;
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
