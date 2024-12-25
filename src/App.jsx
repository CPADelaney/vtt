// App.jsx
import React, { useState } from 'react';
import VirtualTabletop from './components/VirtualTabletop.jsx';
import '../css/styles.css'; // Where your .app-layout, .left-sidebar, etc., live

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      {/* LEFT SIDEBAR */}
      <div className={`left-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        {/* Sidebar content (DM controls, tabs, chat, etc.) */}
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* This is where your tabletop lives */}
        <VirtualTabletop />
      </div>
    </div>
  );
}
