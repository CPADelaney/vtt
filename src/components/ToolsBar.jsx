// src/components/ToolsBar.jsx
import React from 'react';
import { MousePointer, Edit3, Map, Trash2 } from 'lucide-react'; // Example icons

export default function ToolsBar() {
  return (
    <div>
      {/* Example icon buttons */}
      <button className="tool-icon" title="Select">
        <MousePointer size={20} />
      </button>
      <button className="tool-icon" title="Draw">
        <Edit3 size={20} />
      </button>
      <button className="tool-icon" title="Map Layer">
        <Map size={20} />
      </button>
      <button className="tool-icon" title="Delete">
        <Trash2 size={20} />
      </button>
      {/* ... add more icons as needed ... */}
    </div>
  );
}
