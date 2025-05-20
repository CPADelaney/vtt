// src/App.jsx
import React, { useState } from 'react';
// NOTE: If you see a build error about react-split-pane, you need to install it:
// npm install react-split-pane
import SplitPane from 'react-split-pane';
import 'react-split-pane/style.css';

import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';
import { Sidebar } from './components/Sidebar'; // Use the main Sidebar component
import '../css/styles.css'; // Import the global styles

export default function App() {
  // State for the sidebar width managed by SplitPane
  const [sidebarWidth, setSidebarWidth] = useState(350); // Default width
  // State for the grid type, lifted up to a common ancestor
  const [isHexGrid, setIsHexGrid] = useState(false);
  // State for combat status, lifted up for Sidebar and potentially other components
  const [inCombat, setInCombat] = useState(false);


  // The main grid layout container
  // gridTemplateColumns defines the three columns: tools-bar (fixed), main-content (flexible, takes remaining space), right-sidebar (width controlled by SplitPane)
  const appLayoutStyles = {
    '--tools-bar-width': '60px',
    '--sidebar-width': `${sidebarWidth}px`, // Use state for sidebar width
    display: 'grid',
    // Grid areas defined in styles.css
    gridTemplateColumns: 'var(--tools-bar-width) 1fr var(--sidebar-width)',
    gridTemplateAreas: '"tools-bar main-content right-sidebar"',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  };

  // Callback to toggle grid type, passed down to Sidebar and VirtualTabletop
  const handleToggleGrid = () => {
    setIsHexGrid(prev => !prev);
  };

  // Callback to toggle combat status, passed down to Sidebar
  const handleToggleCombat = () => {
    setInCombat(prev => !prev);
  };

  return (
    <div className="app-layout" style={appLayoutStyles}>
      {/* LEFT COLUMN: Tools Bar */}
      <div className="tools-bar">
        <ToolsBar />
      </div>

      {/* MIDDLE & RIGHT: Handled by SplitPane */}
      {/* SplitPane manages the resizing between the main tabletop area and the sidebar */}
      <SplitPane
        split="vertical"
        minSize={400} // Minimum width for the main tabletop area
        maxSize={-sidebarWidth} // maxSize < 0 means size from the right edge
        defaultSize={window.innerWidth - sidebarWidth} // Initial split position
        onChange={(size) => setSidebarWidth(window.innerWidth - size)} // Update sidebar width state
        // The SplitPane content is within the 'main-content' and 'right-sidebar' grid areas
        paneStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }} // Ensure children fill SplitPane height
        className="split-pane-container" // Optional class for SplitPane wrapper
      >
        {/* LEFT PANE of SplitPane: The VirtualTabletop */}
        {/* This pane corresponds to the 'main-content' grid area */}
        <div className="main-content">
           <VirtualTabletop
            isHexGrid={isHexGrid} // Pass grid state down
            onToggleGrid={handleToggleGrid} // Pass toggle function down (although Sidebar handles button, VT needs it for calculations)
            inCombat={inCombat} // Pass combat state down
            onToggleCombat={handleToggleCombat} // Pass toggle function down
          />
        </div>

        {/* RIGHT PANE of SplitPane: The Sidebar */}
        {/* This pane corresponds to the 'right-sidebar' grid area */}
        <div className="right-sidebar">
          {/* Pass relevant states and callbacks to the Sidebar */}
          <Sidebar
            isHexGrid={isHexGrid}
            onToggleGrid={handleToggleGrid} // Grid toggle button handled by Sidebar
            inCombat={inCombat} // Pass combat state
            onToggleCombat={handleToggleCombat} // Pass combat toggle function
          />
        </div>
      </SplitPane>
    </div>
  );
}