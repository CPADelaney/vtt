// js/components/Controls.jsx
import React from 'react';

/**
 * A simple control panel for toggling grid type and zoom.
 *
 * Props:
 *   - isHexGrid: boolean
 *   - scale: number
 *   - onToggleGrid: function
 *   - onZoomIn: function
 *   - onZoomOut: function
 */
export function Controls({
  isHexGrid,
  scale,
  onToggleGrid,
  onZoomIn,
  onZoomOut
}) {
  return (
    <div className="controls">
      <button onClick={onToggleGrid}>
        Toggle {isHexGrid ? 'Square' : 'Hex'} Grid
      </button>
      <div className="zoom-controls">
        <button onClick={onZoomOut}>−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={onZoomIn}>+</button>
      </div>
    </div>
  );
}
