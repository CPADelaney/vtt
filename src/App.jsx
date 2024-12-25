// src/App.jsx

import React, { useState } from 'react';
import VirtualTabletop from './components/VirtualTabletop.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { ChatBox } from './components/ChatBox.jsx';
import './styles.css'; // Where .app-layout, .left-sidebar, etc. are

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      {/* LEFT SIDEBAR */}
      <div className={`left-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>

        {/* Our collapsible DM Sidebar */}
        <Sidebar />
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* This is where your tabletop lives */}
        <VirtualTabletop />

        {/* 
          If you want the ChatBox in the main content area, just place it below.
          For example, pinned at the bottom-right within main-content? 
          Then you might add some absolute styling. 
          Or just display it. 
        */}
        <div style={{ marginTop: '20px' }}>
          <ChatBox />
        </div>
      </div>
    </div>
  );
}
