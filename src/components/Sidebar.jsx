//src/components/Sidebar.jsx

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Swords } from 'lucide-react';

export default function Sidebar({ isHexGrid, onToggleGrid }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [inCombat, setInCombat] = useState(false);

  const handleGridToggle = (e) => {
    // Stop event bubbling just in case
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[DEBUG] Grid toggle button clicked');
    console.log('[DEBUG] Current isHexGrid:', isHexGrid);
    console.log('[DEBUG] onToggleGrid function:', onToggleGrid);
    
    onToggleGrid();
  };
     
  return (
    <div
      className={`shadow-lg bg-white transition-all duration-300 flex ${
        isExpanded ? 'w-64' : 'w-12'
      }`}
      style={{ borderBottom: '1px solid #ccc' }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          background: 'white', 
          border: '1px solid #ccc', 
          margin: '8px',
          cursor: 'pointer',
          alignSelf: 'flex-start' 
        }}
      >
        {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* DM Tools Content */}
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg flex items-center">
            <Swords size={20} className="mr-2" />
            DM Controls
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Combat Toggle */}
          <button
            onClick={() => setInCombat(!inCombat)}
            className={`w-full font-bold py-2 px-4 rounded transition-colors ${
              inCombat
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {inCombat ? 'End Combat' : 'Start Combat'}
          </button>
          
          {/* Grid Toggle */}
          <button
            onClick={handleGridToggle}
            className="w-full font-bold py-2 px-4 rounded transition-colors bg-gray-300 hover:bg-gray-400 text-black"
            style={{ position: 'relative', zIndex: 10 }} // Try adding this
          >
            {isHexGrid ? 'Switch to Square Grid' : 'Switch to Hex Grid'}
          </button>
        </div>
      </div>
    </div>
  );
};
