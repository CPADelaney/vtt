// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useEffect, useRef, useCallback for potential future use or clarification of existing use in comments
// NOTE: If you see a build error about react-split-pane, you need to install it:
// npm install @rexxars/react-split-pane
// import SplitPane from '@rexxars/react-split-pane'; // Use the rexxars fork - ORIGINAL LINE CAUSING ERROR
import { SplitPane } from '@rexxars/react-split-pane'; // Corrected: Use named import for SplitPane
// REMOVED: import '@rexxars/react-split-pane/dist/resizer.css'; // This import causes build error

import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';
// import { Sidebar } from './components/Sidebar'; // Sidebar import removed based on VT rendering it internally plan (as noted in original code comments)
import '../css/styles.css'; // This file already contains the necessary resizer styles

// Fix: Import Sidebar at the top level, outside the component function
import { Sidebar } from './components/Sidebar'; // Re-adding Sidebar import here


export default function App() {
  // State for the sidebar width managed by SplitPane
  // This state might become less relevant if Sidebar is rendered *inside* VirtualTabletop
  // as contemplated in the original file comments, but keeping it for now assuming the SplitPane still divides *something* to the right of VT.
  // Let's assume SplitPane now divides ToolsBar from the main area, and the main area contains VT and an internal Sidebar.
  // This means the right pane of SplitPane *is* the VirtualTabletop wrapper area.
  // The original App.jsx comments were inconsistent about where Sidebar is rendered relative to SplitPane.
  // Reverting to the structure implied by the original SplitPane definition: App renders SplitPane, SplitPane's panes are VT and Sidebar.
  // This requires VT to pass state up or use Context, which is noted as a future improvement.
  // For THIS fix (addressing the import error), we assume App's SplitPane *does* render VirtualTabletop and Sidebar as siblings.
  // The Sidebar *component* is imported above. The state passing issue is separate from the import error fix.


  const [sidebarWidth, setSidebarWidth] = useState(350); // Default width

  // VirtualTabletop will manage its own state including grid type and combat status
  // We need to lift state *from* VirtualTabletop *up* to App so Sidebar can access it.
  // A more typical pattern would be to lift state higher or use Context, but for this
  // structure, we'll expose state and setters from VirtualTabletop's internal hook.

  // We will pass these setters down to VirtualTabletop so it can update its internal state
  // based on actions originating in the Sidebar (via App).
  // VirtualTabletop will also expose the *current* state and history info as props for Sidebar.

  // --- State & Callbacks lifted/passed down for Sidebar (Conceptual - requires VT changes) ---
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
    <div className="app-layout" style={{
      '--tools-bar-width': '60px',
      '--sidebar-width': `${sidebarWidth}px`,
      display: 'grid',
      gridTemplateColumns: 'var(--tools-bar-width) 1fr var(--sidebar-width)',
      gridTemplateAreas: '"tools-bar main-content right-sidebar"',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* LEFT COLUMN: Tools Bar */}
      <div className="tools-bar">
        <ToolsBar />
      </div>

      {/* MIDDLE & RIGHT: Handled by SplitPane */}
      {/* The SplitPane now needs to wrap the main content area and the sidebar area */}
      {/* The SplitPane content corresponds to the 'main-content' and 'right-sidebar' grid areas */}
      {/* We need to ensure the panes themselves align with the grid areas conceptually. */}
      {/* SplitPane manages the flex/width, but the *content* divs should be assigned to grid areas. */}
      {/* Let's remove paneStyle and className from SplitPane itself and apply grid-area to its children. */}
      {/* This requires SplitPane to render its children directly without wrapping divs, or SplitPane itself needs to be styled with the grid areas. */}
      {/* The original code had the SplitPane *inside* the `main-content` div, which breaks the grid layout. */}
      {/* Correct approach: SplitPane is a direct child of `.app-layout` and its panes are styled to occupy `main-content` and `right-sidebar` areas. */}
      {/* This requires changing the CSS Grid definition or how SplitPane applies styles. */}
      {/* A common pattern is: outer grid defines static areas (like toolbar), and ONE grid area is then managed by SplitPane (e.g., splitting main content and a sidebar *within that single grid cell*). */}
      {/* The original code's `className="split-pane-container"` and `paneStyle` suggests an attempt to apply styles, but the comments about grid areas conflict with putting SplitPane *inside* a grid area div. */}
      {/* The most plausible interpretation of the original SplitPane usage with two panes is that App's layout should NOT use a 3-column grid with fixed areas for main-content/right-sidebar managed by grid-area. Instead, the ToolsBar gets its grid area, and the *remaining space* is managed by SplitPane, which then contains VirtualTabletop in one pane and Sidebar in the other. */}
      {/* Reverting to a simplified grid structure in App: tools-bar (fixed) | split-pane-area (flexible). */}
      {/* The split-pane-area will be managed by SplitPane, containing VT and Sidebar. */}

       {/* Reverting to a layout closer to the original intent implied by SplitPane having two children, but applying grid areas to the *children* of SplitPane (or wrappers). */}
       {/* This still feels like conflicting layout strategies. A simpler pattern is to let SplitPane manage the entire area next to the toolbar. */}
       {/* Let's use a layout where the toolbar is in a grid area, and the SplitPane occupies the remaining space (`1fr`) and *then* splits its children (VT and Sidebar) using flexbox/width it controls. */}

       {/* Updated layout structure: */}
       {/* .app-layout (display: grid, grid-template-columns: toolbar-width 1fr) */}
       {/*   .tools-bar (grid-area: ...) */}
       {/*   .split-container (occupies 1fr, display: flex, flex-direction: row) - this container holds SplitPane */}
       {/*      SplitPane (split="vertical") */}
       {/*          VirtualTabletop (flex-grow: 1, flex-shrink: 0, flex-basis: auto, width controlled by SplitPane) */}
       {/*          Sidebar (flex-grow: 0, flex-shrink: 0, flex-basis: auto, width controlled by SplitPane) */}


       {/* This means the outer grid defines only two areas: toolbar and a flexible main area. */}
       {/* The flexible main area will contain the SplitPane. */}


        {/* MAIN CONTENT & SIDEBAR AREA (flexible width) - MANAGED BY SPLITPANE */}
        {/* This div occupies the remaining 1fr grid space and contains the SplitPane */}
        {/* We will use grid-column: 2 / -1 to span the remaining two conceptual columns */}
        <div style={{ gridColumn: '2 / -1', display: 'flex', height: '100%' }}>
            {/* SplitPane manages the division between the main tabletop and the sidebar within this flex container */}
            <SplitPane
              split="vertical"
              minSize={400} // Minimum width for the main tabletop area pane
              // maxSize={-sidebarWidth} // SplitPane manages this relative to parent container size now
              // defaultSize={window.innerWidth - sidebarWidth} // Initial split position relative to SplitPane container
              // Let SplitPane calculate initial size relative to its container (this flex div)
              defaultSize={'70%'} // Example: 70% for VT, 30% for Sidebar initially
              onChange={(size) => {
                   // The size here is the size of the *first* pane (VirtualTabletop).
                   // Calculate the sidebar width based on the SplitPane container's width.
                   // SplitPane applies styles directly to its internal pane divs and children by default. We need the width of the SplitPane element itself.
                   // SplitPane is within the flex div styled with gridArea.
                   // Use a ref for the SplitPane container div to get its width reliably
                   const splitContainer = document.querySelector('.app-layout > div:nth-child(2)'); // Assuming the second child is the split container
                   if (splitContainer) {
                       const containerWidth = splitContainer.offsetWidth;
                       setSidebarWidth(containerWidth - size);
                   } else {
                       // Fallback: if split container not found, estimate based on window
                        console.warn("SplitPane container not found, estimating sidebar width based on window size.");
                        setSidebarWidth(window.innerWidth - 60 - size); // Subtract estimated toolbar width
                   }
              }}
               // SplitPane applies flexbox styles to its internal pane divs and children by default
               className="split-pane-container" // Use this class for SplitPane wrapper if needed
            >
              {/* LEFT PANE: The VirtualTabletop */}
              {/* VirtualTabletop needs to receive state/callbacks for Sidebar */}
              {/* For *this* specific fix (import error), VirtualTabletop remains standalone, managing its state internally. */}
              {/* It cannot pass state up to App to be passed down to Sidebar without significant refactoring (Context API, render prop, etc.). */}
              {/* This is a known limitation resulting from prioritizing the build error fix over larger architectural changes. */}
              {/* The Sidebar will be rendered but non-functional regarding VT state interaction (inCombat, history, undo, toggle grid/combat). */}
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

              {/* RIGHT PANE: The Sidebar */}
              {/* Sidebar needs props from VirtualTabletop's state. App needs to retrieve these and pass them down. */}
              {/* For this specific fix (import error), Sidebar will be rendered but non-functional regarding VT state interaction. */}
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
            </SplitPane>
        </div>
         {/* The right-sidebar grid area definition is conceptually covered by the split container spanning columns 2 and 3 */}

      </div>
    );
  }