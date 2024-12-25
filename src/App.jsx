// src/App.jsx
import React from 'react';
import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';     // We'll create ToolsBar.jsx
import Sidebar from './components/Sidebar';       // or Chat/DM tools
import './styles.css';

export default function App() {
  return (
    <div className="app-layout">
      {/* LEFT COLUMN (tools): 60px wide */}
      <div className="tools-bar">
        <ToolsBar />
      </div>

      {/* MIDDLE COLUMN (game area): flexible */}
      <div className="main-content">
        <VirtualTabletop />
      </div>

      {/* RIGHT COLUMN (chat, DM Tools): 350px wide */}
      <div className="right-sidebar">
        <Sidebar />
      </div>
    </div>
  );
}
