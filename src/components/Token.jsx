// js/components/Token.jsx
import React, { memo } from 'react';

/**
 * Renders a single token at a given position.
 * 
 * Props:
 *  - id: unique identifier
 *  - position: { x: number, y: number }
 *  - stats: object (e.g. { hp: 100, maxHp: 100, name: '...' })
 *  - isSelected: boolean
 *  - onClick: callback for handling clicks
 */
export const Token = memo(function Token({
  id,
  position,
  stats,
  isSelected,
  onClick
}) {
  return (
    <div
      id={id}
      className={`token ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        // translates so that (x,y) is the center of the token
        transform: 'translate(-50%, -50%)'
      }}
      data-stats={JSON.stringify(stats)}
      onClick={onClick}
    />
  );
});
