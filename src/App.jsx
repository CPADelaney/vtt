// src/App.jsx
import React from 'react';
import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';     // We'll create ToolsBar.jsx
import { Sidebar } from './components/Sidebar';
import  { ChatBox }  from './components/ChatBox';
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

      {/* MIDDLE COLUMN (game area): flexible */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <VirtualTabletop />
      </div>

      {/* RIGHT COLUMN (chat, DM Tools): 350px wide */}
      <div style={{ borderLeft: '1px solid #ccc' }}>
        <Sidebar 
        isHexGrid={isHexGrid}
        onToggleGrid={onToggleGrid}
        />
        <ChatBox />        
      </div>
    </div>
  );
}
