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
      {/* Left sidebar */}
      <div className={`left-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        {/* Put your DM controls, etc. here */}
      </div>

      {/* Main content */}
      <div className="main-content">
        <VirtualTabletop />
      </div>

      {/* Right column */}
      <div className="right-area">
        <ChatBox />
      </div>
    </div>
  );
}
