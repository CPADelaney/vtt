// src/components/Controls.jsx
import React from 'react';

export function Controls({ onZoomIn, onZoomOut }) {
  return (
    <div className="controls">
      {/* Zoom controls only */}
      <div className="zoom-controls">
        <button onClick={onZoomOut}>−</button>
        <button onClick={onZoomIn}>+</button>
      </div>
    </div>
  );
}
