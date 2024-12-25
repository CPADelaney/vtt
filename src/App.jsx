// src/App.jsx

import React, { useState } from 'react';
import VirtualTabletop from './components/VirtualTabletop';
import Sidebar from './components/Sidebar';   // a separate left sidebar
import ChatBox from './components/ChatBox';   // or a DMTools component
import '../css/styles.css'; // The CSS shown above

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      {/* LEFT SIDEBAR */}
      <div className={`left-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        {/* Render whatever is in Sidebar.jsx */}
        <Sidebar />
      </div>

      {/* MAIN CONTENT (middle) */}
      <div className="main-content">
        <VirtualTabletop />
      </div>

      {/* RIGHT AREA (for chat, DM Tools, etc.) */}
      <div className="right-area">
        <ChatBox />
        {/* or <DMTools /> or both */}
      </div>
    </div>
  );
}
