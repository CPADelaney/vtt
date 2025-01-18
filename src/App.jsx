// src/App.jsx
import React, { useState } from 'react';
import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';
import { Sidebar } from './components/Sidebar';
import { ChatBox } from './components/ChatBox';
import '../css/styles.css';

export default function App() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: '60px 1fr 350px',
      }}
    >
      {/* LEFT COLUMN (tools): 60px wide */}
      <div style={{ borderRight: '1px solid #ccc' }}>
        <ToolsBar />
      </div>

      {/* Middle => VirtualTabletop (with its own SplitPane inside) */}
      <div>
        <VirtualTabletop />
      </div>
      
      {/* Right => Some separate panel, e.g. Chat */}
      <div style={{ borderLeft: '1px solid #ccc' }}>
        <ChatBox />
      </div>
    </div>
  );
}
