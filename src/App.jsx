// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useEffect, useRef, useCallback for potential future use or clarification of existing use in comments
// NOTE: If you see a build error about react-split-pane, you need to install it:
// npm install @rexxars/react-split-pane
import { SplitPane } from '@rexxars/react-split-pane'; // Corrected: Use named import for SplitPane
// REMOVED: import '@rexxars/react-split-pane/dist/resizer.css'; // This import causes build error - relying on local CSS

import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';
// Fix: Import Sidebar at the top level, outside the component function
import { Sidebar } from './components/Sidebar'; // Re-adding Sidebar import here
import '../css/styles.css'; // This file already contains the necessary resizer styles and overall layout


export default function App() {
  // State for the sidebar width managed by SplitPane
  const [sidebarWidth, setSidebarWidth] = useState(350); // Default width

  // State & Callbacks lifted/passed down for Sidebar (Conceptual - requires VT changes)
  // This section highlights the state flow issue. For this fix, we *don't* implement the state lifting/passing.
  // App will render VT and Sidebar as siblings in the SplitPane, but Sidebar will initially lack the necessary state props from VT.
  // This is a known limitation based on prioritizing the *import error* fix.
  // The comments in the original file were contemplating moving Sidebar inside VT, which would simplify state flow but break the SplitPane structure in App.jsx.
  // Let's stick to the SplitPane structure in App.jsx as written, and accept that Sidebar won't get state from VT *until* refactoring.
  // The import error fix allows the app to *build* and *run*, even if Sidebar is non-functional due to missing props.

  // Placeholder for state/callbacks that *should* be managed higher or exposed by VT:
  // const [isHexGrid, setIsHexGrid] = useState(false); // Example if state was lifted
  // const [inCombat, setInCombat] = useState(false);   // Example if state was lifted
  // const virtualTabletopRef = useRef(null); // Ref to access VT's exposed functions/state

  // const handleToggleGrid = useCallback(() => { /* ... call VT's toggle ... */ }, []);
  // const handleToggleCombat = useCallback(() => { /* ... call VT's toggle ... */ }, []);
  // const handleUndo = useCallback(() => { /* ... call VT's undo ... */ }, []);
  // const historyInfo = {/* ... get from VT ... */};


  return (
    <div className="app-layout"> {/* CSS Grid layout defined here */}
      {/* LEFT COLUMN: Tools Bar */}
      <div className="tools-bar"> {/* Grid area assigned in CSS */}
        <ToolsBar />
      </div>

      {/* MAIN CONTENT & SIDEBAR AREA (flexible width) - MANAGED BY SPLITPANE */}
      {/* This div occupies the 'main-and-sidebar' grid area and contains the SplitPane */}
      <div className="split-pane-area"> {/* Grid area assigned in CSS */}
          {/* SplitPane manages the division between the main tabletop and the sidebar within this flexible area */}
          <SplitPane
            split="vertical"
            minSize={400} // Minimum width for the main tabletop area pane
            // Let SplitPane calculate initial size relative to its container (this flex div)
            defaultSize={'70%'} // Example: 70% for VT, 30% for Sidebar initially
            onChange={(size) => {
                 // The size here is the size of the *first* pane (VirtualTabletop).
                 // We need to know the total width of the SplitPane container to calculate the sidebar width.
                 // SplitPane applies styles directly to its internal pane divs.
                 // Let's get the width of the split-pane-area div.
                 const splitContainer = document.querySelector('.split-pane-area');
                 if (splitContainer) {
                     const containerWidth = splitContainer.offsetWidth;
                     // Ensure containerWidth is valid before calculating
                     if (containerWidth > 0) {
                         setSidebarWidth(containerWidth - size);
                         // console.log('[DEBUG] Sidebar width updated:', containerWidth - size);
                     } else {
                          console.warn('[DEBUG] SplitPane container has zero width, cannot calculate sidebar width.');
                     }
                 } else {
                      console.warn('[DEBUG] SplitPane container (.split-pane-area) not found.');
                      // Fallback or default width might be needed
                 }
            }}
             // SplitPane applies flexbox styles to its internal pane divs and children by default
             // className="split-pane-container" // Class applied to SplitPane wrapper itself if needed
          >
            {/* LEFT PANE: The VirtualTabletop */}
            {/* Apply .main-content class for general styling not related to grid area */}
            {/* VirtualTabletop needs to receive state/callbacks for Sidebar - currently placeholders */}
            {/* For *this* specific fix (import error), VirtualTabletop remains standalone, managing its state internally. */}
            {/* It cannot pass state up to App to be passed down to Sidebar without significant refactoring (Context API, render prop, etc.). */}
            {/* This is a known limitation resulting from prioritizing the build error fix over larger architectural changes. */}
            {/* The Sidebar will be rendered but non-functional regarding VT state interaction (inCombat, history, undo, toggle grid/combat). */}
            <div className="main-content"> {/* Apply general styling class */}
                <VirtualTabletop
                   // isHexGrid etc props removed from VT in a previous iteration - need to confirm if VT expects them now or manages internally.
                   // The current VT code review shows it manages `isHexGrid` and `inCombat` internally via `useStateWithHistory`.
                   // It also defines `onToggleGrid` and `onToggleCombat` internally that update its `gameState`.
                   // It also gets `undoGameState` and `historyInfo` from `useStateWithHistory`.
                   // So, VT *does* have the state and callbacks needed by Sidebar.
                   // The issue is App needs to get these *from* VT to pass to Sidebar.
                   // This implies VT needs to expose them. UseImperativeHandle or a render prop is one way.
                   // Let's add a ref to VT to potentially access its state/methods later if needed, but don't rely on it for Sidebar props *yet*.
                   // Let's assume Sidebar *will* receive props, even if App isn't providing them correctly in this version.
                />
            </div>


            {/* RIGHT PANE: The Sidebar */}
            {/* Apply .right-sidebar class for general styling not related to grid area */}
            {/* Sidebar needs props from VirtualTabletop's state. App needs to retrieve these and pass them down. */}
            {/* For this specific fix (import error), Sidebar will be rendered but non-functional regarding VT state interaction. */}
             <div className="right-sidebar"> {/* Apply general styling class */}
                <Sidebar
                    // Placeholder props - these need to be populated by state from VirtualTabletop
                    // Passing dummy/default values for now to allow the Sidebar component to render without prop errors,
                    // assuming its rendering logic doesn't immediately fail on `undefined` for complex props.
                    // The Sidebar component provided in the code bundle *does* expect these props,
                    // and uses them (e.g., `onClick={onToggleCombat}`, `disabled={!historyInfo?.canUndo}`).
                    // With placeholder values, the Sidebar component *will* render, but its interactive elements
                    // tied to these props (buttons, displaying combat status/history) will likely be disabled or non-functional.
                    isHexGrid={false} // Placeholder
                    onToggleGrid={() => console.warn("onToggleGrid not connected")} // Placeholder
                    inCombat={false} // Placeholder
                    onToggleCombat={() => console.warn("onToggleCombat not connected")} // Placeholder
                    undoGameState={() => console.warn("undoGameState not connected")} // Placeholder
                    historyInfo={{ history: [], currentIndex: 0, canUndo: false, canRedo: false }} // Placeholder object matching structure
                 />
              </div>

          </SplitPane>
      </div>
       {/* The right-sidebar grid area definition is conceptually covered by the split container spanning columns 2 and 3 */}

    </div>
  );
}