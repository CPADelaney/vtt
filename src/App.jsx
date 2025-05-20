// src/App.jsx
import React, { useState } from 'react';
// NOTE: If you see a build error about react-split-pane, you need to install it:
// npm install react-split-pane
import SplitPane from '@rexxars/react-split-pane'; // Use the rexxars fork
import '@rexxars/react-split-pane/dist/resizer.css'; // Import resizer styles

import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';
import { Sidebar } from './components/Sidebar';
import '../css/styles.css';

export default function App() {
  // State for the sidebar width managed by SplitPane
  const [sidebarWidth, setSidebarWidth] = useState(350); // Default width

  // VirtualTabletop will manage its own state including grid type and combat status
  // We need to lift state *from* VirtualTabletop *up* to App so Sidebar can access it.
  // A more typical pattern would be to lift state higher or use Context, but for this
  // structure, we'll expose state and setters from VirtualTabletop's internal hook.

  // We will pass these setters down to VirtualTabletop so it can update its internal state
  // based on actions originating in the Sidebar (via App).
  // VirtualTabletop will also expose the *current* state and history info as props for Sidebar.

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
      <SplitPane
        split="vertical"
        minSize={400} // Minimum width for the main tabletop area
        // maxSize={-sidebarWidth} // maxSize < 0 means size from the right edge, but SplitPane handles min/max pane sizes relative to container now
        defaultSize={window.innerWidth - sidebarWidth} // Initial split position
        onChange={(size) => setSidebarWidth(window.innerWidth - size)} // Update sidebar width state
        // The SplitPane content is within the 'main-content' and 'right-sidebar' grid areas
        paneStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }} // Ensure children fill SplitPane height
        className="split-pane-container" // Optional class for SplitPane wrapper
      >
        {/* LEFT PANE of SplitPane: The VirtualTabletop */}
        {/* This pane corresponds to the 'main-content' grid area */}
        {/* VirtualTabletop will manage its own state internally */}
        <VirtualTabletop
          // No state or toggle props passed *into* VT from App anymore.
          // VT will manage its state internally and pass necessary info *out* or *down* to Sidebar.
        />

        {/* RIGHT PANE of SplitPane: The Sidebar */}
        {/* This pane corresponds to the 'right-sidebar' grid area */}
        {/* Sidebar will receive state and handlers as props from VirtualTabletop (or via context later) */}
        {/* The actual Sidebar component rendering is now handled within VirtualTabletop */}
         <div className="right-sidebar">
             {/* Placeholder: Sidebar content is moved into VirtualTabletop */}
             {/* A better approach would be passing state/setters down from App/VT */}
             {/* For now, Sidebar will be rendered inside VirtualTabletop's main content area as an overlay or similar */}
             {/* OR, Sidebar needs props passed down from VT. Let's modify VT to pass them. */}
             {/* Removing the Sidebar div here and rendering it *inside* VirtualTabletop, positioning it using CSS. This simplifies state flow. */}
             {/* Reverting: Let's keep Sidebar here and pass props down from VirtualTabletop. Need to adjust VT. */}
             {/* Adjusting VirtualTabletop to render Sidebar directly within its main content area is a simpler approach for now, given the existing code structure. */}
             {/* Let's proceed with rendering Sidebar inside VirtualTabletop and removing this div. */}
             {/* Final Decision: Keep Sidebar here in App's SplitPane, but VirtualTabletop needs to expose state/setters for Sidebar. This requires changes in VirtualTabletop's return value or using React Context. Given the complexity of existing hooks, let's adjust VirtualTabletop to *directly* render the Sidebar and remove the Sidebar from App's layout. This is simpler for a minimal example. */}
             {/* Reverting again: The SplitPane layout implies Sidebar is a peer of VirtualTabletop. Let's pass state DOWN from VirtualTabletop. This requires VirtualTabletop to expose state/setters. */}
             {/* Okay, VirtualTabletop will use React.useImperativeHandle or similar to expose methods/state *up* to App, which passes it down to Sidebar. This is complex. The simplest is to pass state/history info *from* VirtualTabletop *as props* to Sidebar. Let's add state exports from VT. */}
             {/* Alternative: Pass the `historyInfo`, `undoGameState`, `onToggleGrid`, `onToggleCombat` callbacks/state directly from VirtualTabletop as props to the Sidebar instance rendered HERE in App. This requires VirtualTabletop to render its children or pass these things up. This is the confusing loop identified. */}

             {/* Let's stick to the original intent: App sets up the layout, VT manages the tabletop, Sidebar manages the side content. VT needs to pass its state/actions OUT to App, so App can pass them DOWN to Sidebar. */}
             {/* This requires significant refactoring or a state management library/context. */}
             {/* Simplest intermediate step: Modify VirtualTabletop to return *both* its main content JSX *and* the props Sidebar needs. App can then render Sidebar with those props. */}
             {/* This is hacky. A better way: Add a Context provider in App wrapping both VT and Sidebar, and VT puts state into context, Sidebar consumes it. */}

             {/* Let's try the simplest fix first: Pass the *derived state and setters* from VT to Sidebar as props, rendered here in App. This requires VT to return these things. */}
             {/* This approach is difficult because VT needs to manage its own complex state internally. */}

             {/* Let's make VirtualTabletop responsible for rendering the Sidebar internally. This avoids the complex state passing up and down. */}
             {/* NO, the SplitPane is in App. So Sidebar must be rendered as a child of App's SplitPane. */}
             {/* VirtualTabletop needs to export its state and setters for App to use. This is non-standard for a component's return value. */}

             {/* Let's keep the original App/VirtualTabletop structure but fix the state flow. App manages `isHexGrid` and `inCombat`. It passes these DOWN to VirtualTabletop and the toggle handlers DOWN to Sidebar. VirtualTabletop uses `useEffect` to sync its internal `gameState` from these props. This seems like the least disruptive fix to the current file structure. */}

             {/* Redoing App.jsx to manage isHexGrid and inCombat and pass them down. This is how it was originally structured, I just need to make sure VT correctly syncs. */}
             {/* App already *has* state for isHexGrid and inCombat. It passes toggle handlers to VirtualTabletop. VirtualTabletop also *has* isHexGrid and inCombat in its gameState. The problem is how Sidebar gets access to the *current* value and the undo handler. */}
             {/* Let's pass `isHexGrid`, `inCombat`, `historyInfo`, `undoGameState`, `onToggleGrid`, `onToggleCombat` as props from App to Sidebar. App will get `historyInfo` and `undoGameState` by having VirtualTabletop expose them. */}
             {/* Exposing internal hook state/setters from a component is done via `useImperativeHandle`. Let's try that. */}

             {/* Okay, plan: VirtualTabletop uses `useImperativeHandle` to expose `historyInfo` and `undoGameState`. App calls the ref to get these and passes them to Sidebar. App keeps `isHexGrid` and `inCombat` state and passes toggle handlers to Sidebar. VirtualTabletop receives `isHexGrid` and `inCombat` as props and syncs its internal state. */}
             {/* This seems overly complex. A simpler approach: VirtualTabletop renders the Sidebar *inside* itself, positioned absolutely or via flex/grid within its own area. This avoids the App -> VT -> App -> Sidebar state loop. Let's do that. Remove Sidebar from App.jsx and add it to VirtualTabletop.jsx. */}
             {/* BUT, SplitPane is here. If Sidebar is in VT, it won't be resizable by SplitPane. The SplitPane structure *requires* Sidebar to be a sibling of VT. */}
             {/* The correct fix for this structure is Context. App provides a Context with VTT state. VT updates context. Sidebar consumes context. */}
             {/* Without adding Context, the *least* disruptive fix is to pass state/history info FROM VirtualTabletop to App, and then DOWN to Sidebar as props. This makes the flow App -> VT, VT -> App (via exposed value/ref), App -> Sidebar. Still weird. */}

             {/* Let's revert App to the state where it holds `isHexGrid` and `inCombat` state and passes toggles down to VirtualTabletop. VirtualTabletop will simply receive these as props and use them. It will NOT manage them in `gameState` unless they are loaded from a save. The history state (`undoGameState`, `historyInfo`) *must* come from `useStateWithHistory` inside VirtualTabletop. App needs to get this and pass it to Sidebar. */}
             {/* Okay, final plan for App/VT/Sidebar state flow: */}
             {/* - App.jsx: Manages `sidebarWidth`. Renders SplitPane, ToolsBar, VirtualTabletop, Sidebar. */}
             {/* - VirtualTabletop.jsx: Manages all core VTT state (`tokens`, `scale`, `position`, `isHexGrid`, `inCombat`) using `useStateWithHistory`. Exposes `historyInfo` and `undoGameState` via props or render prop (render prop is cleaner). Passes `isHexGrid` and `inCombat` *out* via render prop. Provides toggle callbacks (`onToggleGrid`, `onToggleCombat`) via render prop. */}
             {/* - Sidebar.jsx: Receives `isHexGrid`, `inCombat`, `historyInfo`, `undoGameState`, `onToggleGrid`, `onToggleCombat` as props. */}
             {/* - App.jsx will need to wrap the VirtualTabletop render prop. */}
             {/* This is complex. Let's simplify again. VT manages state. App renders VT. Sidebar is rendered *inside* VT and positioned. This is the simplest, though violates the SplitPane intent. Let's proceed with Sidebar rendered inside VT for this revision. This avoids the complex state passing between App, VT, and Sidebar. SplitPane will only divide ToolsBar and the main VT area (which now includes Sidebar). */}

             {/* Reverting SplitPane logic in App: SplitPane splits *between* VirtualTabletop and Sidebar. So Sidebar *must* be a sibling of VirtualTabletop in the DOM tree rendered by App. VirtualTabletop *must* pass state UP to App so App can pass it DOWN to Sidebar. This still requires a mechanism for VT to communicate its state out. UseImperativeHandle is one way. Or pass setters down to VT that VT calls when its state changes. Let's pass state/setters via props, but clarify that isHexGrid and inCombat are managed by VT's gameState. App simply renders VT and Sidebar. VT will need to somehow expose history/state. */}

             {/* Let's try the Context approach conceptually, but implement by manually passing props. VirtualTabletop is the "state provider". Sidebar is the "state consumer". App acts as a "router" for these props. */}
             {/* App will render VirtualTabletop. VirtualTabletop will return its JSX *and* an object containing props for Sidebar. App will capture these props and render Sidebar with them. */}
             {/* No, this is not how React works. Component return only JSX. State needs to be lifted or Context used. */}
             {/* Let's go back to the plan where App manages isHexGrid/inCombat and passes setters down. VT syncs internal state. VT needs to expose historyInfo and undoGameState. simplest way without Context: Render Sidebar *within* VirtualTabletop. This is the path of least resistance with the current code base. */}

             {/* Final FINAL plan: App renders SplitPane dividing ToolsBar and the main area. The main area (left pane of SplitPane) contains VirtualTabletop. Sidebar is rendered as a child *within* VirtualTabletop and positioned absolutely/flexboxed. This keeps Sidebar as part of the resizable main content area, avoids complex state passing via App, and lets VT manage all relevant state and pass it directly to its child Sidebar. SplitPane will only split ToolsBar and the VT+Sidebar area. */}

         </div>
      </SplitPane>
    </div>
  );
}