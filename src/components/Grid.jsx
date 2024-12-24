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
    width: Math.min(cols * (isHexGrid ? hexWidth : squareSize), 2000),
    height: Math.min(rows * (isHexGrid ? (hexHeight * 0.75) : squareSize), 2000)
  };

  const containerStyle = {
    width: visibleBounds.width,
    height: visibleBounds.height,
    position: 'relative',
    overflow: 'hidden',
    // Add a border to the container itself
    border: '1px solid #ccc'
  };

  return (
    <div 
      className={`grid-container ${isHexGrid ? 'hex-grid' : 'square-grid'}`}
      style={containerStyle}
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

const SquareCell = memo(function SquareCell({ x, y, size }) {
  return (
    <div
      className="grid-cell"
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        left: x * size,
        top: y * size,
        borderTop: '1px solid #ccc',
        borderLeft: '1px solid #ccc',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        willChange: 'transform' // Performance hint to browser
      }}
    />
  );
});

function SquareGrid({ squareSize, rows, cols, bounds }) {
  const maxCols = Math.min(cols, Math.ceil(bounds.width / squareSize));
  const maxRows = Math.min(rows, Math.ceil(bounds.height / squareSize));
  
  const cells = [];
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      cells.push(
        <SquareCell 
          key={`square-${r}-${c}`}
          x={c}
          y={r}
          size={squareSize}
        />
      );
    }
  }
  return <>{cells}</>;
}

const HexCell = memo(function HexCell({ col, row, size, width, height, xPos, yPos }) {
  return (
    <svg
      className="grid-cell"
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: xPos,
        top: yPos,
        willChange: 'transform'
      }}
    >
      <HexPath size={size} width={width} height={height} />
    </svg>
  );
});

function HexGrid({ hexSize, hexWidth, hexHeight, rows, cols, bounds }) {
  const verticalSpacing = hexHeight * 0.75;
  const maxCols = Math.min(cols, Math.ceil(bounds.width / hexWidth));
  const maxRows = Math.min(rows, Math.ceil(bounds.height / verticalSpacing));

  const cells = [];
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const offset = r % 2 === 0 ? 0 : (hexWidth / 2);
      const xPos = c * hexWidth + offset;
      const yPos = r * verticalSpacing;

      if (xPos < bounds.width && yPos < bounds.height) {
        cells.push(
          <HexCell
            key={`hex-${r}-${c}`}
            col={c}
            row={r}
            size={hexSize}
            width={hexWidth}
            height={hexHeight}
            xPos={xPos}
            yPos={yPos}
          />
        );
      }
    }
  }
  return <>{cells}</>;
}

const HexPath = memo(function HexPath({ size, width, height }) {
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
});
