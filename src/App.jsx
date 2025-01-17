// src/App.jsx
import React, {useState} from 'react';
import VirtualTabletop from './components/VirtualTabletop';
import ToolsBar from './components/ToolsBar';
import '../css/styles.css';

export default function App() {
  return (
    <div className="app-layout">
      <div className="tools-bar">
        <ToolsBar />
      </div>
      <div className="main-content">
        <VirtualTabletop />
      </div>
      <div className="right-sidebar">
        {/* If you want chat or other stuff here, great, but no <Sidebar> duplication */}
      </div>
    </div>
  );
}
