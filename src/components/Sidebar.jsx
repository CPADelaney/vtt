// src/components/Sidebar.jsx

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Swords } from 'lucide-react';

export const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [inCombat, setInCombat] = useState(false);

  return (
    <div
      className={`shadow-lg bg-white transition-all duration-300 flex ${
        isExpanded ? 'w-64' : 'w-12'
      }`}
      style={{ borderBottom: '1px solid #ccc' }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ background: 'white', border: '1px solid #ccc' }}
      >
        {isExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <div className="flex flex-col w-full">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg flex items-center">
            <Swords size={20} className="mr-2" />
            DM Controls
          </h2>
        </div>

        <div className="p-4 space-y-4">
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
        </div>
      </div>
    </div>
  );
};
